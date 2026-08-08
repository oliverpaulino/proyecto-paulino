import { Kysely } from "kysely";
import type { DB } from "@/backend/database";
import type {
   IProyectoRepository,
   ProyectoProps,
   ProyectoDetalleProps,
   ProyectoTotales,
   LiquidacionFacade,
   CreateProyectoDTO,
   UpdateProyectoDTO,
} from "../domain/proyecto.domain";
import { ConduceProps } from "../../conduce/domain/conduce.domain";

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
            "proyecto.rentabilidad",
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
            "proyecto.rentabilidad",
            "proyecto.notas",
            "proyecto.fecha_inicio",
            "proyecto.fecha_fin",
            "proyecto.created_at",
            "proyecto.updated_at",
         ])
         .where("proyecto.id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      const detalle = await this.db
         .selectFrom("proyecto_detalle")
         .selectAll()
         .where("proyecto_id", "=", id)
         .execute();

      // conduces se deja en [] aquí a propósito: ProyectoService.getById()
      // lo combina llamando a ConduceRepository.findByProyectoId(), para no
      // duplicar el mapeo de dos subtipos (CAMION/EQUIPO_PESADO) en dos sitios.
      return this.#mapRow(row, detalle, []);
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
            "proyecto.rentabilidad",
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

   // ── Creación: SOLO cabecera + cargos/gastos manuales. El equipo ya no se ──
   // ── registra aquí: se agrega después vía conduces (ver conduce.service). ──
   async create(data: CreateProyectoDTO): Promise<ProyectoProps> {
      const header = await this.db.transaction().execute(async (trx) => {
         const inserted = await trx
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

         const itemsCobrables = data.cargos_cobrables.map((c) => ({
            proyecto_id: inserted.id,
            descripcion: c.descripcion,
            cantidad: c.cantidad,
            precio_unitario: c.precio_unitario,
            subtotal: c.cantidad * c.precio_unitario,
            es_cobrable: true,
         }));
         const itemsInternos = data.gastos_internos.map((g) => ({
            proyecto_id: inserted.id,
            descripcion: g.descripcion,
            cantidad: g.cantidad,
            precio_unitario: g.precio_unitario,
            subtotal: g.cantidad * g.precio_unitario,
            es_cobrable: false,
         }));
         const allItems = [...itemsCobrables, ...itemsInternos];

         if (allItems.length > 0) {
            await trx.insertInto("proyecto_detalle").values(allItems).execute();
         }

         return inserted;
      });

      // Los totales (tarifa_servicio + cargos - gastos) se calculan con la
      // misma rutina que usan los conduces, para no duplicar la fórmula.
      await this.recalcularTotales(header.id);

      const proyecto = await this.findById(header.id);
      return proyecto!;
   }

   async update(id: string, data: UpdateProyectoDTO): Promise<ProyectoProps | null> {
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
      safeData.updated_at = new Date();

      await this.db
         .updateTable("proyecto")
         .set(safeData)
         .where("id", "=", id)
         .execute();

      await this.recalcularTotales(id);
      return this.findById(id);
   }

   async getLiquidacion(id: string): Promise<LiquidacionFacade | null> {
      const proyecto = await this.findById(id);
      if (!proyecto) return null;

      return {
         nombre: proyecto.nombre,
         proyecto_id: id,
         cliente_nombre: proyecto.cliente_nombre ?? "",
         tarifa_servicio: proyecto.tarifa_servicio,
         cargos_cobrables: proyecto.detalle.filter((d) => d.es_cobrable),
         gastos_internos: proyecto.detalle.filter((d) => !d.es_cobrable),
         conduces: proyecto.conduces,
         total_cobrable: Number(proyecto.total_cobrable),
         total_gasto_interno: Number(proyecto.total_gasto_interno),
         rentabilidad: Number(proyecto.rentabilidad),
         fecha: proyecto.fecha_inicio,
      };
   }

   // ── NUEVO: recalcula total_cobrable / total_gasto_interno / total_equipos / ──
   // ── rentabilidad a partir de proyecto_detalle + conduce, y los persiste.  ──
   // ── Lo llama ConduceService después de crear/editar/borrar un conduce.    ──
   async recalcularTotales(proyectoId: string): Promise<ProyectoTotales> {
      const [proyecto, detalle, conduces] = await Promise.all([
         this.db
            .selectFrom("proyecto")
            .select(["tarifa_servicio"])
            .where("id", "=", proyectoId)
            .executeTakeFirst(),
         this.db
            .selectFrom("proyecto_detalle")
            .select(["subtotal", "es_cobrable"])
            .where("proyecto_id", "=", proyectoId)
            .execute(),
         this.db
            .selectFrom("conduce")
            .select(["subtotal", "es_cobrable"])
            .where("proyecto_id", "=", proyectoId)
            .execute(),
      ]);

      const tarifaServicio = Number(proyecto?.tarifa_servicio ?? 0);

      const totalEquiposCobrables = conduces
         .filter((c) => c.es_cobrable)
         .reduce((sum, c) => sum + Number(c.subtotal), 0);
      const totalEquiposInternos = conduces
         .filter((c) => !c.es_cobrable)
         .reduce((sum, c) => sum + Number(c.subtotal), 0);

      const totalCargosCobrables = detalle
         .filter((d) => d.es_cobrable)
         .reduce((sum, d) => sum + Number(d.subtotal), 0);
      const totalGastosInternosDetalle = detalle
         .filter((d) => !d.es_cobrable)
         .reduce((sum, d) => sum + Number(d.subtotal), 0);

      const total_equipos = totalEquiposCobrables + totalEquiposInternos;
      const total_cobrable = tarifaServicio + totalEquiposCobrables + totalCargosCobrables;
      const total_gasto_interno = totalEquiposInternos + totalGastosInternosDetalle;
      const rentabilidad = total_cobrable - total_gasto_interno;

      await this.db
         .updateTable("proyecto")
         .set({
            total_cobrable,
            total_gasto_interno,
            total_equipos,
            rentabilidad,
            updated_at: new Date(),
         })
         .where("id", "=", proyectoId)
         .execute();

      return { total_cobrable, total_gasto_interno, total_equipos, rentabilidad };
   }

   async toggleDetalleCobrable(ids: string[], es_cobrable: boolean): Promise<void> {
      if (ids.length === 0) return;

      await this.db
         .updateTable("proyecto_detalle")
         .set({ es_cobrable, updated_at: new Date() })
         .where("id", "in", ids)
         .execute();

      // Recalcular totales del proyecto al que pertenece el primer ítem
      const first = await this.db
         .selectFrom("proyecto_detalle")
         .select("proyecto_id")
         .where("id", "=", ids[0])
         .executeTakeFirst();

      if (first) {
         await this.recalcularTotales(first.proyecto_id);
      }
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
   #mapRow(
      row: Record<string, unknown>,
      detalle: Array<Record<string, unknown>>,
      conduces: ConduceProps[] = []
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
         rentabilidad: Number(row.rentabilidad),
         notas: (row.notas as string) ?? null,
         fecha_inicio: new Date(row.fecha_inicio as string),
         fecha_fin: row.fecha_fin ? new Date(row.fecha_fin as string) : null,
         created_at: new Date(row.created_at as string),
         updated_at: new Date(row.updated_at as string),
         detalle: mappedDetalle,
         conduces,
      };


      return { ...base };
   }
}