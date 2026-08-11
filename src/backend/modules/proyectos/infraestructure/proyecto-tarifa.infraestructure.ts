import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";
import type {
   IProyectoTarifaRepository,
   UpsertProyectoTarifaDTO,
   ProyectoTarifaProps,
   TarifaGlobalRow,
   BulkUpsertTarifaInput,
} from "../domain/proyecto-tarifa.domain";

export class KyselyProyectoTarifaRepository implements IProyectoTarifaRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findByProyectoId(proyectoId: string): Promise<ProyectoTarifaProps[]> {
      const rows = await this.db
         .selectFrom("proyecto_tarifa")
         .selectAll()
         .where("proyecto_id", "=", proyectoId)
         .execute();
      return rows.map((r) => this.#map(r));
   }

   async findAllConGlobales(
      proyectoId: string,
      search?: string,
      page?: number,
      limit?: number
   ): Promise<{ rows: TarifaGlobalRow[]; total: number }> {
      const safePage = Math.max(1, page ?? 1);
      const safeLimit = Math.min(100, Math.max(1, limit ?? 20));
      const offset = (safePage - 1) * safeLimit;

      let baseQuery = this.db
         .selectFrom("categoria_equipo_tarifa as cet")
         .innerJoin("categoria_equipo as ce", "ce.id", "cet.categoria_equipo_id")
         .innerJoin("medida_cobro as mc", "mc.id", "cet.medida_cobro_id")
         .leftJoin("proyecto_tarifa as pt", (join) =>
            join
               .onRef("pt.categoria_equipo_tarifa_id", "=", "cet.id")
               .on("pt.proyecto_id", "=", proyectoId)
         );

      if (search && search.trim()) {
         const like = `%${search.trim()}%`;
         baseQuery = baseQuery.where((eb) => eb.or([
            eb("ce.nombre", "ilike", like),
            eb("cet.nombre", "ilike", like),
         ]));
      }

      const countResult = await baseQuery
         .select(sql<number>`COUNT(*)`.as("total"))
         .executeTakeFirst();
      const total = Number(countResult?.total ?? 0);

      const rows = await baseQuery
         .select([
            "cet.id as categoria_equipo_tarifa_id",
            "cet.nombre as categoria_equipo_tarifa_nombre",
            "ce.id as categoria_equipo_id",
            "ce.nombre as categoria_equipo_nombre",
            "mc.nombre as medida_cobro_nombre",
            "cet.precio_unitario as precio_global",
            "pt.precio_unitario as precio_proyecto",
            "pt.id as proyecto_tarifa_id",
         ])
         .orderBy("ce.nombre", "asc")
         .orderBy("cet.nombre", "asc")
         .limit(safeLimit)
         .offset(offset)
         .execute();

      return {
         rows: rows.map((r) => ({
            categoria_equipo_tarifa_id: r.categoria_equipo_tarifa_id as string,
            categoria_equipo_tarifa_nombre: r.categoria_equipo_tarifa_nombre as string,
            categoria_equipo_id: r.categoria_equipo_id as string,
            categoria_equipo_nombre: r.categoria_equipo_nombre as string,
            medida_cobro_nombre: r.medida_cobro_nombre as string,
            precio_global: Number(r.precio_global),
            precio_proyecto: r.precio_proyecto != null ? Number(r.precio_proyecto) : null,
            proyecto_tarifa_id: r.proyecto_tarifa_id as string | null,
         })),
         total,
      };
   }

   async upsert(data: UpsertProyectoTarifaDTO): Promise<ProyectoTarifaProps> {
      const tarifa = await this.db
         .selectFrom("categoria_equipo_tarifa")
         .leftJoin("categoria_equipo", "categoria_equipo.id", "categoria_equipo_tarifa.categoria_equipo_id")
         .leftJoin("medida_cobro", "medida_cobro.id", "categoria_equipo_tarifa.medida_cobro_id")
         .select([
            "categoria_equipo_tarifa.nombre as tarifa_nombre",
            "categoria_equipo.nombre as categoria_nombre",
            "medida_cobro.nombre as medida_cobro_nombre",
         ])
         .where("categoria_equipo_tarifa.id", "=", data.categoria_equipo_tarifa_id)
         .executeTakeFirst();
      if (!tarifa) throw new Error("La tarifa seleccionada no existe");

      const existente = await this.db
         .selectFrom("proyecto_tarifa")
         .select(["id"])
         .where("proyecto_id", "=", data.proyecto_id)
         .where("categoria_equipo_tarifa_id", "=", data.categoria_equipo_tarifa_id)
         .executeTakeFirst();

      const valores = {
         categoria_equipo_tarifa_nombre: tarifa.tarifa_nombre,
         categoria_equipo_nombre: tarifa.categoria_nombre ?? "",
         medida_cobro_nombre: tarifa.medida_cobro_nombre ?? "unidad",
         precio_unitario: data.precio_unitario,
      };

      let id: string;
      if (existente) {
         await this.db
            .updateTable("proyecto_tarifa")
            .set({ ...valores, updated_at: new Date() })
            .where("id", "=", existente.id)
            .execute();
         id = existente.id;
      } else {
         const inserted = await this.db
            .insertInto("proyecto_tarifa")
            .values({
               proyecto_id: data.proyecto_id,
               categoria_equipo_tarifa_id: data.categoria_equipo_tarifa_id,
               ...valores,
            })
            .returning(["id"])
            .executeTakeFirstOrThrow();
         id = inserted.id;
      }

      const row = await this.db
         .selectFrom("proyecto_tarifa")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirstOrThrow();
      return this.#map(row);
   }

   async bulkUpsert(proyectoId: string, tarifas: BulkUpsertTarifaInput[]): Promise<void> {
      if (tarifas.length === 0) return;

      const tarifasConInfo = await this.db
         .selectFrom("categoria_equipo_tarifa")
         .leftJoin("categoria_equipo", "categoria_equipo.id", "categoria_equipo_tarifa.categoria_equipo_id")
         .leftJoin("medida_cobro", "medida_cobro.id", "categoria_equipo_tarifa.medida_cobro_id")
         .select([
            "categoria_equipo_tarifa.id",
            "categoria_equipo_tarifa.nombre as tarifa_nombre",
            "categoria_equipo.nombre as categoria_nombre",
            "medida_cobro.nombre as medida_cobro_nombre",
         ])
         .where("categoria_equipo_tarifa.id", "in", tarifas.map((t) => t.categoria_equipo_tarifa_id))
         .execute();

      const infoMap = new Map(tarifasConInfo.map((t) => [t.id, t]));

      const values = tarifas.map((t) => {
         const info = infoMap.get(t.categoria_equipo_tarifa_id);
         return {
            proyecto_id: proyectoId,
            categoria_equipo_tarifa_id: t.categoria_equipo_tarifa_id,
            categoria_equipo_tarifa_nombre: info?.tarifa_nombre ?? "",
            categoria_equipo_nombre: info?.categoria_nombre ?? "",
            medida_cobro_nombre: info?.medida_cobro_nombre ?? "unidad",
            precio_unitario: t.precio_unitario,
         };
      });

      await this.db
         .insertInto("proyecto_tarifa")
         .values(values)
         .onConflict((oc) => oc
            .columns(["proyecto_id", "categoria_equipo_tarifa_id"])
            .doUpdateSet({
               categoria_equipo_tarifa_nombre: (eb) => eb.ref("excluded.categoria_equipo_tarifa_nombre"),
               categoria_equipo_nombre: (eb) => eb.ref("excluded.categoria_equipo_nombre"),
               medida_cobro_nombre: (eb) => eb.ref("excluded.medida_cobro_nombre"),
               precio_unitario: (eb) => eb.ref("excluded.precio_unitario"),
               updated_at: new Date(),
            })
         )
         .execute();
   }

   async findById(id: string): Promise<ProyectoTarifaProps | null> {
      const row = await this.db
         .selectFrom("proyecto_tarifa")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();
      return row ? this.#map(row) : null;
   }

   async delete(id: string): Promise<void> {
      await this.db.deleteFrom("proyecto_tarifa").where("id", "=", id).execute();
   }

   #map(r: Record<string, unknown>): ProyectoTarifaProps {
      return {
         id: r.id as string,
         proyecto_id: r.proyecto_id as string,
         categoria_equipo_tarifa_id: r.categoria_equipo_tarifa_id as string,
         categoria_equipo_tarifa_nombre: r.categoria_equipo_tarifa_nombre as string,
         categoria_equipo_nombre: r.categoria_equipo_nombre as string,
         medida_cobro_nombre: r.medida_cobro_nombre as string,
         precio_unitario: Number(r.precio_unitario),
         created_at: new Date(r.created_at as string),
         updated_at: new Date(r.updated_at as string),
      };
   }
}
