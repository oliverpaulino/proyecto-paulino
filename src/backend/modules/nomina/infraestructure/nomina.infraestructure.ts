import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";
import type {
   INominaRepository,
   CreateCycleDTO,
   UpdateCycleDTO,
   PayrollCycleProps,
   PayrollCycleEmployeeProps,
   TarifaDesglose,
   ConduceParaNomina,
   DeduccionDelPeriodo,
   EmpleadoParaNomina,
   ModalidadPago,
   EstadoCiclo,
   FrecuenciaPago,
} from "../domain/nomina.domain";

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Normaliza a "YYYY-MM-DD" sin pasar por UTC (evita corrimiento de día). */
function aFechaISO(v: Date | string): string {
   if (typeof v === "string") return v.slice(0, 10);
   const y = v.getFullYear();
   const m = String(v.getMonth() + 1).padStart(2, "0");
   const d = String(v.getDate()).padStart(2, "0");
   return `${y}-${m}-${d}`;
}

function mapCycle(row: any): PayrollCycleProps {
   return {
      id: row.id,
      organization_id: row.organization_id ?? null,
      nombre: row.nombre,
      frecuencia: row.frecuencia as FrecuenciaPago,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      fecha_pago: row.fecha_pago ?? null,
      estado: row.estado as EstadoCiclo,
      closed_at: row.closed_at ?? null,
      closed_by: row.closed_by ?? null,
      gasto_id: row.gasto_id ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
   };
}

function mapCycleEmployee(row: any): PayrollCycleEmployeeProps {
   return {
      id: row.id,
      cycle_id: row.cycle_id,
      empleado_id: row.empleado_id,
      empleado_nombre: row.empleado_nombre ?? null,
      frecuencia_pago: row.frecuencia_pago ?? null,
      rol: row.rol ?? null,
      modalidad: (row.modalidad ?? "PRODUCCION") as ModalidadPago,
      minimo_garantizado: num(row.minimo_garantizado),
      devengado_tarifas: num(row.devengado_tarifas),
      complemento_minimo: num(row.complemento_minimo),
      seguro: num(row.seguro),
      deducciones: num(row.deducciones),
      deuda_total: num(row.deuda_total),
      deuda_pendiente: num(row.deuda_pendiente),
      neto_pagar: num(row.neto_pagar),
      total_conduces: num(row.total_conduces),
      conduces_inferidos: num(row.conduces_inferidos),
      created_at: row.created_at,
      updated_at: row.updated_at,
   };
}

export class KyselyNominaRepository implements INominaRepository {
   constructor(private readonly db: Kysely<DB>) {}

   // ── Ciclos ───────────────────────────────────────────────────────────────

   async createCycle(dto: CreateCycleDTO): Promise<PayrollCycleProps> {
      const row = await this.db
         .insertInto("payroll_cycles")
         .values({
            nombre: dto.nombre,
            frecuencia: dto.frecuencia,
            fecha_inicio: aFechaISO(dto.fecha_inicio) as any,
            fecha_fin: aFechaISO(dto.fecha_fin) as any,
            fecha_pago: dto.fecha_pago ? (aFechaISO(dto.fecha_pago) as any) : null,
            organization_id: dto.organization_id ?? null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();
      return mapCycle(row);
   }

   async updateCycle(id: string, dto: UpdateCycleDTO): Promise<PayrollCycleProps | null> {
      const patch: Record<string, unknown> = { updated_at: new Date() };
      if (dto.nombre !== undefined) patch.nombre = dto.nombre;
      if (dto.fecha_inicio !== undefined) patch.fecha_inicio = aFechaISO(dto.fecha_inicio);
      if (dto.fecha_fin !== undefined) patch.fecha_fin = aFechaISO(dto.fecha_fin);
      if (dto.fecha_pago !== undefined)
         patch.fecha_pago = dto.fecha_pago ? aFechaISO(dto.fecha_pago) : null;
      if (dto.estado !== undefined) {
         patch.estado = dto.estado;
         if (dto.estado === "CERRADO") patch.closed_at = new Date();
      }

      const row = await this.db
         .updateTable("payroll_cycles")
         .set(patch as any)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();
      return row ? mapCycle(row) : null;
   }

   async findCycleById(id: string): Promise<PayrollCycleProps | null> {
      const row = await this.db
         .selectFrom("payroll_cycles")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();
      return row ? mapCycle(row) : null;
   }

   async listCycles(): Promise<PayrollCycleProps[]> {
      const rows = await this.db
         .selectFrom("payroll_cycles")
         .selectAll()
         .orderBy("fecha_inicio", "desc")
         .execute();
      return rows.map(mapCycle);
   }

   async deleteCycle(id: string): Promise<boolean> {
      const res = await this.db.deleteFrom("payroll_cycles").where("id", "=", id).executeTakeFirst();
      return Number(res.numDeletedRows ?? 0) > 0;
   }

   // ── Empleados candidatos ─────────────────────────────────────────────────

   /**
    * Todos los empleados activos. La modalidad se deriva del rol: solo los
    * OPERADOR cobran por producción (conduces); el resto del personal cobra
    * su salario fijo del período.
    */
   async listEmpleadosParaNomina(): Promise<EmpleadoParaNomina[]> {
      const rows = await this.db
         .selectFrom("empleado")
         .select(["id", "nombre", "rol", "salario", "frecuencia_pago"])
         .where("activo", "=", true)
         .orderBy("nombre", "asc")
         .execute();

      return rows.map((r) => ({
         id: r.id,
         nombre: r.nombre,
         rol: r.rol,
         modalidad: r.rol === "OPERADOR" ? "PRODUCCION" : "FIJO",
         salario: num(r.salario),
         frecuencia_pago: r.frecuencia_pago ?? null,
      }));
   }

   // ── Conduces del período ─────────────────────────────────────────────────

   /**
    * Resuelve la persona del conduce en TRES niveles, en orden:
    *   1. `conduce.empleado_id`      — dato directo
    *   2. `operador.empleado_id`     — vía `conduce.operador_id`
    *   3. `equipo → operador`        — INFERIDO por el operador asignado hoy
    *                                    al equipo. Es una suposición: se
    *                                    marca con `inferido = true` para que
    *                                    la UI pueda advertirlo.
    *
    * NO filtra por `es_cobrable`: que no se le facture al cliente no
    * significa que el chofer no haya trabajado.
    * SÍ filtra `deleted_at IS NULL` (soft delete).
    */
   async listConducesDelPeriodo(desde: Date, hasta: Date): Promise<ConduceParaNomina[]> {
      const empleadoEfectivo = sql<string>`
         coalesce(conduce.empleado_id, operador.empleado_id, eq_op.empleado_id)
      `;

      const rows = await this.db
         .selectFrom("conduce")
         .leftJoin("operador", "operador.id", "conduce.operador_id")
         .leftJoin("equipo", "equipo.id", "conduce.equipo_id")
         .leftJoin("operador as eq_op", "eq_op.id", "equipo.operador_id")
         .select([
            "conduce.id as conduce_id",
            "conduce.fecha",
            "conduce.tipo_conduce",
            "conduce.cantidad",
            "conduce.total_horas",
            "conduce.categoria_equipo_tarifa_id",
            "conduce.categoria_equipo_tarifa_nombre",
            "conduce.medida_cobro_nombre",
            empleadoEfectivo.as("empleado_id"),
            // Inferido = no venía persona en el conduce y se dedujo del equipo.
            sql<boolean>`(
               conduce.empleado_id is null
               and operador.empleado_id is null
               and eq_op.empleado_id is not null
            )`.as("inferido"),
         ])
         .where("conduce.deleted_at", "is", null)
         .where("conduce.fecha", ">=", aFechaISO(desde) as any)
         .where("conduce.fecha", "<=", aFechaISO(hasta) as any)
         .where(sql<boolean>`coalesce(conduce.empleado_id, operador.empleado_id, eq_op.empleado_id) is not null`)
         .execute();

      return rows.map((r: any) => ({
         conduce_id: r.conduce_id,
         empleado_id: r.empleado_id,
         inferido: Boolean(r.inferido),
         fecha: r.fecha,
         categoria_equipo_tarifa_id: r.categoria_equipo_tarifa_id ?? null,
         categoria_equipo_tarifa_nombre: r.categoria_equipo_tarifa_nombre ?? "(sin tarifa)",
         medida_cobro_nombre: r.medida_cobro_nombre ?? null,
         // CAMION cobra por viajes/botes; EQUIPO_PESADO por horas.
         cantidad:
            r.tipo_conduce === "CAMION" ? num(r.cantidad) : num(r.total_horas),
      }));
   }

   // ── Tarifas del empleado ─────────────────────────────────────────────────

   async getTarifasEmpleado(empleadoId: string): Promise<Map<string, number>> {
      const rows = await this.db
         .selectFrom("empleado_categoria_tarifa")
         .select(["categoria_equipo_tarifa_id", "monto_pago"])
         .where("empleado_id", "=", empleadoId)
         .execute();

      return new Map(rows.map((r) => [r.categoria_equipo_tarifa_id, num(r.monto_pago)]));
   }

   // ── Deducciones ──────────────────────────────────────────────────────────

   async getDeduccionesDelPeriodo(
      empleadoId: string,
      desde: Date,
      hasta: Date
   ): Promise<number> {
      const row = await this.db
         .selectFrom("deduccion")
         .select(sql<string>`coalesce(sum(monto_total), 0)`.as("total"))
         .where("empleado_id", "=", empleadoId)
         .where("deleted_at", "is", null)
         .where("fecha", ">=", aFechaISO(desde) as any)
         .where("fecha", "<=", aFechaISO(hasta) as any)
         .executeTakeFirst();
      return num(row?.total);
   }

   async getDeudaTotal(empleadoId: string): Promise<number> {
      const row = await this.db
         .selectFrom("deduccion")
         .select(sql<string>`coalesce(sum(monto_total), 0)`.as("total"))
         .where("empleado_id", "=", empleadoId)
         .where("deleted_at", "is", null)
         .executeTakeFirst();
      return num(row?.total);
   }

   // ── Resumen por empleado ─────────────────────────────────────────────────

   async upsertCycleEmployee(
      row: Omit<PayrollCycleEmployeeProps, "id" | "created_at" | "updated_at" | "tarifas">,
      tarifas: TarifaDesglose[]
   ): Promise<PayrollCycleEmployeeProps> {
      return await this.db.transaction().execute(async (trx) => {
         const saved = await trx
            .insertInto("payroll_cycle_employees")
            .values({
               cycle_id: row.cycle_id,
               empleado_id: row.empleado_id,
               empleado_nombre: row.empleado_nombre,
               frecuencia_pago: row.frecuencia_pago,
               rol: row.rol,
               modalidad: row.modalidad,
               minimo_garantizado: row.minimo_garantizado,
               devengado_tarifas: row.devengado_tarifas,
               complemento_minimo: row.complemento_minimo,
               seguro: row.seguro,
               deducciones: row.deducciones,
               deuda_total: row.deuda_total,
               deuda_pendiente: row.deuda_pendiente,
               neto_pagar: row.neto_pagar,
               total_conduces: row.total_conduces,
               conduces_inferidos: row.conduces_inferidos,
            })
            .onConflict((oc) =>
               oc.columns(["cycle_id", "empleado_id"]).doUpdateSet({
                  empleado_nombre: row.empleado_nombre,
                  frecuencia_pago: row.frecuencia_pago,
                  rol: row.rol,
                  modalidad: row.modalidad,
                  minimo_garantizado: row.minimo_garantizado,
                  devengado_tarifas: row.devengado_tarifas,
                  complemento_minimo: row.complemento_minimo,
                  // `seguro` NO se pisa al recalcular: es un campo libre que
                  // el usuario edita a mano. `deducciones` sí se recalcula
                  // siempre desde la tabla `deduccion`.
                  deducciones: row.deducciones,
                  deuda_total: row.deuda_total,
                  deuda_pendiente: row.deuda_pendiente,
                  neto_pagar: row.neto_pagar,
                  total_conduces: row.total_conduces,
                  conduces_inferidos: row.conduces_inferidos,
                  updated_at: new Date(),
               } as any)
            )
            .returningAll()
            .executeTakeFirstOrThrow();

         await trx
            .deleteFrom("payroll_cycle_employee_tarifas")
            .where("cycle_employee_id", "=", saved.id)
            .execute();

         if (tarifas.length > 0) {
            await trx
               .insertInto("payroll_cycle_employee_tarifas")
               .values(
                  tarifas.map((t) => ({
                     cycle_employee_id: saved.id,
                     categoria_equipo_tarifa_id: t.categoria_equipo_tarifa_id,
                     categoria_equipo_tarifa_nombre: t.categoria_equipo_tarifa_nombre,
                     medida_cobro_nombre: t.medida_cobro_nombre,
                     cantidad: t.cantidad,
                     monto_pago: t.monto_pago,
                     subtotal: t.subtotal,
                  }))
               )
               .execute();
         }

         return { ...mapCycleEmployee(saved), tarifas };
      });
   }

   async listCycleEmployees(cycleId: string): Promise<PayrollCycleEmployeeProps[]> {
      const rows = await this.db
         .selectFrom("payroll_cycle_employees")
         .selectAll()
         .where("cycle_id", "=", cycleId)
         .orderBy("empleado_nombre", "asc")
         .execute();

      if (rows.length === 0) return [];

      const tarifas = await this.db
         .selectFrom("payroll_cycle_employee_tarifas")
         .selectAll()
         .where(
            "cycle_employee_id",
            "in",
            rows.map((r) => r.id)
         )
         .execute();

      const porEmpleado = new Map<string, TarifaDesglose[]>();
      for (const t of tarifas) {
         const lista = porEmpleado.get(t.cycle_employee_id) ?? [];
         lista.push({
            categoria_equipo_tarifa_id: t.categoria_equipo_tarifa_id ?? null,
            categoria_equipo_tarifa_nombre: t.categoria_equipo_tarifa_nombre,
            medida_cobro_nombre: t.medida_cobro_nombre ?? null,
            cantidad: num(t.cantidad),
            monto_pago: num(t.monto_pago),
            subtotal: num(t.subtotal),
         });
         porEmpleado.set(t.cycle_employee_id, lista);
      }

      // Detalle de las deducciones que componen el monto, para poder mostrar
      // de dónde sale el descuento en vez de un total opaco.
      const ciclo = await this.findCycleById(cycleId);
      const detalles = ciclo
         ? await Promise.all(
              rows.map((r) =>
                 this.listDeduccionesDelPeriodo(r.empleado_id, ciclo.fecha_inicio, ciclo.fecha_fin)
              )
           )
         : rows.map(() => []);

      return rows.map((r, i) => ({
         ...mapCycleEmployee(r),
         tarifas: porEmpleado.get(r.id) ?? [],
         detalle_deducciones: detalles[i],
      }));
   }

   async findCycleEmployee(
      cycleId: string,
      empleadoId: string
   ): Promise<PayrollCycleEmployeeProps | null> {
      const todos = await this.listCycleEmployees(cycleId);
      return todos.find((e) => e.empleado_id === empleadoId) ?? null;
   }

   async updateSeguro(
      cycleEmployeeId: string,
      seguro: number
   ): Promise<PayrollCycleEmployeeProps | null> {
      const actual = await this.db
         .selectFrom("payroll_cycle_employees")
         .selectAll()
         .where("id", "=", cycleEmployeeId)
         .executeTakeFirst();
      if (!actual) return null;

      const bruto = num(actual.devengado_tarifas) + num(actual.complemento_minimo);
      const neto = bruto - seguro - num(actual.deducciones);

      const row = await this.db
         .updateTable("payroll_cycle_employees")
         .set({ seguro, neto_pagar: neto, updated_at: new Date() } as any)
         .where("id", "=", cycleEmployeeId)
         .returningAll()
         .executeTakeFirst();
      return row ? mapCycleEmployee(row) : null;
   }

   /**
    * Crea una deducción nueva. No toca la nómina: el monto entra al ciclo
    * cuando se refrescan las deducciones, igual que una creada desde el
    * módulo de deducciones. Devuelve el id de la deducción creada.
    */
   async crearDeduccion(data: {
      empleado_id: string;
      monto_total: number;
      concepto: string;
      fecha: Date;
   }): Promise<string> {
      const row = await this.db
         .insertInto("deduccion")
         .values({
            empleado_id: data.empleado_id,
            equipo_id: null,
            monto_total: data.monto_total,
            // Nace saldada contra esta nómina: se cobra completa en el ciclo.
            balance_pendiente: 0,
            concepto: data.concepto,
            fecha: aFechaISO(data.fecha) as any,
         })
         .returning("id")
         .executeTakeFirstOrThrow();
      return row.id;
   }

   async listDeduccionesDelPeriodo(
      empleadoId: string,
      desde: Date,
      hasta: Date
   ): Promise<DeduccionDelPeriodo[]> {
      const rows = await this.db
         .selectFrom("deduccion")
         .select(["id", "concepto", "monto_total", "fecha"])
         .where("empleado_id", "=", empleadoId)
         .where("deleted_at", "is", null)
         .where("fecha", ">=", aFechaISO(desde) as any)
         .where("fecha", "<=", aFechaISO(hasta) as any)
         .orderBy("fecha", "asc")
         .execute();

      return rows.map((r) => ({
         id: r.id,
         concepto: r.concepto,
         monto_total: num(r.monto_total),
         fecha: r.fecha,
      }));
   }

   /**
    * Relee las deducciones del período para recoger las que se crearon
    * DESPUÉS de calcular el ciclo. No toca la producción: solo actualiza
    * `deducciones`, `deuda_*` y el neto. Devuelve cuántas filas cambiaron.
    */
   async refrescarDeducciones(cycleId: string): Promise<number> {
      const ciclo = await this.findCycleById(cycleId);
      if (!ciclo) return 0;

      const filas = await this.db
         .selectFrom("payroll_cycle_employees")
         .selectAll()
         .where("cycle_id", "=", cycleId)
         .execute();

      let cambiadas = 0;

      for (const f of filas) {
         const [periodo, total] = await Promise.all([
            this.getDeduccionesDelPeriodo(f.empleado_id, ciclo.fecha_inicio, ciclo.fecha_fin),
            this.getDeudaTotal(f.empleado_id),
         ]);

         if (periodo === num(f.deducciones) && total === num(f.deuda_total)) continue;

         const bruto = num(f.devengado_tarifas) + num(f.complemento_minimo);

         await this.db
            .updateTable("payroll_cycle_employees")
            .set({
               deducciones: periodo,
               deuda_total: total,
               deuda_pendiente: Math.max(0, total - periodo),
               neto_pagar: bruto - num(f.seguro) - periodo,
               updated_at: new Date(),
            } as any)
            .where("id", "=", f.id)
            .execute();

         cambiadas++;
      }

      return cambiadas;
   }

   /**
    * Busca la categoría de gasto de la nómina. La siembra la migración 009,
    * pero `categoria_gasto` es editable por el usuario: puede haberla
    * renombrado o borrado, así que esto puede devolver null.
    */
   async getCategoriaGastoNomina(): Promise<string | null> {
      const row = await this.db
         .selectFrom("categoria_gasto")
         .select("id")
         .where(sql<boolean>`lower(nombre) like '%nómina%' or lower(nombre) like '%nomina%'`)
         .executeTakeFirst();
      return row?.id ?? null;
   }

   /**
    * Crea el gasto de la nómina y lo enlaza al ciclo, en una transacción para
    * que no quede un gasto huérfano si falla el enlace.
    */
   async crearGastoDeNomina(data: {
      cycleId: string;
      monto_total: number;
      concepto: string;
      fecha: Date;
   }): Promise<string> {
      const categoriaId = await this.getCategoriaGastoNomina();
      if (!categoriaId) {
         throw new Error(
            'No existe una categoría de gasto para la nómina. Cree una llamada "Nómina" en Categorías de Gastos.'
         );
      }

      return await this.db.transaction().execute(async (trx) => {
         const gasto = await trx
            .insertInto("gasto")
            .values({
               monto_total: data.monto_total,
               concepto: data.concepto,
               // La nómina no tiene comprobante fiscal de proveedor.
               ncf: null,
               categoria_gasto_id: categoriaId,
               orden_compra_id: null,
               proyecto_id: null,
               equipo_id: null,
               fecha: aFechaISO(data.fecha) as any,
            })
            .returning("id")
            .executeTakeFirstOrThrow();

         await trx
            .updateTable("payroll_cycles")
            .set({ gasto_id: gasto.id, updated_at: new Date() } as any)
            .where("id", "=", data.cycleId)
            .execute();

         return gasto.id;
      });
   }

   async clearCycleEmployees(cycleId: string): Promise<void> {
      await this.db
         .deleteFrom("payroll_cycle_employees")
         .where("cycle_id", "=", cycleId)
         .execute();
   }
}
