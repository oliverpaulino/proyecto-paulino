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
   PrecioManualProps,
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
      // Lo sobrescribe quien tenga el conteo real; sin él, 0 es lo honesto:
      // "no sé de cuántos conceptos viene", no "viene de cero".
      deducciones_count: 0,
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
         // El nombre de la categoría no está snapshoteado en el conduce (solo
         // el id), así que se resuelve por join. Es leftJoin porque la
         // categoría pudo borrarse y aun así el conduce debe contarse.
         .leftJoin("categoria_equipo", "categoria_equipo.id", "conduce.categoria_equipo_id")
         .select([
            "conduce.id as conduce_id",
            "conduce.fecha",
            "conduce.tipo_conduce",
            "conduce.cantidad",
            "conduce.total_horas",
            "conduce.categoria_equipo_tarifa_id",
            "conduce.categoria_equipo_tarifa_nombre",
            "conduce.categoria_equipo_id",
            "categoria_equipo.nombre as categoria_equipo_nombre",
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
         categoria_equipo_id: r.categoria_equipo_id ?? null,
         categoria_equipo_nombre: r.categoria_equipo_nombre ?? null,
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

   /**
    * Categorías de tarifa indexadas por nombre normalizado, saltando las que
    * comparten nombre. Ver `getTarifasPorNombreUnico` en el dominio: permite
    * pagar un conduce que guardó el nombre pero perdió el id, sin adivinar
    * cuando el nombre es ambiguo.
    */
   async getTarifasPorNombreUnico(): Promise<Map<string, string>> {
      const rows = await this.db
         .selectFrom("categoria_equipo_tarifa")
         .select(["id", "nombre"])
         .execute();

      const porNombre = new Map<string, string[]>();
      for (const r of rows) {
         const k = r.nombre.trim().toLowerCase();
         porNombre.set(k, [...(porNombre.get(k) ?? []), r.id]);
      }

      const unicos = new Map<string, string>();
      for (const [nombre, ids] of porNombre) {
         if (ids.length === 1) unicos.set(nombre, ids[0]);
      }
      return unicos;
   }

   // ── Precio manual ────────────────────────────────────────────────────────

   /** Clave del precio manual: empleado + nombre de tarifa normalizado. */
   static claveManual(empleadoId: string, tarifaNombre: string): string {
      return `${empleadoId}::${tarifaNombre.trim().toLowerCase()}`;
   }

   async getPreciosManuales(cycleId: string): Promise<Map<string, PrecioManualProps>> {
      const rows = await this.db
         .selectFrom("payroll_cycle_precio_manual")
         .selectAll()
         .where("cycle_id", "=", cycleId)
         .execute();

      return new Map(
         rows.map((r) => [
            KyselyNominaRepository.claveManual(r.empleado_id, r.tarifa_nombre_norm),
            {
               id: r.id,
               cycle_id: r.cycle_id,
               empleado_id: r.empleado_id,
               tarifa_nombre: r.tarifa_nombre,
               monto_pago: num(r.monto_pago),
               nota: r.nota ?? null,
               created_by: r.created_by ?? null,
            },
         ])
      );
   }

   async upsertPrecioManual(data: {
      cycle_id: string;
      empleado_id: string;
      tarifa_nombre: string;
      monto_pago: number;
      nota?: string | null;
      created_by?: string | null;
   }): Promise<PrecioManualProps> {
      const norm = data.tarifa_nombre.trim().toLowerCase();

      const row = await this.db
         .insertInto("payroll_cycle_precio_manual")
         .values({
            cycle_id: data.cycle_id,
            empleado_id: data.empleado_id,
            tarifa_nombre_norm: norm,
            tarifa_nombre: data.tarifa_nombre.trim(),
            monto_pago: data.monto_pago,
            nota: data.nota ?? null,
            created_by: data.created_by ?? null,
         })
         .onConflict((oc) =>
            oc.columns(["cycle_id", "empleado_id", "tarifa_nombre_norm"]).doUpdateSet({
               monto_pago: data.monto_pago,
               nota: data.nota ?? null,
               updated_at: new Date(),
            } as any)
         )
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         id: row.id,
         cycle_id: row.cycle_id,
         empleado_id: row.empleado_id,
         tarifa_nombre: row.tarifa_nombre,
         monto_pago: num(row.monto_pago),
         nota: row.nota ?? null,
         created_by: row.created_by ?? null,
      };
   }

   async deletePrecioManual(
      cycleId: string,
      empleadoId: string,
      tarifaNombre: string
   ): Promise<boolean> {
      const res = await this.db
         .deleteFrom("payroll_cycle_precio_manual")
         .where("cycle_id", "=", cycleId)
         .where("empleado_id", "=", empleadoId)
         .where("tarifa_nombre_norm", "=", tarifaNombre.trim().toLowerCase())
         .executeTakeFirst();
      return Number(res.numDeletedRows ?? 0) > 0;
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
      row: Omit<
         PayrollCycleEmployeeProps,
         "id" | "created_at" | "updated_at" | "tarifas" | "deducciones_count"
      >,
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
                     categoria_equipo_id: t.categoria_equipo_id ?? null,
                     categoria_equipo_nombre: t.categoria_equipo_nombre ?? null,
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

   /**
    * Para las tarifas huérfanas (sin `categoria_equipo_tarifa_id`), busca si su
    * nombre snapshoteado corresponde hoy a una categoría viva.
    *
    * Hay dos razones distintas por las que un id queda en NULL y desde la
    * nómina se ven igual:
    *   1. La categoría se borró y solo sobrevive el nombre. Irrecuperable: no
    *      hay a qué re-vincular.
    *   2. El conduce se guardó mal (nombre sí, id no) con la categoría viva.
    *      Recuperable: es el caso que se puede corregir desde el diálogo.
    *
    * Compara sin distinguir mayúsculas ni espacios, porque los nombres no
    * están normalizados. Si varias categorías comparten nombre NO elige
    * ninguna: pagarle al chofer con la tarifa equivocada es peor que pedirle
    * que desambigüe.
    *
    * Devuelve un lector sincrónico para no volver a la base por cada fila.
    */
   async #resolverRescates(
      nombres: string[]
   ): Promise<(nombre: string) => Partial<TarifaDesglose>> {
      const clave = (s: string) => s.trim().toLowerCase();
      const buscados = [...new Set(nombres.map(clave))].filter((n) => n.length > 0);
      if (buscados.length === 0) return () => ({ rescate: "sin_categoria" });

      const filas = await this.db
         .selectFrom("categoria_equipo_tarifa")
         .select(["id", "nombre"])
         .where(sql<boolean>`lower(trim(nombre)) = any(${buscados})`)
         .execute();

      const porNombre = new Map<string, string[]>();
      for (const f of filas) {
         const k = clave(f.nombre);
         porNombre.set(k, [...(porNombre.get(k) ?? []), f.id]);
      }

      return (nombre: string) => {
         const candidatas = porNombre.get(clave(nombre)) ?? [];
         if (candidatas.length === 1) {
            return {
               rescate: "vinculable",
               rescate_id: candidatas[0],
               rescate_candidatas: 1,
            };
         }
         if (candidatas.length > 1) {
            return { rescate: "ambigua", rescate_candidatas: candidatas.length };
         }
         return { rescate: "sin_categoria", rescate_candidatas: 0 };
      };
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

      // Una tarifa huérfana puede ser rescatable: se resuelve para todo el
      // ciclo de una vez, no por fila.
      const rescates = await this.#resolverRescates(
         tarifas
            .filter((t) => t.categoria_equipo_tarifa_id == null)
            .map((t) => t.categoria_equipo_tarifa_nombre)
      );

      // El snapshot no guarda de dónde salió el monto, así que la marca de
      // "precio manual" se deriva al leer, desde su propia tabla — que es la
      // única fuente de verdad de esos precios.
      const manuales = await this.getPreciosManuales(cycleId);
      const empleadoDeFila = new Map(rows.map((r) => [r.id, r.empleado_id]));

      const porEmpleado = new Map<string, TarifaDesglose[]>();
      for (const t of tarifas) {
         const lista = porEmpleado.get(t.cycle_employee_id) ?? [];
         const manual = manuales.get(
            KyselyNominaRepository.claveManual(
               empleadoDeFila.get(t.cycle_employee_id) ?? "",
               t.categoria_equipo_tarifa_nombre
            )
         );
         lista.push({
            categoria_equipo_tarifa_id: t.categoria_equipo_tarifa_id ?? null,
            categoria_equipo_tarifa_nombre: t.categoria_equipo_tarifa_nombre,
            categoria_equipo_id: t.categoria_equipo_id ?? null,
            categoria_equipo_nombre: t.categoria_equipo_nombre ?? null,
            medida_cobro_nombre: t.medida_cobro_nombre ?? null,
            cantidad: num(t.cantidad),
            monto_pago: num(t.monto_pago),
            subtotal: num(t.subtotal),
            ...(t.categoria_equipo_tarifa_id == null
               ? rescates(t.categoria_equipo_tarifa_nombre)
               : {}),
            // Solo cuenta como manual si el monto guardado es el que se fijó:
            // si el catálogo ya lo resolvió, el manual dejó de aplicar.
            ...(manual && num(t.monto_pago) === manual.monto_pago
               ? { precio_manual: true, precio_manual_nota: manual.nota }
               : {}),
         });
         porEmpleado.set(t.cycle_employee_id, lista);
      }

      // Cuántas deducciones componen el monto de cada empleado. La fila
      // colapsada solo muestra el número ("N conceptos"); el detalle se pide
      // aparte al expandir. Antes esto era un Promise.all con una query POR
      // EMPLEADO: con 100 empleados eran 100 viajes a la base. Un GROUP BY lo
      // resuelve en uno solo.
      const ciclo = await this.findCycleById(cycleId);
      const conteos = new Map<string, number>();

      if (ciclo) {
         const filas = await this.db
            .selectFrom("deduccion")
            .select(["empleado_id", sql<string>`count(*)`.as("total")])
            .where(
               "empleado_id",
               "in",
               rows.map((r) => r.empleado_id)
            )
            .where("deleted_at", "is", null)
            .where("fecha", ">=", aFechaISO(ciclo.fecha_inicio) as any)
            .where("fecha", "<=", aFechaISO(ciclo.fecha_fin) as any)
            .groupBy("empleado_id")
            .execute();

         for (const f of filas) conteos.set(f.empleado_id, num(f.total));
      }

      return rows.map((r) => ({
         ...mapCycleEmployee(r),
         tarifas: porEmpleado.get(r.id) ?? [],
         deducciones_count: conteos.get(r.empleado_id) ?? 0,
      }));
   }

   /**
    * Un solo empleado del ciclo, con su desglose de tarifas y el detalle de
    * sus deducciones. Este SÍ trae el detalle completo: es lo que pide la UI
    * al expandir una fila, y es una persona, no las cien del ciclo.
    */
   async findCycleEmployee(
      cycleId: string,
      empleadoId: string
   ): Promise<PayrollCycleEmployeeProps | null> {
      const row = await this.db
         .selectFrom("payroll_cycle_employees")
         .selectAll()
         .where("cycle_id", "=", cycleId)
         .where("empleado_id", "=", empleadoId)
         .executeTakeFirst();
      if (!row) return null;

      const ciclo = await this.findCycleById(cycleId);

      const [tarifas, detalle] = await Promise.all([
         this.db
            .selectFrom("payroll_cycle_employee_tarifas")
            .selectAll()
            .where("cycle_employee_id", "=", row.id)
            .execute(),
         ciclo
            ? this.listDeduccionesDelPeriodo(empleadoId, ciclo.fecha_inicio, ciclo.fecha_fin)
            : Promise.resolve([]),
      ]);

      const [rescates, manuales] = await Promise.all([
         this.#resolverRescates(
            tarifas
               .filter((t) => t.categoria_equipo_tarifa_id == null)
               .map((t) => t.categoria_equipo_tarifa_nombre)
         ),
         this.getPreciosManuales(cycleId),
      ]);

      return {
         ...mapCycleEmployee(row),
         tarifas: tarifas.map((t) => {
            const manual = manuales.get(
               KyselyNominaRepository.claveManual(empleadoId, t.categoria_equipo_tarifa_nombre)
            );
            return {
               categoria_equipo_tarifa_id: t.categoria_equipo_tarifa_id ?? null,
               categoria_equipo_tarifa_nombre: t.categoria_equipo_tarifa_nombre,
               categoria_equipo_id: t.categoria_equipo_id ?? null,
               categoria_equipo_nombre: t.categoria_equipo_nombre ?? null,
               medida_cobro_nombre: t.medida_cobro_nombre ?? null,
               cantidad: num(t.cantidad),
               monto_pago: num(t.monto_pago),
               subtotal: num(t.subtotal),
               ...(t.categoria_equipo_tarifa_id == null
                  ? rescates(t.categoria_equipo_tarifa_nombre)
                  : {}),
               ...(manual && num(t.monto_pago) === manual.monto_pago
                  ? { precio_manual: true, precio_manual_nota: manual.nota }
                  : {}),
            };
         }),
         deducciones_count: detalle.length,
         detalle_deducciones: detalle,
      };
   }

   /**
    * El `seguro` es lo único que `calcularCiclo` necesita saber de la fila
    * anterior (es un campo libre que no se pisa al recalcular). Leer solo esa
    * columna evita arrastrar tarifas y deducciones en cada vuelta del loop.
    */
   async getSeguroActual(cycleId: string, empleadoId: string): Promise<number | null> {
      const row = await this.db
         .selectFrom("payroll_cycle_employees")
         .select("seguro")
         .where("cycle_id", "=", cycleId)
         .where("empleado_id", "=", empleadoId)
         .executeTakeFirst();
      return row ? num(row.seguro) : null;
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
