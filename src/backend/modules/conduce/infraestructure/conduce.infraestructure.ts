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

export class KyselyConduceRepository implements IConduceRepository {
   constructor(private readonly db: Kysely<DB>) { }

   #baseQuery() {
      return this.db
         .selectFrom("conduce")
         .leftJoin("proyecto", "proyecto.id", "conduce.proyecto_id")
         .leftJoin("cliente", "cliente.id", "conduce.cliente_id")
         .leftJoin("equipo", "equipo.id", "conduce.equipo_id")
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
            .$if(!!filtros.empleado_id, (q: any) => q.where("conduce.empleado_id", "=", filtros.empleado_id))
            .$if(!!filtros.tipo_conduce, (q: any) => q.where("conduce.tipo_conduce", "=", filtros.tipo_conduce))
            .$if(filtros.es_cobrable !== undefined, (q: any) => q.where("conduce.es_cobrable", "=", filtros.es_cobrable))
            .$if(!!filtros.fecha_desde, (q: any) => q.where("conduce.fecha", ">=", filtros.fecha_desde))
            .$if(!!filtros.fecha_hasta, (q: any) => q.where("conduce.fecha", "<=", filtros.fecha_hasta))
            .$if(!!filtros.busqueda, (q: any) =>
               q.where((eb: any) =>
                  eb.or([
                     eb("conduce.numero_referencia", "ilike", `%${filtros.busqueda}%`),
                     eb("equipo.nombre", "ilike", `%${filtros.busqueda}%`),
                  ])
               )
            );

      console.log("Filtros aplicados:", filtros);

      const query = aplicarFiltros(this.#baseQuery())
         .orderBy("conduce.fecha", "desc")
         .orderBy("conduce.created_at", "desc")
         .limit(pageSize)
         .offset((page - 1) * pageSize);

      const countQuery = aplicarFiltros(
         this.db
            .selectFrom("conduce")
            .leftJoin("equipo", "equipo.id", "conduce.equipo_id")
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

   async findByProyectoId(proyectoId: string): Promise<ConduceProps[]> {
      const rows = await this.#baseQuery()
         .where("conduce.proyecto_id", "=", proyectoId)
         .orderBy("conduce.fecha", "desc")
         .execute();
      return rows.map((r) => this.#mapRow(r));
   }

   async findById(id: string): Promise<ConduceProps | null> {
      const row = await this.#baseQuery().where("conduce.id", "=", id).executeTakeFirst();
      return row ? this.#mapRow(row) : null;
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
         categoria_equipo_id: equipo.categoria_id,
         categoria_equipo_tarifa_id: categoriaEquipoTarifaId,
         categoria_equipo_tarifa_nombre: tarifa?.nombre ?? null,
         medida_cobro_nombre: tarifa?.medida_cobro_nombre ?? null,
         es_cobrable: data.es_cobrable,
         observaciones: data.observaciones ?? null,
         precio_unitario: data.precio_unitario,
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
      const equipo = await this.db.selectFrom("equipo").selectAll().where("id", "=", (current?.equipo_id || "")).executeTakeFirst();
      if (!equipo) throw new Error("Equipo no encontrado");
      const categoria = await this.db.selectFrom("categoria_equipo").selectAll().where("id", "=", equipo.categoria_id).executeTakeFirst();
      if (!current) throw new Error("Conduce no encontrado");

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

      await this.db
         .updateTable("conduce")
         .set({ ...data, ...refrescoTarifa, precio_unitario: precio, subtotal, updated_at: new Date() } as any)
         .where("id", "=", id)
         .execute();

      const updated = await this.findById(id);
      return updated!;
   }

   async delete(id: string): Promise<void> {
      await this.db.deleteFrom("conduce").where("id", "=", id).execute();
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
         equipo_id: r.equipo_id as string,
         equipo_nombre: (r.equipo_nombre as string) ?? undefined,
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