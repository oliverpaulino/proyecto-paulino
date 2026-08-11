import type {
   ICuentasPorCobrarRepository,
   CuentasPorCobrarFiltros,
   CuentasPorCobrarResult,
   DetalleClienteCuentasPorCobrar,
   FolioProyectoCxc,
   RegistrarPagoCxcDTO,
   PagoCxc,
   TipoCuentaCxc,
} from "../domain/cuentas-por-cobrar.domain";

interface ItemCobrable {
   destino_id: string;
   tipo: TipoCuentaCxc;
   referencia: string;
   fecha: Date;
   pendiente: number;
}

export class CuentasPorCobrarService {
   constructor(private readonly repo: ICuentasPorCobrarRepository) {}

   async listar(filtros: CuentasPorCobrarFiltros): Promise<CuentasPorCobrarResult> {
      return this.repo.listar(filtros);
   }

   async detalleCliente(clienteId: string, filtros: CuentasPorCobrarFiltros): Promise<DetalleClienteCuentasPorCobrar> {
      if (!clienteId) throw new Error("cliente_id es requerido");
      return this.repo.detalleCliente(clienteId, filtros);
   }

   async proyectoDetalle(proyectoId: string): Promise<FolioProyectoCxc> {
      if (!proyectoId) throw new Error("proyecto_id es requerido");
      return this.repo.folioProyecto(proyectoId);
   }

   /**
    * Pago rápido de cuentas por cobrar.
    *
    * Las unidades cobrables son los CONDUCES pendientes de cada folio y el
    * bloque de tarifa + cargos de cada folio de proyecto (un pago ligado a
    * `pago.proyecto_id`). Sin distribución explícita, el monto se reparte en
    * FIFO (lo más antiguo primero) entre esas unidades; cada una genera su
    * propio `pago` apuntando a su conduce o a su proyecto.
    */
   async registrarPago(dto: RegistrarPagoCxcDTO): Promise<PagoCxc[]> {
      if (!dto.cliente_id) throw new Error("cliente_id es requerido");
      if (!dto.monto || dto.monto <= 0) throw new Error("El monto debe ser mayor a 0");
      if (!dto.metodo_pago) throw new Error("El método de pago es requerido");

      const folios = await this.repo.listarPendientesCliente(dto.cliente_id);
      if (folios.length === 0) {
         throw new Error("El cliente no tiene cuentas pendientes de cobro");
      }

      const clienteNombre = folios[0].cliente_nombre ?? "Cliente";

      // Cada conduce pendiente es una unidad; cada folio de proyecto aporta
      // además el bloque de tarifa + cargos (pagado vía pago.proyecto_id).
      const todos: ItemCobrable[] = [];
      for (const f of folios) {
         for (const cc of f.conduces) {
            if (cc.pendiente > 0.01) {
               todos.push({
                  destino_id: cc.id,
                  tipo: "CONDUCE",
                  referencia: cc.numero_referencia,
                  fecha: cc.fecha,
                  pendiente: cc.pendiente,
               });
            }
         }
         if (f.pendiente_tarifa_cargos > 0.01) {
            todos.push({
               destino_id: f.id,
               tipo: "PROYECTO",
               referencia: f.numero_referencia,
               fecha: f.fecha,
               pendiente: f.pendiente_tarifa_cargos,
            });
         }
      }
      todos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.referencia.localeCompare(b.referencia));

      // ── Acotar con conduce_ids / proyecto_ids (si llegan) ────────────────
      let items = todos;
      if (dto.conduce_ids?.length) {
         items = items.filter((i) => i.tipo === "CONDUCE" && dto.conduce_ids!.includes(i.destino_id));
      }
      if (dto.proyecto_ids?.length) {
         items = items.filter((i) => i.tipo === "PROYECTO" && dto.proyecto_ids!.includes(i.destino_id));
      }
      if (items.length === 0) {
         throw new Error("Los folios seleccionados ya están saldados o no pertenecen al cliente");
      }

      const asignaciones: Array<{ destino_id: string; tipo: TipoCuentaCxc; monto: number }> = [];

      if (dto.pagos && dto.pagos.length > 0) {
         // Distribución explícita: cada unidad recibe exactamente el monto pedido.
         const porClave = new Map(items.map((i) => [`${i.tipo}:${i.destino_id}`, i]));
         for (const p of dto.pagos) {
            if (!p.monto || p.monto <= 0) throw new Error("Cada pago debe tener un monto mayor a 0");
            const item = porClave.get(`${p.tipo}:${p.destino_id}`);
            if (!item) {
               throw new Error("Uno de los destinos seleccionados no pertenece al cliente o ya está saldado");
            }
            if (p.monto > item.pendiente + 0.01) {
               throw new Error(
                  `El monto de ${item.referencia} excede su saldo (RD$ ${item.pendiente.toFixed(2)})`
               );
            }
            asignaciones.push({ destino_id: p.destino_id, tipo: p.tipo, monto: p.monto });
         }
      } else {
         // FIFO: se llena lo más antiguo primero y así sucesivamente.
         let restante = dto.monto;
         const pendienteTotal = items.reduce((acc, i) => acc + i.pendiente, 0);
         if (dto.monto > pendienteTotal + 0.01) {
            throw new Error(
               `El monto (RD$ ${dto.monto.toFixed(2)}) excede el saldo pendiente del cliente (RD$ ${pendienteTotal.toFixed(2)})`
            );
         }
         for (const item of items) {
            if (restante <= 0.001) break;
            const aAplicar = Math.min(restante, item.pendiente);
            if (aAplicar > 0.001) {
               asignaciones.push({
                  destino_id: item.destino_id,
                  tipo: item.tipo,
                  monto: Math.round(aAplicar * 100) / 100,
               });
               restante -= aAplicar;
            }
         }
      }

      if (asignaciones.length === 0) {
         throw new Error("No hay montos que aplicar");
      }

      const fecha = dto.fecha ?? new Date();
      const baseConcepto =
         dto.concepto?.trim() ??
         `Pago de ${clienteNombre} (${asignaciones.length} ${asignaciones.length === 1 ? "cuenta" : "cuentas"})`;

      const refPorClave = new Map(items.map((i) => [`${i.tipo}:${i.destino_id}`, i.referencia]));

      return this.repo.crearPagos(
         asignaciones.map((a) => ({
            destino_id: a.destino_id,
            tipo: a.tipo,
            monto_pagado: a.monto,
            metodo_pago: dto.metodo_pago,
            fecha,
            concepto: `${baseConcepto} · Folio ${refPorClave.get(`${a.tipo}:${a.destino_id}`) ?? a.destino_id}`,
         }))
      );
   }
}
