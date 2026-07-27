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
   deduccionAplicada,
} from "../domain/nomina.domain";

export interface ResultadoCalculo {
   cycle_id: string;
   empleados_procesados: number;
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

   async cerrarCiclo(id: string, closedBy?: string): Promise<PayrollCycleProps | null> {
      const ciclo = await this.repo.findCycleById(id);
      if (!ciclo) return null;
      if (ciclo.estado === "CERRADO" || ciclo.estado === "PAGADO") {
         throw new Error(`El ciclo ya está ${ciclo.estado}`);
      }
      return await this.repo.updateCycle(id, { estado: "CERRADO" });
   }

   // ── Cálculo ──────────────────────────────────────────────────────────────

   /**
    * Calcula (o recalcula) el ciclo completo.
    *
    *   devengado   = Σ (cantidad × monto_pago del chofer para esa tarifa)
    *   mínimo      = empleado.salario
    *   complemento = MAX(0, mínimo − devengado)
    *   neto        = devengado + complemento − seguro − deducciones
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
         this.repo.listEmpleadosOperadores(),
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

      for (const emp of empleados) {
         const suyos = porEmpleado.get(emp.id) ?? [];
         const tarifasEmpleado = await this.repo.getTarifasEmpleado(emp.id);

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

         const minimo = emp.salario ?? 0;
         const complemento = calcularComplemento(devengado, minimo);

         const [deducciones, deudaTotal] = await Promise.all([
            this.repo.getDeduccionesDelPeriodo(emp.id, ciclo.fecha_inicio, ciclo.fecha_fin),
            this.repo.getDeudaTotal(emp.id),
         ]);

         // El seguro y el ajuste de deducción son campos libres: al recalcular
         // se respeta lo que el usuario ya haya puesto para este empleado.
         const existente = await this.repo.findCycleEmployee(cycleId, emp.id);
         const seguro = existente?.seguro ?? 0;
         const ajuste = existente?.deducciones_ajuste ?? null;

         // Lo que efectivamente se le descuenta: el ajuste manual si existe,
         // si no lo que suman sus deducciones del período.
         const descuento = deduccionAplicada(deducciones, ajuste);
         const neto = calcularNeto(devengado, complemento, seguro, descuento);

         await this.repo.upsertCycleEmployee(
            {
               cycle_id: cycleId,
               empleado_id: emp.id,
               empleado_nombre: emp.nombre,
               frecuencia_pago: emp.frecuencia_pago,
               minimo_garantizado: minimo,
               devengado_tarifas: devengado,
               complemento_minimo: complemento,
               seguro,
               deducciones,
               deducciones_ajuste: ajuste,
               deuda_total: deudaTotal,
               // Lo que queda debiendo tras cobrar lo de este período.
               deuda_pendiente: Math.max(0, deudaTotal - descuento),
               neto_pagar: neto,
               total_conduces: suyos.length,
               conduces_inferidos: inferidos,
            },
            tarifas
         );

         totalNeto += neto;
         if (inferidos > 0) empleadosConInferencia++;
      }

      await this.repo.updateCycle(cycleId, { estado: "CALCULADO" });

      return {
         cycle_id: cycleId,
         empleados_procesados: empleados.length,
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
    * Ajusta cuánto se le descuenta en este ciclo. Pasar `null` restaura el
    * monto calculado desde sus deducciones del período.
    */
   async updateDeduccionAjuste(
      cycleEmployeeId: string,
      ajuste: number | null
   ): Promise<PayrollCycleEmployeeProps | null> {
      if (ajuste !== null) {
         if (!Number.isFinite(ajuste) || ajuste < 0) {
            throw new Error("El monto a deducir debe ser mayor o igual a 0");
         }
      }
      return await this.repo.updateDeduccionAjuste(cycleEmployeeId, ajuste);
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
