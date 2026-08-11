import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";
import type {
   IProyectoRepository,
   ProyectoProps,
   ProyectoDetalleProps,
   ProyectoEstadoHistorialProps,
   ProyectoTotales,
   LiquidacionFacade,
   CreateProyectoDTO,
   UpdateProyectoDTO,
   EstadoProyecto,
} from "../domain/proyecto.domain";
import { ConduceProps } from "../../conduce/domain/conduce.domain";
import { GastoProps } from "../../gastos/domain/gastos.domain";

const num = (v: unknown): number => Number(v ?? 0) || 0;

const ESTADOS_VALIDOS = new Set(["BORRADOR", "COMPLETADO", "EN PROGRESO", "CANCELADO"]);

export class KyselyProyectoRepository implements IProyectoRepository {

   constructor(private readonly db: Kysely<DB>) { }

   // Mismo formato que cliente (CLI-001), gasto (GAS-001), equipo (EQU-001):
   // el entero vive en la columna `referencia` y el código se arma aquí, para
   // poder cambiar el formato sin migrar datos.
   private buildCodigoReferencia(referencia: number): string {
      const ref = String(referencia).padStart(3, "0");
      return `PRO-${ref}`;
   }

   // Acepta "PRO-007", "pro-7" o "7" y devuelve el entero a buscar.
   // Devuelve null para todo lo que no sea un número completo — incluido el
   // "PRO-" a medio teclear, que si no se colaba como `referencia = 0` y
   // escondía la lista entera mientras el usuario seguía escribiendo.
   private safeParseReferencia(search: string): number | null {
      const text = search.trim().toUpperCase();
      const digits = text.startsWith("PRO-") ? text.slice(4) : text;

      if (!/^\d+$/.test(digits)) return null;

      return Number(digits);
   }

   async findAll(search?: string, pagination?: { page: number, limit: number }): Promise<ProyectoProps[]> {
      let query = this.db
         .selectFrom("proyecto")
         .leftJoin("cliente", "cliente.id", "proyecto.cliente_id")
         .select([
            "proyecto.id",
            "proyecto.referencia",
            "proyecto.estado",
            "proyecto.cliente_id",
            "proyecto.nombre",
            "cliente.nombre as cliente_nombre",
            "proyecto.tarifa_servicio",
            "proyecto.total_cobrable",
            "proyecto.total_gasto_interno",
            "proyecto.total_equipos",
            "proyecto.total_costo_operador",
            "proyecto.rentabilidad",
            "proyecto.porcentaje_avance",
            "proyecto.notas",
            "proyecto.fecha_inicio",
            "proyecto.fecha_fin",
            "proyecto.created_at",
            "proyecto.updated_at",
         ])
         .orderBy("proyecto.created_at", "desc");


      if (search) {
         query = this.#applySearch(query, search);
      }

      if (pagination) {
         const { page, limit } = pagination;
         query = query.offset((page - 1) * limit).limit(limit);
      }

      const rows = await query.execute();
      // El historial no necesita el detalle línea por línea, solo los totales
      // ya cacheados en la fila (incluyendo total_equipos, que antes NUNCA se
      // llenaba porque acá se pasaba `[]` fijo — ese era el bug de la tabla).
      return rows.map((r) => this.#mapRow(r, [], []));
   }

   async findById(id: string): Promise<ProyectoProps | null> {
      const row = await this.db
         .selectFrom("proyecto")
         .leftJoin("cliente", "cliente.id", "proyecto.cliente_id")
         .select([
            "proyecto.id",
            "proyecto.referencia",
            "proyecto.estado",
            "proyecto.cliente_id",
            "proyecto.nombre",
            "cliente.nombre as cliente_nombre",
            "proyecto.tarifa_servicio",
            "proyecto.total_cobrable",
            "proyecto.total_gasto_interno",
            "proyecto.total_equipos",
            "proyecto.total_costo_operador",
            "proyecto.rentabilidad",
            "proyecto.porcentaje_avance",
            "proyecto.notas",
            "proyecto.fecha_inicio",
            "proyecto.fecha_fin",
            "proyecto.created_at",
            "proyecto.updated_at",
         ])
         .where("proyecto.id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      // Historial de cambios de estado, más reciente primero. Se usa para
      // mostrar el último movimiento en la vista de configuración.
      const historial = await this.db
         .selectFrom("proyecto_estado_historial")
         .selectAll()
         .where("proyecto_id", "=", id)
         .orderBy("created_at", "desc")
         .execute();

      const detalle = await this.db
         .selectFrom("proyecto_detalle")
         .selectAll()
         .where("proyecto_id", "=", id)
         .execute();

      const gastos = await this.db
         .selectFrom("gasto")
         .innerJoin("categoria_gasto", "categoria_gasto.id", "gasto.categoria_gasto_id")
         .leftJoin("proyecto", "proyecto.id", "gasto.proyecto_id")
         .leftJoin("equipo", "equipo.id", "gasto.equipo_id")
         .leftJoin("orden_compra", "orden_compra.id", "gasto.orden_compra_id")
         .selectAll("gasto")
         .select([
            "categoria_gasto.nombre as categoria_gasto_nombre",
            "categoria_gasto.grupo as categoria_gasto_grupo",
            "proyecto.referencia as proyecto_codigo_referencia",
            "equipo.referencia as equipo_codigo_referencia",
            "orden_compra.referencia as orden_compra_codigo_referencia",
         ])
         .where("gasto.proyecto_id", "=", id)
         .where("gasto.deleted_at", "is", null)
         .orderBy("gasto.fecha", "desc")
         .execute();

      // conduces se deja en [] aquí a propósito: ProyectoService.getById()
      // lo combina llamando a ConduceRepository.findByProyectoId(), para no
      // duplicar el mapeo de dos subtipos (CAMION/EQUIPO_PESADO) en dos sitios.
      return {
         ...this.#mapRow(row, detalle, [], historial),
         gastos: gastos.map((g) => this.#mapGasto(g)),
      };
   }

   async findByClientId(clienteId: string, search?: string, pagination?: { page: number, limit: number }): Promise<ProyectoProps[]> {
      let query = this.db
         .selectFrom("proyecto")
         .leftJoin("cliente", "cliente.id", "proyecto.cliente_id")
         .select([
            "proyecto.id",
            "proyecto.referencia",
            "proyecto.estado",
            "proyecto.cliente_id",
            "proyecto.nombre",
            "cliente.nombre as cliente_nombre",
            "proyecto.tarifa_servicio",
            "proyecto.total_cobrable",
            "proyecto.total_gasto_interno",
            "proyecto.total_equipos",
            "proyecto.total_costo_operador",
            "proyecto.rentabilidad",
            "proyecto.porcentaje_avance",
            "proyecto.notas",
            "proyecto.fecha_inicio",
            "proyecto.fecha_fin",
            "proyecto.created_at",
            "proyecto.updated_at",
         ])
         .where("proyecto.cliente_id", "=", clienteId)
         .orderBy("proyecto.created_at", "desc")
      if (search) {
         query = this.#applySearch(query, search);
      }
      if (pagination) {
         const { page, limit } = pagination;
         query = query.offset((page - 1) * limit).limit(limit);
      }

      const rows = await query.execute();

      return rows.map((r) => this.#mapRow(r, [], []));
   }

   // ── Creación: SOLO cabecera. El equipo y los cargos/cobrables se agregan ──
   // ── después vía conduces y gastos (ver conduce.service / gastos.service). ──
   async create(data: CreateProyectoDTO): Promise<ProyectoProps> {
      const inserted = await this.db
         .insertInto("proyecto")
         .values({
            nombre: data.nombre,
            estado: "BORRADOR", // antes era COMPLETADO fijo; ahora el proyecto vive en el tiempo mientras se agregan conduces
            cliente_id: data.cliente_id,
            tarifa_servicio: data.tarifa_servicio ?? 0,
            notas: data.notas ?? null,
            fecha_inicio: data.fecha_inicio ?? new Date(),
            fecha_fin: null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      // Los totales (tarifa_servicio + cobrables - gastos) se calculan con la
      // misma rutina que usan los conduces, para no duplicar la fórmula.
      await this.recalcularTotales(inserted.id);

      const proyecto = await this.findById(inserted.id);
      return proyecto!;
   }

   async update(id: string, data: UpdateProyectoDTO): Promise<ProyectoProps | null> {
      // Si el estado va a cambiar hay que anotarlo en el historial (quién y
      // cuándo). Se lee ANTES de escribir, dentro de la misma transacción,
      // para que un DELETE/UPDATE concurrente no deje la bitácora a medias.
      const result = await this.db.transaction().execute(async (trx) => {
         const anterior = await trx
            .selectFrom("proyecto")
            .select(["estado", "porcentaje_avance"])
            .where("id", "=", id)
            .executeTakeFirst();

         if (!anterior) return null;

         const estadoNuevo = data.estado ?? anterior.estado;
         const estadoCambia = estadoNuevo !== anterior.estado;

         // Un proyecto COMPLETADO está cerrado; su avance es 100 y no debería
         // poder bajar. Se fuerza aquí para que la UI no pueda escribir un
         // porcentaje inconsistente aunque la política de bloqueo falle.
         const porcentaje =
            data.porcentaje_avance !== undefined
               ? Math.min(100, Math.max(0, Math.round(data.porcentaje_avance)))
               : estadoNuevo === "COMPLETADO"
                  ? 100
                  : anterior.porcentaje_avance;

         const safeData: Record<string, unknown> = {};
         if (data.nombre !== undefined) safeData.nombre = data.nombre;
         if (data.estado !== undefined) safeData.estado = data.estado;
         if (data.tarifa_servicio !== undefined) safeData.tarifa_servicio = data.tarifa_servicio;
         if (data.notas !== undefined) safeData.notas = data.notas;
         if (data.fecha_fin !== undefined) safeData.fecha_fin = data.fecha_fin;
         // fecha_inicio llega como "YYYY-MM-DD" (input date). Se guarda tal cual,
         // sin pasar por new Date(), para que Postgres no convierta según la zona
         // horaria del servidor y corra la fecha un día.
         if (data.fecha_inicio !== undefined) safeData.fecha_inicio = data.fecha_inicio;
         if (data.cliente_id !== undefined) safeData.cliente_id = data.cliente_id;
         if (porcentaje !== anterior.porcentaje_avance) safeData.porcentaje_avance = porcentaje;
         safeData.updated_at = new Date();

         const updated = await trx
            .updateTable("proyecto")
            .set(safeData)
            .where("id", "=", id)
            .returning(["id"])
            .executeTakeFirst();

         if (estadoCambia && updated) {
            await trx
               .insertInto("proyecto_estado_historial")
               .values({
                  proyecto_id: id,
                  estado_anterior: anterior.estado,
                  estado_nuevo: estadoNuevo,
                  changed_by: data.changed_by ?? null,
                  changed_by_name: data.changed_by_name ?? null,
               })
               .execute();
         }

         return updated;
      });

      if (!result) return null;

      await this.recalcularTotales(id);
      return this.findById(id);
   }

   // Estado actual, ligero: lo usan los guards para bloquear mutaciones
   // (conduces, gastos, archivos, tarifas) cuando el proyecto está COMPLETADO.
   async getEstado(id: string): Promise<EstadoProyecto | null> {
      const row = await this.db
         .selectFrom("proyecto")
         .select("estado")
         .where("id", "=", id)
         .executeTakeFirst();

      return (row?.estado as EstadoProyecto) ?? null;
   }

   async getLiquidacion(id: string): Promise<LiquidacionFacade | null> {
      const proyecto = await this.findById(id);
      if (!proyecto) return null;

      return {
         nombre: proyecto.nombre,
         proyecto_id: id,
         cliente_nombre: proyecto.cliente_nombre ?? "",
         tarifa_servicio: proyecto.tarifa_servicio,
         gastos_cobrables: proyecto.gastos.filter((g) => g.cobrable_proyecto),
         gastos_incobrables: proyecto.gastos.filter((g) => !g.cobrable_proyecto),
         conduces: proyecto.conduces,
         total_cobrable: Number(proyecto.total_cobrable),
         total_gasto_interno: Number(proyecto.total_gasto_interno),
         total_costo_operador: Number(proyecto.total_costo_operador),
         rentabilidad: Number(proyecto.rentabilidad),
         porcentaje_avance: Number(proyecto.porcentaje_avance),
         fecha: proyecto.fecha_inicio,
      };
   }

   // ── Recalcula los totales cacheados a partir de proyecto_detalle + ────────
   // ── conduce, y los persiste. Lo llama ConduceService después de crear/  ────
   // ── editar/borrar. Las fórmulas (consensuadas con el cliente):           ──
   // ──   total_cobrable = tarifaServicio + Σ subtotal conduces cobrables    ──
   // ──                     + Σ subtotal detalle (cargos cobrables)          ──
   // ──   total_costo_operador = Σ cantidad × monto_pago (TODOS los conduces)──
   // ──   total_gasto_interno = Σ subtotal conduces no cobrables             ──
   // ──                     + Σ subtotal detalle (gastos internos)           ──
   // ──   total_equipos = Σ subtotal (TODOS los conduces, para el historial) ──
   // ──   rentabilidad = total_cobrable − total_gasto_interno                ──

   // ── Recalcula total_cobrable / total_gasto_interno / total_equipos / ─────
   // ── rentabilidad a partir de tarifa + conduces + gastos, y los persiste. ──
   // ── Lo llama ConduceService y GastoService tras cada mutación.            ──
   async recalcularTotales(proyectoId: string): Promise<ProyectoTotales> {
      const [proyecto, conduces, gastos] = await Promise.all([
         this.db
            .selectFrom("proyecto")
            .select(["tarifa_servicio"])
            .where("id", "=", proyectoId)
            .executeTakeFirst(),
         this.db.selectFrom("conduce").leftJoin("operador", "operador.id", "conduce.operador_id").leftJoin("equipo", "equipo.id", "conduce.equipo_id").leftJoin("operador as eq_op", "eq_op.id", "equipo.operador_id").select(["conduce.subtotal", "conduce.es_cobrable", "conduce.cantidad", "conduce.total_horas", "conduce.categoria_equipo_tarifa_id", "conduce.categoria_equipo_tarifa_nombre", "conduce.empleado_id", sql<string>` coalesce( conduce.empleado_id, operador.empleado_id, eq_op.empleado_id ) `.as("empleado_id_efectivo"),]).where("conduce.proyecto_id", "=", proyectoId).where("conduce.deleted_at", "is", null).execute(),
         this.db
            .selectFrom("gasto")
            .select(["monto_total", "cobrable_proyecto", "cobrable_monto"])
            .where("proyecto_id", "=", proyectoId)
            .where("deleted_at", "is", null)
            .execute(),
      ]);

      // Costo del operador por conduce: misma lógica que la nómina y que
      // rentabilidad.service.ts. Prioridad del monto_pago:
      //   1. proyecto_empleado_tarifa (proyecto + empleado + tarifa)
      //   2. empleado_categoria_tarifa (empleado + tarifa)
      //   3. catálogo por NOMBRE único si el conduce perdió el id de la tarifa
      const empleados = [...new Set(conduces.map((c) => c.empleado_id_efectivo).filter(Boolean))];

      const [tarifasEmpleadoRows, tarifasProyectoRows, catalogoTarifasRows] = await Promise.all([
         empleados.length > 0
            ? this.db
               .selectFrom("empleado_categoria_tarifa")
               .select(["empleado_id", "categoria_equipo_tarifa_id", "monto_pago"])
               .where("empleado_id", "in", empleados)
               .execute()
            : Promise.resolve([]),
         empleados.length > 0
            ? this.db
               .selectFrom("proyecto_empleado_tarifa")
               .select(["proyecto_id", "empleado_id", "categoria_equipo_tarifa_id", "monto_pago"])
               .where("proyecto_id", "=", proyectoId)
               .where("empleado_id", "in", empleados)
               .execute()
            : Promise.resolve([]),
         this.db.selectFrom("categoria_equipo_tarifa").select(["id", "nombre"]).execute(),
      ]);

      const montoPorEmpleadoTarifa = new Map<string, number>();
      for (const t of tarifasEmpleadoRows) {
         montoPorEmpleadoTarifa.set(`${t.empleado_id}::${t.categoria_equipo_tarifa_id}`, num(t.monto_pago));
      }

      const montoPorProyectoEmpleadoTarifa = new Map<string, number>();
      for (const t of tarifasProyectoRows) {
         montoPorProyectoEmpleadoTarifa.set(
            `${t.proyecto_id}::${t.empleado_id}::${t.categoria_equipo_tarifa_id}`,
            num(t.monto_pago)
         );
      }

      // Tarifa por nombre único: si el conduce guardó el nombre pero el id se
      // perdió (conduces viejos), se recupera el id solo cuando el nombre no
      // es ambiguo — mismo criterio que rentabilidad.service.ts.
      const nombres = new Map<string, string[]>();
      for (const t of catalogoTarifasRows) {
         const k = (t.nombre ?? "").trim().toLowerCase();
         nombres.set(k, [...(nombres.get(k) ?? []), t.id]);
      }
      const tarifaIdPorNombreUnico = new Map<string, string>();
      for (const [nombre, ids] of nombres) {
         if (ids.length === 1) tarifaIdPorNombreUnico.set(nombre, ids[0]);
      }

      let totalCostoOperador = 0;
      for (const c of conduces) {
         const tarifaId =
            c.categoria_equipo_tarifa_id ??
            tarifaIdPorNombreUnico.get((c.categoria_equipo_tarifa_nombre ?? "").trim().toLowerCase()) ??
            null;

         const montoPago =
            c.empleado_id_efectivo && tarifaId
               ? montoPorProyectoEmpleadoTarifa.get(`${proyectoId}::${c.empleado_id_efectivo}::${tarifaId}`) ??
               montoPorEmpleadoTarifa.get(`${c.empleado_id_efectivo}::${tarifaId}`) ??
               0
               : 0;

         const cantidad = num(c.cantidad) || num(c.total_horas);
         totalCostoOperador += cantidad * montoPago;
      }

      const totalEquiposCobrables = conduces
         .filter((c) => c.es_cobrable)
         .reduce((sum, c) => sum + Number(c.subtotal), 0);
      const totalEquiposInternos = conduces
         .filter((c) => !c.es_cobrable)
         .reduce((sum, c) => sum + Number(c.subtotal), 0);

      // Gastos asociados al proyecto: los cobrables suman su monto a cobrar al
      // cliente (cobrable_monto, o el total del gasto si no hay monto definido),
      // los incobrables corren por cuenta de la empresa.
      const totalGastosCobrables = gastos
         .filter((g) => g.cobrable_proyecto)
         .reduce((sum, g) => sum + Number(g.cobrable_monto || g.monto_total), 0);
      const totalGastosInternos = gastos
         .filter((g) => !g.cobrable_proyecto)
         .reduce((sum, g) => sum + Number(g.monto_total), 0);

      const tarifaServicio = Number(proyecto?.tarifa_servicio ?? 0);

      const total_equipos = totalEquiposCobrables + totalEquiposInternos;
      const total_costo_operador = totalCostoOperador;
      const total_cobrable =
         tarifaServicio + totalEquiposCobrables + totalGastosCobrables;
      const total_gasto_interno =
         totalEquiposInternos + totalGastosInternos;
      const rentabilidad = total_cobrable - total_gasto_interno;

      await this.db
         .updateTable("proyecto")
         .set({
            total_cobrable,
            total_gasto_interno,
            total_equipos,
            total_costo_operador,
            rentabilidad,
            updated_at: new Date(),
         })
         .where("id", "=", proyectoId)
         .execute();

      return { total_cobrable, total_gasto_interno, total_equipos, total_costo_operador, rentabilidad };
   }

   // ─── Mapper privado ────────────────────────────────────────────────────────
   // ─── Búsqueda: por nombre o por código de referencia ───────────────────────
   // Sin esto, teclear "PRO-007" en el buscador no encontraba nada, que es
   // justo lo que la gente va a intentar ahora que el código se muestra.
   #applySearch<Q extends { where: any }>(query: Q, search: string): Q {
      const searchLike = `%${search.trim()}%`;
      const refNumber = this.safeParseReferencia(search);

      return query.where((eb: any) => {
         const conditions = [eb("proyecto.nombre", "ilike", searchLike)];

         if (refNumber !== null) {
            conditions.push(
               eb(eb.cast("proyecto.referencia", "text"), "=", String(refNumber))
            );
         }

         return eb.or(conditions);
      });
   }

   // ─── Mapper privado ────────────────────────────────────────────────────────
   // El historial (findAll/findByClientId) no necesita los gastos línea por
   // línea, solo los totales ya cacheados en la fila. findById sí los carga.
   #mapRow(
      row: Record<string, unknown>,
      detalle: Array<Record<string, unknown>> = [],
      conduces: ConduceProps[] = [],
      historial: Array<Record<string, unknown>> = [],
      gastos: GastoProps[] = [],
   ): ProyectoProps {

      const mappedDetalle: ProyectoDetalleProps[] = detalle.map((d) => ({
         id: d.id as string,
         proyecto_id: d.proyecto_id as string,
         descripcion: d.descripcion as string,
         cantidad: Number(d.cantidad),
         precio_unitario: Number(d.precio_unitario),
         subtotal: Number(d.subtotal),
         es_cobrable: d.es_cobrable as boolean,
         created_at: new Date(d.created_at as string),
         updated_at: new Date(d.updated_at as string),
      }));

      const mappedHistorial: ProyectoEstadoHistorialProps[] = historial.map((h) => ({
         id: h.id as string,
         proyecto_id: h.proyecto_id as string,
         estado_anterior: (h.estado_anterior as string | null) as EstadoProyecto | null,
         estado_nuevo: h.estado_nuevo as EstadoProyecto,
         changed_by: (h.changed_by as string) ?? null,
         changed_by_name: (h.changed_by_name as string) ?? null,
         created_at: new Date(h.created_at as string),
      }));


      const base = {
         id: row.id as string,
         codigoReferencia: this.buildCodigoReferencia(Number(row.referencia)),
         estado: row.estado as ProyectoProps["estado"],
         cliente_id: row.cliente_id as string,
         tarifa_servicio: Number(row.tarifa_servicio),
         nombre: row.nombre as string,
         cliente_nombre: (row.cliente_nombre as string) ?? undefined,
         total_cobrable: Number(row.total_cobrable),
         total_gasto_interno: Number(row.total_gasto_interno),
         total_equipos: Number(row.total_equipos ?? 0),
         total_costo_operador: Number(row.total_costo_operador ?? 0),
         rentabilidad: Number(row.rentabilidad),
         porcentaje_avance: Number(row.porcentaje_avance ?? 0),
         notas: (row.notas as string) ?? null,
         fecha_inicio: new Date(row.fecha_inicio as string),
         fecha_fin: row.fecha_fin ? new Date(row.fecha_fin as string) : null,
         created_at: new Date(row.created_at as string),
         updated_at: new Date(row.updated_at as string),
         gastos,
         conduces,
         historial_estados: mappedHistorial,
      };

      return { ...base };
   }

   // ─── Mapper de gasto → GastoProps (para findById/getLiquidacion) ──────────
   // No duplica el de gastos.infraestructure: acá solo se usan los campos que
   // el detalle del proyecto necesita (concepto, montos, categoría, cantidad).
   #mapGasto(row: Record<string, unknown>): GastoProps {
      const referencia = Number(row.referencia);
      const codigoReferencia = `GAS-${String(referencia).padStart(3, "0")}`;
      const codigo = (prefix: string, ref: unknown) =>
         ref != null ? `${prefix}-${String(ref).padStart(3, "0")}` : null;

      return {
         id: row.id as string,
         referencia,
         codigoReferencia,
         monto_total: Number(row.monto_total),
         concepto: row.concepto as string,
         ncf: (row.ncf as string) ?? null,
         categoria_gasto_id: row.categoria_gasto_id as string,
         categoria_gasto_nombre: row.categoria_gasto_nombre as string,
         categoria_gasto_grupo: row.categoria_gasto_grupo as string,
         orden_compra_id: (row.orden_compra_id as string) ?? null,
         orden_compra_codigo_referencia: codigo("OC", row.orden_compra_codigo_referencia),
         proyecto_id: (row.proyecto_id as string) ?? null,
         proyecto_codigo_referencia: codigo("PRO", row.proyecto_codigo_referencia),
         equipo_id: (row.equipo_id as string) ?? null,
         equipo_codigo_referencia: codigo("EQU", row.equipo_codigo_referencia),
         cobrable_proyecto: row.cobrable_proyecto as boolean,
         cobrable_monto: row.cobrable_monto != null ? Number(row.cobrable_monto) : null,
         cantidad: row.cantidad != null ? Number(row.cantidad) : 1,
         monto_unitario: row.monto_unitario != null ? Number(row.monto_unitario) : null,
         fecha: new Date(row.fecha as string),
         created_at: new Date(row.created_at as string),
         updated_at: new Date(row.updated_at as string),
         deleted_by: (row.deleted_by as string) ?? null,
         deleted_at: row.deleted_at ? new Date(row.deleted_at as string) : null,
         deleted_reason: (row.deleted_reason as string) ?? null,
      };
   }
}