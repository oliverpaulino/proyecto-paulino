import { Kysely } from "kysely";
import type { DB } from "@/backend/database";
import type {
   IProyectoTarifaRepository,
   UpsertProyectoTarifaDTO,
   ProyectoTarifaProps,
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

   async upsert(data: UpsertProyectoTarifaDTO): Promise<ProyectoTarifaProps> {
      // Snapshot: se resuelve una sola vez al guardar, para no depender de
      // un join vivo (categoria_equipo_tarifa se regenera en cada edición
      // de la categoría — ver nota en database.ts).
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