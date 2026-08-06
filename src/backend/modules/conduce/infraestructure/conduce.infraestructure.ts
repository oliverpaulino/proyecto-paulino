import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";
import type {
   IConduceRepository,
   CreateConduceDTO,
   UpdateConduceDTO,
   ConduceProps,
   ConduceFiltros,
   ConduceListResult,
} from "../domain/conduce.domain";

const SELECT_COLUMNS = [
   "conduce.id",
   "conduce.tipo_conduce",
   "conduce.numero_referencia",
   "conduce.fecha",
   "conduce.proyecto_id",
   "proyecto.nombre as proyecto_nombre",
   "conduce.cliente_id",
   "cliente.nombre as cliente_nombre",
   "conduce.cliente_telefono",
   "conduce.equipo_id",
   "equipo.nombre as equipo_nombre",
   // Persona que operó el equipo. Hay dos columnas y ambas son nullable;
   // el empleado real se resuelve con COALESCE (ver `empleado_efectivo_id`
   // más abajo y la nota en database.ts).
   "conduce.empleado_id",
   "conduce.operador_id",
   "empleado.nombre as operador_nombre",
   "conduce.categoria_equipo_id",
   "categoria_equipo.nombre as categoria_equipo_nombre",
   // Snapshots — NO dependen de un join vivo a categoria_equipo_tarifa
   // (esa tabla se regenera en cada edición de categoría, ver database.ts).
   "conduce.categoria_equipo_tarifa_id",
   "conduce.categoria_equipo_tarifa_nombre",
   "conduce.medida_cobro_nombre",
   "conduce.es_cobrable",
   "conduce.observaciones",
   "conduce.precio_unitario",
   "conduce.subtotal",
   "conduce.created_by",
   "conduce.created_by_name",
   "conduce.created_at",
   "conduce.updated_at",
   "conduce.deleted_by",
   "conduce.deleted_by_name",
   "conduce.deleted_at",
   "conduce.deleted_reason",
   // CAMION
   "conduce.procedencia",
   "conduce.destino",
   "conduce.cantidad",
   "conduce.firma_chofer",
   "conduce.firma_recibido",
   // EQUIPO_PESADO
   "conduce.horario_manana_inicio",
   "conduce.horario_manana_fin",
   "conduce.horario_tarde_inicio",
   "conduce.horario_tarde_fin",
   "conduce.total_horas",
   "conduce.combustible_pagado_cliente",
   "conduce.firma_observante",
   "conduce.firma_camionero",
] as const;

/**
 * Suma un día a un string "YYYY-MM-DD" y devuelve otro string "YYYY-MM-DD".
 * Se usa para volver el filtro "hasta" exclusivo del día SIGUIENTE
 * (`fecha < hasta+1`) en vez de `fecha <= hasta`, así no se pierden
 * registros del último día si la columna llegara a tener componente de hora.
 * Se construye a mano con Date.UTC (sin pasar por parsing de string con
 * timezone) para no reintroducir el bug de corrimiento de día.
 */
function siguienteDiaISO(fechaISO: string): string {
   const [y, m, d] = fechaISO.split("-").map(Number);
   const utc = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
   utc.setUTCDate(utc.getUTCDate() + 1);
   return utc.toISOString().slice(0, 10);
}

export class KyselyConduceRepository implements IConduceRepository {
   constructor(private readonly db: Kysely<DB>) { }

   #baseQuery() {
      return this.db
         .selectFrom("conduce")
         .leftJoin("proyecto", "proyecto.id", "conduce.proyecto_id")
         .leftJoin("cliente", "cliente.id", "conduce.cliente_id")
         .leftJoin("equipo", "equipo.id", "conduce.equipo_id")
         .leftJoin("operador", "operador.id", "conduce.operador_id")
         // Tercer nivel: el operador asignado al equipo. Es el mismo camino que
         // usa la nómina para inferir la persona cuando el conduce no trae
         // ninguna. Sin este join, la lista mostraba MENOS conduces de los que
         // la nómina paga y el enlace "N conduces" no cuadraba con la tabla.
         .leftJoin("operador as eq_op", "eq_op.id", "equipo.operador_id")
         // Puente para mostrar el nombre de la persona que operó el equipo.
         // El empleado puede venir por TRES caminos (todas las columnas son
         // nullable):
         //   - `conduce.empleado_id` directo
         //   - `conduce.operador_id` → `operador.empleado_id`
         //   - `equipo.operador_id` → `eq_op.empleado_id`  (inferido)
         // Se une por COALESCE para no perder el nombre en ninguno de los tres.
         .leftJoin("empleado", (join) =>
            join.onRef(
               "empleado.id",
               "=",
               sql<string>`coalesce(${sql.ref("conduce.empleado_id")}, ${sql.ref("operador.empleado_id")}, ${sql.ref("eq_op.empleado_id")})` as any
            )
         )
         .leftJoin("categoria_equipo", "categoria_equipo.id", "conduce.categoria_equipo_id")
         .select(SELECT_COLUMNS);
   }

   async findAll(filtros: ConduceFiltros): Promise<ConduceListResult> {
      const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
      const pageSize = filtros.pageSize && filtros.pageSize > 0 ? filtros.pageSize : 25;

      const aplicarFiltros = <T extends { where: any; $if: any }>(qb: T): T =>
         qb
            .$if(!!filtros.proyecto_id, (q: any) => q.where("conduce.proyecto_id", "=", filtros.proyecto_id))
            .$if(!!filtros.cliente_id, (q: any) => q.where("conduce.cliente_id", "=", filtros.cliente_id))
            .$if(!!filtros.equipo_id, (q: any) => q.where("conduce.equipo_id", "=", filtros.equipo_id))

            /*
               El empleado se resuelve por los MISMOS tres niveles que usa la
               nómina (ver `listConducesDelPeriodo`):
                 1. `conduce.empleado_id` directo
                 2. `conduce.operador_id` → `operador.empleado_id`
                 3. `equipo.operador_id`  → `eq_op.empleado_id`  (inferido)

               El tercero faltaba, y por eso el enlace "N conduces" de la nómina
               llevaba a una lista más corta que el número mostrado: la nómina
               paga los conduces inferidos, la lista no los enseñaba. Los dos
               conteos tienen que salir de la misma regla o nunca cuadran.
            */
            .$if(!!filtros.empleado_id, (q: any) =>
               q.where((eb: any) =>
                  eb.or([
                     eb("conduce.empleado_id", "=", filtros.empleado_id),
                     eb("operador.empleado_id", "=", filtros.empleado_id),
                     eb.and([
                        eb("conduce.empleado_id", "is", null),
                        eb("operador.empleado_id", "is", null),
                        eb("eq_op.empleado_id", "=", filtros.empleado_id),
                     ]),
                  ])
               )
            )

            .$if(!!filtros.tipo_conduce, (q: any) => q.where("conduce.tipo_conduce", "=", filtros.tipo_conduce))
            .$if(filtros.es_cobrable !== undefined, (q: any) => q.where("conduce.es_cobrable", "=", filtros.es_cobrable))
            .$if(!!filtros.categoria_equipo_tarifa_nombre, (q: any) =>
               q.where("conduce.categoria_equipo_tarifa_nombre", "=", filtros.categoria_equipo_tarifa_nombre)
            )
            .$if(filtros.categoria_equipo_tarifa_null === true, (q: any) =>
               q.where("conduce.categoria_equipo_tarifa_nombre", "is", null)
            )
            // ── Fechas ──────────────────────────────────────────────────
            // Antes esto llegaba como `new Date(q.fecha_desde)` desde la ruta
            // y Kysely lo mandaba a Postgres como timestamp con 'Z' (UTC).
            // Si la sesión de la BD usa un timezone distinto de UTC (p.ej.
            // America/Santo_Domingo, UTC-4), Postgres reinterpretaba esa
            // medianoche UTC como el día ANTERIOR en hora local — por eso
            // "no funcionaba" el filtro (excluía o corría los resultados un
            // día). Ahora se compara directo contra el string "YYYY-MM-DD"
            // que manda el <input type="date">, sin pasar por `new Date()`
            // en ningún punto del backend, así no hay conversión de
            // timezone que pueda correr la fecha.
            // Además "hasta" se vuelve exclusivo del día siguiente en vez de
            // "<=", para no perder registros del último día si la columna
            // llegara a tener componente de hora.
            .$if(!!filtros.fecha_desde, (q: any) => q.where("conduce.fecha", ">=", filtros.fecha_desde))
            .$if(!!filtros.fecha_hasta, (q: any) => q.where("conduce.fecha", "<", siguienteDiaISO(filtros.fecha_hasta!)))
            .$if(!!filtros.busqueda, (q: any) =>
               q.where((eb: any) =>
                  eb.or([
                     eb("conduce.numero_referencia", "ilike", `%${filtros.busqueda}%`),
                     eb("equipo.nombre", "ilike", `%${filtros.busqueda}%`),
                     eb("empleado.nombre", "ilike", `%${filtros.busqueda}%`),
                     eb("cliente.nombre", "ilike", `%${filtros.busqueda}%`),
                     eb("conduce.categoria_equipo_tarifa_nombre", "ilike", `%${filtros.busqueda}%`),
                  ])
               )
            )
            // ── Eliminación lógica ─────────────────────────────────────
            // Por defecto (eliminado=false/undefined) solo activos. Con
            // eliminado=true, solo eliminados — para el futuro apartado de
            // "ver eliminados".
            .$if(filtros.eliminado !== true, (q: any) => q.where("conduce.deleted_at", "is", null))
            .$if(filtros.eliminado === true, (q: any) => q.where("conduce.deleted_at", "is not", null));

      const query = aplicarFiltros(this.#baseQuery())
         .orderBy("conduce.fecha", "desc")
         .orderBy("conduce.created_at", "desc")
         .limit(pageSize)
         .offset((page - 1) * pageSize);

      const countQuery = aplicarFiltros(
         this.db
            .selectFrom("conduce")
            .leftJoin("equipo", "equipo.id", "conduce.equipo_id")
            .leftJoin("empleado", "empleado.id", "conduce.operador_id")
            .leftJoin("cliente", "cliente.id", "conduce.cliente_id")
            .leftJoin("operador", "operador.id", "conduce.operador_id")
            // Mismo join que la query de datos: `aplicarFiltros` referencia
            // `eq_op` para resolver el empleado inferido, así que el conteo
            // también lo necesita o la paginación no cuadraría con la lista.
            .leftJoin("operador as eq_op", "eq_op.id", "equipo.operador_id")
            .select(sql<number>`count(*)`.as("count"))
      );

      const [rows, countRow] = await Promise.all([query.execute(), countQuery.executeTakeFirst()]);

      return {
         data: rows.map((r) => this.#mapRow(r)),
         total: Number(countRow?.count ?? 0),
         page,
         pageSize,
      };
   }

   async findCategoriasByProyecto(proyectoId: string): Promise<Array<{ nombre: string; count: number; subtotal: number; subtotalCobrable: number; cobrable_count: number }>> {
      const rows = await this.db
         .selectFrom("conduce")
         .select([
            "conduce.categoria_equipo_tarifa_nombre as nombre",
            sql<number>`count(*)::int`.as("count"),
            sql<number>`coalesce(sum(subtotal), 0)`.as("subtotal"),
            sql<number>`coalesce(sum(case when es_cobrable then subtotal else 0 end), 0)`.as("subtotal_cobrable"),
            sql<number>`coalesce(sum(case when es_cobrable then 1 else 0 end), 0)::int`.as("cobrable_count"),
         ])
         .where("conduce.proyecto_id", "=", proyectoId)
         .where("conduce.deleted_at", "is", null)
         .groupBy("conduce.categoria_equipo_tarifa_nombre")
         .orderBy("conduce.categoria_equipo_tarifa_nombre", "asc")
         .execute();
      return rows.map((r) => ({
         nombre: r.nombre ?? "Sin categoría",
         count: Number(r.count),
         subtotal: Number(r.subtotal),
         subtotalCobrable: Number(r.subtotal_cobrable),
         cobrable_count: Number(r.cobrable_count),
      }));
   }

   async findByProyectoId(proyectoId: string): Promise<ConduceProps[]> {
      const rows = await this.#baseQuery()
         .where("conduce.proyecto_id", "=", proyectoId)
         .where("conduce.deleted_at", "is", null)
         .orderBy("conduce.fecha", "desc")
         .execute();
      return rows.map((r) => this.#mapRow(r));
   }

   async findById(id: string): Promise<ConduceProps | null> {
      const row = await this.#baseQuery().where("conduce.id", "=", id).executeTakeFirst();
      return row ? this.#mapRow(row) : null;
   }

   async existsNumeroReferencia(numeroReferencia: string, excludeId?: string): Promise<boolean> {
      let qb = this.db
         .selectFrom("conduce")
         .select("conduce.id")
         .where("conduce.numero_referencia", "=", numeroReferencia)
         // Solo folios en uso visible: un conduce eliminado no ocupa su folio.
         .where("conduce.deleted_at", "is", null);
      if (excludeId) qb = qb.where("conduce.id", "!=", excludeId);
      const row = await qb.limit(1).executeTakeFirst();
      return !!row;
   }

   async create(data: CreateConduceDTO): Promise<ConduceProps> {
      const categoriaEquipoTarifaId = data.categoria_equipo_tarifa_id || null;

      const equipo = await this.db
         .selectFrom("equipo")
         .select(["categoria_id"])
         .where("id", "=", data.equipo_id)
         .executeTakeFirst();
      if (!equipo) throw new Error("Equipo no encontrado");

      const categoria = await this.db.selectFrom("categoria_equipo").selectAll().where("id", "=", equipo.categoria_id).executeTakeFirst();
      if (!categoria) throw new Error("Categoría de equipo no encontrada");

      // Snapshot opcional: si el equipo no tiene tarifa, no se exige.
      // Si viene una tarifa, se guarda su nombre y medida de cobro.
      const tarifa = categoriaEquipoTarifaId
         ? await this.db
            .selectFrom("categoria_equipo_tarifa")
            .leftJoin("medida_cobro", "medida_cobro.id", "categoria_equipo_tarifa.medida_cobro_id")
            .select(["categoria_equipo_tarifa.nombre", "medida_cobro.nombre as medida_cobro_nombre"])
            .where("categoria_equipo_tarifa.id", "=", categoriaEquipoTarifaId)
            .executeTakeFirst()
         : null;
      if (categoriaEquipoTarifaId && !tarifa) throw new Error("La tarifa seleccionada no existe");


      const common = {
         tipo_conduce: data.tipo_conduce,
         numero_referencia: data.numero_referencia,
         fecha: data.fecha,
         proyecto_id: data.proyecto_id ?? null,
         cliente_id: data.cliente_id,
         cliente_telefono: data.cliente_telefono ?? null,
         equipo_id: data.equipo_id,
         operador_id: data.operador_id,
         categoria_equipo_id: equipo.categoria_id,
         categoria_equipo_tarifa_id: categoriaEquipoTarifaId,
         // El snapshot describe la tarifa que de verdad se guardó, así que
         // manda el lookup por id y no lo que mandó el cliente. Al revés se
         // podían crear filas mintiendo: nombre "Bote" con el id vacío, que
         // luego la nómina no puede ni cobrar ni corregir.
         // El texto del cliente solo se usa cuando NO hay tarifa (captura
         // manual), que es el único caso en que no hay id del cual derivarlo.
         categoria_equipo_tarifa_nombre:
            tarifa?.nombre ??
            data.categoria_equipo_tarifa_nombre ??
            null,

         medida_cobro_nombre:
            tarifa?.medida_cobro_nombre ??
            data.medida_cobro_nombre ??
            null,
         es_cobrable: data.es_cobrable,
         observaciones: data.observaciones ?? null,
         precio_unitario: data.precio_unitario,
         // Antes se pedía la sesión en la ruta pero nunca se guardaba en el
         // registro — created_by/created_by_name quedaban siempre en NULL.
         created_by: data.created_by ?? null,
         created_by_name: data.created_by_name ?? null,
      };

      let specific: Record<string, unknown>;
      let subtotal: number;

      if (data.tipo_conduce === "CAMION") {
         subtotal = data.cantidad * data.precio_unitario;
         specific = {
            procedencia: data.procedencia,
            destino: data.destino,
            cantidad: data.cantidad,
            firma_chofer: data.firma_chofer,
            firma_recibido: data.firma_recibido,
         };
      } else {
         subtotal = data.total_horas * data.precio_unitario;
         specific = {
            horario_manana_inicio: data.horario_manana_inicio ?? null,
            horario_manana_fin: data.horario_manana_fin ?? null,
            horario_tarde_inicio: data.horario_tarde_inicio ?? null,
            horario_tarde_fin: data.horario_tarde_fin ?? null,
            total_horas: data.total_horas,
            combustible_pagado_cliente: data.combustible_pagado_cliente,
            firma_observante: data.firma_observante,
            firma_camionero: data.firma_camionero,
         };
      }

      const inserted = await this.db
         .insertInto("conduce")
         .values({ ...common, ...specific, subtotal } as any)
         .returning(["id"])
         .executeTakeFirstOrThrow();

      const created = await this.findById(inserted.id);
      return created!;
   }

   async update(id: string, data: UpdateConduceDTO): Promise<ConduceProps> {
      const current = await this.findById(id);
      if (!current) throw new Error("Conduce no encontrado");
      if (current.deleted_at) throw new Error("No se puede editar un conduce eliminado. Restáuralo primero si necesitas modificarlo.");

      // Si el equipo cambia, hay que re-snapshotear categoria_equipo_id —
      // antes SIEMPRE se validaba el equipo VIEJO (current.equipo_id) aunque
      // `data.equipo_id` trajera uno nuevo, y el nuevo equipo nunca quedaba
      // reflejado en categoria_equipo_id.
      let categoriaEquipoId: string | undefined;
      if (data.equipo_id && data.equipo_id !== current.equipo_id) {
         const nuevoEquipo = await this.db
            .selectFrom("equipo")
            .select(["categoria_id"])
            .where("id", "=", data.equipo_id)
            .executeTakeFirst();
         if (!nuevoEquipo) throw new Error("Equipo no encontrado");
         categoriaEquipoId = nuevoEquipo.categoria_id;
      }

      const cantidadNueva = "cantidad" in data ? data.cantidad : undefined;
      const horasNuevas = "total_horas" in data ? data.total_horas : undefined;
      const precio = data.precio_unitario ?? current.precio_unitario;

      let subtotal: number;
      if (current.tipo_conduce === "CAMION") {
         const cantidad = cantidadNueva ?? current.cantidad;
         subtotal = (cantidad ?? 0) * precio;
      } else {
         const horas = horasNuevas ?? current.total_horas;
         subtotal = (horas ?? 0) * precio;
      }

      // Si cambia la tarifa aplicada, re-snapshotea el nombre/medida_cobro.
      let refrescoTarifa: Record<string, unknown> = {};
      if (data.categoria_equipo_tarifa_id && data.categoria_equipo_tarifa_id !== current.categoria_equipo_tarifa_id) {
         const tarifa = await this.db
            .selectFrom("categoria_equipo_tarifa")
            .leftJoin("medida_cobro", "medida_cobro.id", "categoria_equipo_tarifa.medida_cobro_id")
            .select(["categoria_equipo_tarifa.nombre", "medida_cobro.nombre as medida_cobro_nombre"])
            .where("categoria_equipo_tarifa.id", "=", data.categoria_equipo_tarifa_id)
            .executeTakeFirst();
         if (tarifa) {
            refrescoTarifa = {
               categoria_equipo_tarifa_nombre: tarifa.nombre,
               medida_cobro_nombre: tarifa.medida_cobro_nombre ?? "unidad",
            };
         }
      }

      // El re-snapshot manda sobre el texto del cliente: si la tarifa cambió,
      // el nombre guardado es el de la tarifa nueva, no el que venga escrito
      // en el payload. Confiar primero en el cliente permitía guardar un
      // nombre que no corresponde al id de la fila.
      const nombresSnapshot = {
         categoria_equipo_tarifa_nombre:
            refrescoTarifa.categoria_equipo_tarifa_nombre ??
            data.categoria_equipo_tarifa_nombre ??
            current.categoria_equipo_tarifa_nombre ??
            null,

         medida_cobro_nombre:
            refrescoTarifa.medida_cobro_nombre ??
            data.medida_cobro_nombre ??
            current.medida_cobro_nombre ??
            null,
      };

      await this.db
         .updateTable("conduce")
         .set({
            ...data,
            ...nombresSnapshot,
            ...(categoriaEquipoId ? { categoria_equipo_id: categoriaEquipoId } : {}),
            precio_unitario: precio,
            subtotal,
            updated_at: new Date(),
         } as any)
         .where("id", "=", id)
         .execute();

      const updated = await this.findById(id);
      return updated!;
   }

   /** Eliminación LÓGICA — nunca se hace DELETE físico sobre `conduce`. */
   async delete(id: string, info?: { deletedBy?: string | null; deletedByName?: string | null; reason?: string | null }): Promise<void> {
      await this.db
         .updateTable("conduce")
         .set({
            deleted_at: new Date(),
            deleted_by: info?.deletedBy ?? null,
            deleted_by_name: info?.deletedByName ?? null,
            deleted_reason: info?.reason ?? null,
            updated_at: new Date(),
         } as any)
         .where("id", "=", id)
         .execute();
   }

   async restore(id: string): Promise<void> {
      await this.db
         .updateTable("conduce")
         .set({
            deleted_at: null,
            deleted_by: null,
            deleted_by_name: null,
            deleted_reason: null,
            updated_at: new Date(),
         } as any)
         .where("id", "=", id)
         .execute();
   }

   async bulkToggleCobrable(ids: string[], es_cobrable: boolean): Promise<void> {
      if (ids.length === 0) return;
      await this.db
         .updateTable("conduce")
         .set({ es_cobrable, updated_at: new Date() } as any)
         .where("id", "in", ids)
         .execute();
   }

   #mapRow(r: Record<string, unknown>): ConduceProps {
      const base = {
         id: r.id as string,
         numero_referencia: r.numero_referencia as string,
         fecha: new Date(r.fecha as string),
         proyecto_id: r.proyecto_id as string | null,
         proyecto_nombre: (r.proyecto_nombre as string) ?? undefined,
         cliente_id: r.cliente_id as string,
         cliente_nombre: (r.cliente_nombre as string) ?? undefined,
         cliente_telefono: r.cliente_telefono as string | null,
         empleado_id: r.empleado_id as string,
         equipo_id: r.equipo_id as string,
         equipo_nombre: (r.equipo_nombre as string) ?? undefined,
         operador_id: r.operador_id as string,
         operador_nombre: (r.operador_nombre as string) ?? undefined,
         categoria_equipo_id: r.categoria_equipo_id as string,
         categoria_equipo_nombre: (r.categoria_equipo_nombre as string) ?? undefined,
         categoria_equipo_tarifa_id: r.categoria_equipo_tarifa_id as string | null,
         categoria_equipo_tarifa_nombre: r.categoria_equipo_tarifa_nombre as string,
         medida_cobro_nombre: r.medida_cobro_nombre as string,
         es_cobrable: r.es_cobrable as boolean,
         observaciones: r.observaciones as string | null,
         precio_unitario: Number(r.precio_unitario),
         subtotal: Number(r.subtotal),
         created_by: r.created_by as string | null,
         created_by_name: (r.created_by_name as string) ?? undefined,
         created_at: new Date(r.created_at as string),
         updated_at: new Date(r.updated_at as string),
         deleted_by: r.deleted_by as string | null,
         deleted_by_name: (r.deleted_by_name as string) ?? undefined,
         deleted_at: r.deleted_at ? new Date(r.deleted_at as string) : null,
         deleted_reason: r.deleted_reason as string | null,
      };

      if (r.tipo_conduce === "CAMION") {
         return {
            ...base,
            tipo_conduce: "CAMION",
            procedencia: (r.procedencia as string) ?? "",
            destino: (r.destino as string) ?? "",
            cantidad: Number(r.cantidad ?? 0),
            firma_chofer: !!r.firma_chofer,
            firma_recibido: !!r.firma_recibido,
         };
      }

      return {
         ...base,
         tipo_conduce: "EQUIPO_PESADO",
         horario_manana_inicio: r.horario_manana_inicio as string | null,
         horario_manana_fin: r.horario_manana_fin as string | null,
         horario_tarde_inicio: r.horario_tarde_inicio as string | null,
         horario_tarde_fin: r.horario_tarde_fin as string | null,
         total_horas: Number(r.total_horas ?? 0),
         combustible_pagado_cliente: !!r.combustible_pagado_cliente,
         firma_observante: !!r.firma_observante,
         firma_camionero: !!r.firma_camionero,
      };
   }
}