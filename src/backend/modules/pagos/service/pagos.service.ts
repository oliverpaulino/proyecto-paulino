import {
   CreatePagoDTO,
   DeletePagoDTO,
   InfoDestinoPago,
   Pago,
   PagoProps,
   IPagoRepository,
   UpdatePagoDTO,
} from "../domain/pagos.domain";

export class PagoService {
   constructor(private readonly repo: IPagoRepository) { }

   private validarExclusividad(data: Partial<CreatePagoDTO>) {
      const count = [data.gasto_empresa_id, data.deduccion_empleado_id, data.conduce_id, data.proyecto_id, data.orden_compra_id].filter(Boolean).length;
      if (count !== 1) {
         throw new Error("El pago debe estar asociado a exactamente un origen (Gasto, Costo, Deducción, Conduce, Proyecto u Orden de Compra).");
      }
   }

   private readonly ESTADOS_PAGABLES = ["APROBADA", "RECIBIDA"];

   private mismoDestino(
      a: Partial<CreatePagoDTO>,
      b: Partial<CreatePagoDTO>
   ): boolean {
      const idA = a.gasto_empresa_id ?? a.deduccion_empleado_id ?? a.conduce_id ?? a.proyecto_id ?? a.orden_compra_id;
      const idB = b.gasto_empresa_id ?? b.deduccion_empleado_id ?? b.conduce_id ?? b.proyecto_id ?? b.orden_compra_id;
      return !!idA && idA === idB;
   }

   /**
    * Validación polimórfica del destino: según el tipo decide qué reglas
    * aplicar (tipo de movimiento permitido, cobrabilidad, tope de saldo).
    * Los topes vienen de `InfoDestinoPago.aceptaPago*` (null = sin tope).
    */
   private async validarPolimorfico(
      data: { destino: Partial<CreatePagoDTO>; tipo_movimiento: string; monto_pagado: number },
      current?: Pago | null
   ) {
      // Extraer solo los IDs de destino (no fecha ni otros campos)
      const { fecha: _fecha, ...destinoIds } = data.destino;
      const info = await this.repo.getInfoDestino(destinoIds);
      if (!info) throw new Error("El destino del pago no existe o está anulado.");

      const esEntrada = data.tipo_movimiento === "ENTRADA";

      // Reglas de tipo de movimiento por destino
      if (info.tipo === "ORDEN_COMPRA" && !esEntrada) {
         throw new Error("Las órdenes de compra solo aceptan pagos de salida (la empresa paga al proveedor).");
      }
      if (info.tipo === "DEDUCCION" && !esEntrada) {
         throw new Error("Las deducciones solo aceptan pagos de entrada (el empleado amortiza su deuda).");
      }
      if (info.tipo === "CONDUCE" && !esEntrada) {
         throw new Error("Los conduces solo aceptan pagos de entrada (el cliente paga).");
      }
      if (info.tipo === "ORDEN_COMPRA" && !this.ESTADOS_PAGABLES.includes(info.estado ?? "")) {
         throw new Error(
            `No se pueden realizar pagos a órdenes de compra en estado ${info.estado}; solo aprobadas o recibidas.`
         );
      }
      if (info.tipo === "GASTO" && esEntrada && !info.cobrableProyecto) {
         throw new Error("No se pueden registrar pagos de entrada a un gasto que no es cobrable al cliente.");
      }
      if (info.tipo === "GASTO" && !esEntrada && info.aceptaPagoSalida === 0) {
         throw new Error("Este gasto está asociado a una orden de compra: los pagos se registran contra la orden, no contra el gasto.");
      }

      // El tope lo define el destino: null = sin tope (entradas a proyecto).
      let tope = esEntrada ? info.aceptaPagoEntrada : info.aceptaPagoSalida;

      // Al editar, el saldo calculado ya incluye el propio pago: se devuelve
      // para permitir ajustarlo sin penalizar.
      if (current && this.mismoDestino(data.destino, current)) {
         tope = tope === null ? null : tope + current.monto_pagado;
      }

      if (tope !== null && data.monto_pagado > tope + 0.01) {
         throw new Error(
            `El monto excede el saldo disponible del destino (disponible: RD$ ${Math.max(0, tope).toFixed(2)}).`
         );
      }
   }

   /** Balance polimórfico del destino de un pago (sección informativa del form). */
   async getInfoDestino(params: {
      gasto_empresa_id?: string | null;
      deduccion_empleado_id?: string | null;
      conduce_id?: string | null;
      proyecto_id?: string | null;
      orden_compra_id?: string | null;
   }): Promise<InfoDestinoPago | null> {
      return this.repo.getInfoDestino(params);
   }

   async getAll(params?: any): Promise<PagoProps[]> {
      const items = await this.repo.findAll(params);
      return items.map((c) => c.toJSON());
   }

   async getAllDeleted(params?: any): Promise<PagoProps[]> {
      const items = await this.repo.findAllDeleted(params);
      return items.map((c) => c.toJSON());
   }

   async getById(id: string): Promise<PagoProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }
   
   async getDeletedById(id: string): Promise<PagoProps | null> {
      const item = await this.repo.findDeletedById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreatePagoDTO): Promise<PagoProps> {
      if (data.monto_pagado <= 0) throw new Error("El monto pagado debe ser mayor a 0");
      this.validarExclusividad(data);

      await this.validarPolimorfico({
         destino: data,
         tipo_movimiento: data.tipo_movimiento,
         monto_pagado: data.monto_pagado,
      });

      const item = await this.repo.create(data);
      return item.toJSON();
   }

   async update(id: string, data: UpdatePagoDTO): Promise<PagoProps | null> {
      if (data.monto_pagado !== undefined && data.monto_pagado <= 0) {
         throw new Error("El monto pagado debe ser mayor a 0");
      }
      
      const current = await this.repo.findById(id);
      if (!current) throw new Error("Pago no encontrado");

      const mergeData = {
         gasto_empresa_id: data.gasto_empresa_id !== undefined ? data.gasto_empresa_id : current.gasto_empresa_id,
         deduccion_empleado_id: data.deduccion_empleado_id !== undefined ? data.deduccion_empleado_id : current.deduccion_empleado_id,
         conduce_id: data.conduce_id !== undefined ? data.conduce_id : current.conduce_id,
         proyecto_id: data.proyecto_id !== undefined ? data.proyecto_id : current.proyecto_id,
         orden_compra_id: data.orden_compra_id !== undefined ? data.orden_compra_id : current.orden_compra_id,
      };

      this.validarExclusividad(mergeData);

      await this.validarPolimorfico(
         {
            destino: mergeData,
            tipo_movimiento: data.tipo_movimiento ?? current.tipo_movimiento,
            monto_pagado: data.monto_pagado ?? current.monto_pagado,
         },
         current
      );

      const item = await this.repo.update(id, data);
      return item ? item.toJSON() : null;
   }

   async delete(id: string, data: DeletePagoDTO): Promise<boolean> {
      if (!data.deleted_reason?.trim()) {
         throw new Error("Debe proporcionar un motivo de anulación");
      }
      return this.repo.delete(id, data);
   }

   async restore(id: string): Promise<PagoProps | null>{
      if (!id) {
         throw new Error("Debe proporcionar el id para restaurar el pago");
      }
      return this.repo.restore(id);
   }
}