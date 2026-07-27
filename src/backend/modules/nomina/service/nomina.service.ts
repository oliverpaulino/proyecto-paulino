import type {
   INominaRepository,
   CreateCycleDTO,
   UpdateCycleDTO,
   PayrollCycleProps,
   PayrollCycleEmployeeProps,
   TarifaDesglose,
   FrecuenciaPago,
} from "../domain/nomina.domain";
import {
   FRECUENCIAS_PAGO,
   calcularComplemento,
   calcularNeto,
   cicloEsEditable,
   salarioDelPeriodo,
} from "../domain/nomina.domain";

export interface ResultadoCalculo {
   cycle_id: string;
   empleados_procesados: number;
   /** Choferes que cobran por conduces. */
   choferes: number;
   /** Personal que cobra salario fijo. */
   asalariados: number;
   total_neto: number;
   /** Empleados con al menos un conduce atribuido por inferencia. */
   empleados_con_inferencia: number;
   /** Conduces del período cuya tarifa no está asignada al chofer. */
   conduces_sin_tarifa: number;
}

export class NominaService {
   constructor(private readonly repo: INominaRepository) {}

   // ── Ciclos ───────────────────────────────────────────────────────────────

   async createCycle(dto: CreateCycleDTO): Promise<PayrollCycleProps> {
      if (!dto.nombre?.trim()) throw new Error("El nombre del ciclo es obligatorio");
      if (!FRECUENCIAS_PAGO.includes(dto.frecuencia as FrecuenciaPago)) {
         throw new Error(`Frecuencia inválida. Use: ${FRECUENCIAS_PAGO.join(", ")}`);
      }
      const inicio = new Date(dto.fecha_inicio);
      const fin = new Date(dto.fecha_fin);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
         throw new Error("Fechas inválidas");
      }
      if (fin < inicio) throw new Error("La fecha final no puede ser anterior a la inicial");

      return await this.repo.createCycle(dto);
   }

   async updateCycle(id: string, dto: UpdateCycleDTO): Promise<PayrollCycleProps | null> {
      const ciclo = await this.repo.findCycleById(id);
      if (!ciclo) return null;
      if (!cicloEsEditable(ciclo.estado) && dto.estado === undefined) {
         throw new Error(`El ciclo está ${ciclo.estado} y no puede modificarse`);
      }
      return await this.repo.updateCycle(id, dto);
   }

   async listCycles(): Promise<PayrollCycleProps[]> {
      return await this.repo.listCycles();
   }

   async getCycle(id: string): Promise<PayrollCycleProps | null> {
      return await this.repo.findCycleById(id);
   }

   async deleteCycle(id: string): Promise<boolean> {
      const ciclo = await this.repo.findCycleById(id);
      if (!ciclo) return false;
      if (ciclo.estado === "PAGADO") throw new Error("No se puede eliminar un ciclo ya pagado");
      return await this.repo.deleteCycle(id);
   }

   /**
    * Cierra el ciclo y genera el GASTO de la nómina por el total neto a pagar,
    * para que entre en la contabilidad como cualquier otro egreso. A ese gasto
    * se le pueden registrar pagos vía `pago.gasto_empresa_id`.
    *
    * El gasto se crea ANTES de marcar CERRADO: si falla (p.ej. no existe la
    * categoría), el ciclo queda como estaba en vez de cerrarse sin registro
    * contable.
    */
   async cerrarCiclo(id: string, closedBy?: string): Promise<PayrollCycleProps | null> {
      const ciclo = await this.repo.findCycleById(id);
      if (!ciclo) return null;
      if (ciclo.estado === "CERRADO" || ciclo.estado === "PAGADO") {
         throw new Error(`El ciclo ya está ${ciclo.estado}`);
      }

      const empleados = await this.repo.listCycleEmployees(id);
      if (empleados.length === 0) {
         throw new Error("No se puede cerrar un ciclo sin nómina calculada");
      }

      const totalNeto = empleados.reduce((s, e) => s + e.neto_pagar, 0);

      // `gasto_id` es el candado de idempotencia: si el cierre falló a medias
      // y se reintenta, no se duplica el gasto.
      if (!ciclo.gasto_id) {
         if (totalNeto > 0) {
            await this.repo.crearGastoDeNomina({
               cycleId: id,
               monto_total: totalNeto,
               concepto: `Nómina ${ciclo.nombre}`,
               // El gasto se fecha al cierre del período, no al día de hoy.
               fecha: new Date(ciclo.fecha_fin),
            });
         }
         // Con neto 0 no se crea gasto: un egreso de RD$0 solo ensucia la
         // contabilidad.
      }

      return await this.repo.updateCycle(id, { estado: "CERRADO" });
   }

   // ── Cálculo ──────────────────────────────────────────────────────────────

   /**
    * Calcula (o recalcula) el ciclo completo, con las dos modalidades:
    *
    *   PRODUCCION (choferes, rol OPERADOR)
    *     devengado   = Σ (cantidad × monto_pago del chofer para esa tarifa)
    *     complemento = MAX(0, salario del período − devengado)  ← piso
    *
    *   FIJO (resto del personal)
    *     devengado   = 0 (no tienen conduces)
    *     complemento = salario del período           ← el sueldo íntegro
    *
    * `salario del período` prorratea el sueldo del empleado (que está en SU
    * frecuencia) a la frecuencia del ciclo: un mensual de 30,000 en una
    * quincena son 15,000.
    *
    *   Ambas: neto = devengado + complemento − seguro − deducciones
    *
    * Es idempotente: se puede correr las veces que haga falta mientras el
    * ciclo esté ABIERTO o CALCULADO. El `seguro` NO se pisa (campo libre).
    */
   async calcularCiclo(cycleId: string): Promise<ResultadoCalculo> {
      const ciclo = await this.repo.findCycleById(cycleId);
      if (!ciclo) throw new Error("Ciclo no encontrado");
      if (!cicloEsEditable(ciclo.estado)) {
         throw new Error(`El ciclo está ${ciclo.estado}: sus montos están congelados`);
      }

      const [empleados, conduces] = await Promise.all([
         this.repo.listEmpleadosParaNomina(),
         this.repo.listConducesDelPeriodo(ciclo.fecha_inicio, ciclo.fecha_fin),
      ]);

      // Agrupa los conduces por empleado.
      const porEmpleado = new Map<string, typeof conduces>();
      for (const c of conduces) {
         const lista = porEmpleado.get(c.empleado_id) ?? [];
         lista.push(c);
         porEmpleado.set(c.empleado_id, lista);
      }

      let totalNeto = 0;
      let empleadosConInferencia = 0;
      let conducesSinTarifa = 0;
      let choferes = 0;
      let asalariados = 0;

      for (const emp of empleados) {
         const esProduccion = emp.modalidad === "PRODUCCION";
         // Solo los choferes cobran conduces. Un asalariado con conduces
         // atribuidos por error no debe cobrarlos como producción.
         const suyos = esProduccion ? porEmpleado.get(emp.id) ?? [] : [];
         const tarifasEmpleado = esProduccion
            ? await this.repo.getTarifasEmpleado(emp.id)
            : new Map<string, number>();

         // Agrupa por tarifa para el desglose ("precio por viaje u hora").
         const acumulado = new Map<string, TarifaDesglose>();
         let inferidos = 0;

         for (const c of suyos) {
            if (c.inferido) inferidos++;

            // El monto que se le paga AL CHOFER por esta tarifa. Si no la
            // tiene asignada, no se le puede pagar: cuenta 0 pero se reporta.
            const montoPago = c.categoria_equipo_tarifa_id
               ? tarifasEmpleado.get(c.categoria_equipo_tarifa_id) ?? 0
               : 0;
            if (montoPago === 0) conducesSinTarifa++;

            // Clave por tarifa; si el id se perdió (hard-replace) se agrupa
            // por el nombre snapshoteado.
            const clave = c.categoria_equipo_tarifa_id ?? `nombre:${c.categoria_equipo_tarifa_nombre}`;
            const previo = acumulado.get(clave);

            if (previo) {
               previo.cantidad += c.cantidad;
               previo.subtotal = previo.cantidad * previo.monto_pago;
            } else {
               acumulado.set(clave, {
                  categoria_equipo_tarifa_id: c.categoria_equipo_tarifa_id,
                  categoria_equipo_tarifa_nombre: c.categoria_equipo_tarifa_nombre,
                  medida_cobro_nombre: c.medida_cobro_nombre,
                  cantidad: c.cantidad,
                  monto_pago: montoPago,
                  subtotal: c.cantidad * montoPago,
               });
            }
         }

         const tarifas = [...acumulado.values()];
         const devengado = tarifas.reduce((s, t) => s + t.subtotal, 0);

         // El salario del empleado está expresado en SU frecuencia (mensual,
         // quincenal…), que no tiene por qué coincidir con la del ciclo que se
         // está pagando. Se prorratea al período: un sueldo mensual de 30,000
         // en una quincena son 15,000, no 30,000.
         //
         // Aplica a AMBAS modalidades: para un asalariado es lo que cobra, y
         // para un chofer es el piso que se le garantiza — un mínimo mensual
         // completo en una quincena le regalaría medio sueldo.
         const minimo = salarioDelPeriodo(
            emp.salario ?? 0,
            emp.frecuencia_pago,
            ciclo.frecuencia
         );

         // PRODUCCION: lo que falte para llegar al piso garantizado.
         // FIJO: el sueldo íntegro (devengado siempre es 0). Se reusa la misma
         // columna a propósito — `bruto = devengado + complemento` funciona
         // igual para ambos, y la UI la etiqueta según la modalidad.
         const complemento = calcularComplemento(devengado, minimo);

         const [deducciones, deudaTotal] = await Promise.all([
            this.repo.getDeduccionesDelPeriodo(emp.id, ciclo.fecha_inicio, ciclo.fecha_fin),
            this.repo.getDeudaTotal(emp.id),
         ]);

         // El seguro es un campo libre: al recalcular se respeta el valor que
         // el usuario ya haya puesto para este empleado en este ciclo.
         const existente = await this.repo.findCycleEmployee(cycleId, emp.id);
         const seguro = existente?.seguro ?? 0;

         const neto = calcularNeto(devengado, complemento, seguro, deducciones);

         await this.repo.upsertCycleEmployee(
            {
               cycle_id: cycleId,
               empleado_id: emp.id,
               empleado_nombre: emp.nombre,
               frecuencia_pago: emp.frecuencia_pago,
               rol: emp.rol,
               modalidad: emp.modalidad,
               minimo_garantizado: minimo,
               devengado_tarifas: devengado,
               complemento_minimo: complemento,
               seguro,
               deducciones,
               deuda_total: deudaTotal,
               // Lo que queda debiendo tras cobrar lo de este período.
               deuda_pendiente: Math.max(0, deudaTotal - deducciones),
               neto_pagar: neto,
               total_conduces: suyos.length,
               conduces_inferidos: inferidos,
            },
            tarifas
         );

         totalNeto += neto;
         if (inferidos > 0) empleadosConInferencia++;
         if (esProduccion) choferes++;
         else asalariados++;
      }

      await this.repo.updateCycle(cycleId, { estado: "CALCULADO" });

      return {
         cycle_id: cycleId,
         empleados_procesados: empleados.length,
         choferes,
         asalariados,
         total_neto: totalNeto,
         empleados_con_inferencia: empleadosConInferencia,
         conduces_sin_tarifa: conducesSinTarifa,
      };
   }

   // ── Consulta / edición ───────────────────────────────────────────────────

   async listCycleEmployees(cycleId: string): Promise<PayrollCycleEmployeeProps[]> {
      return await this.repo.listCycleEmployees(cycleId);
   }

   async updateSeguro(
      cycleEmployeeId: string,
      seguro: number
   ): Promise<PayrollCycleEmployeeProps | null> {
      if (!Number.isFinite(seguro) || seguro < 0) {
         throw new Error("El seguro debe ser un número mayor o igual a 0");
      }
      return await this.repo.updateSeguro(cycleEmployeeId, seguro);
   }

   /**
    * Crea una deducción nueva para el chofer dentro del ciclo y devuelve la
    * nómina ya actualizada. No modifica las deducciones existentes: añade una
    * más, con su concepto y su fecha, igual que si se creara desde el módulo
    * de deducciones.
    */
   async agregarDeduccion(
      cycleId: string,
      empleadoId: string,
      data: { monto: number; concepto: string; fecha?: Date | string }
   ): Promise<PayrollCycleEmployeeProps | null> {
      const ciclo = await this.repo.findCycleById(cycleId);
      if (!ciclo) throw new Error("Ciclo no encontrado");
      if (!cicloEsEditable(ciclo.estado)) {
         throw new Error(`El ciclo está ${ciclo.estado}: sus montos están congelados`);
      }
      if (!Number.isFinite(data.monto) || data.monto <= 0) {
         throw new Error("El monto de la deducción debe ser mayor a 0");
      }
      if (!data.concepto?.trim()) {
         throw new Error("Debe indicar el concepto de la deducción");
      }

      // La fecha debe caer dentro del ciclo, si no la deducción se crearía
      // pero no la recogería esta nómina.
      const fecha = data.fecha ? new Date(data.fecha) : new Date(ciclo.fecha_fin);
      const dentro =
         fecha >= new Date(ciclo.fecha_inicio) && fecha <= new Date(ciclo.fecha_fin);

      await this.repo.crearDeduccion({
         empleado_id: empleadoId,
         monto_total: data.monto,
         concepto: data.concepto.trim(),
         fecha: dentro ? fecha : new Date(ciclo.fecha_fin),
      });

      await this.repo.refrescarDeducciones(cycleId);
      return await this.repo.findCycleEmployee(cycleId, empleadoId);
   }

   /**
    * Recoge las deducciones creadas a mano después de calcular el ciclo, sin
    * recalcular la producción ni perder los ajustes manuales.
    */
   async refrescarDeducciones(cycleId: string): Promise<{ actualizados: number }> {
      const ciclo = await this.repo.findCycleById(cycleId);
      if (!ciclo) throw new Error("Ciclo no encontrado");
      if (!cicloEsEditable(ciclo.estado)) {
         throw new Error(`El ciclo está ${ciclo.estado}: sus montos están congelados`);
      }
      return { actualizados: await this.repo.refrescarDeducciones(cycleId) };
   }
}
