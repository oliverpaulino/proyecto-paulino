import { Kysely } from "kysely";
import type { DB } from "@/backend/database";
import type {
   CreateProyectoArchivoDTO,
   IProyectoArchivoRepository,
   ProyectoArchivoProps,
} from "../domain/proyecto-archivo.domain";

export class KyselyProyectoArchivoRepository implements IProyectoArchivoRepository {
   constructor(private readonly db: Kysely<DB>) {}

   async findByProyectoId(proyectoId: string): Promise<ProyectoArchivoProps[]> {
      const rows = await this.db
         .selectFrom("proyecto_archivo")
         .selectAll()
         .where("proyecto_id", "=", proyectoId)
         .orderBy("created_at", "desc")
         .execute();

      return rows.map((r) => this.#mapRow(r));
   }

   async findById(id: string): Promise<ProyectoArchivoProps | null> {
      const row = await this.db
         .selectFrom("proyecto_archivo")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      return row ? this.#mapRow(row) : null;
   }

   async create(data: CreateProyectoArchivoDTO): Promise<ProyectoArchivoProps> {
      const inserted = await this.db
         .insertInto("proyecto_archivo")
         .values(this.#toRow(data))
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.#mapRow(inserted);
   }

   async createMany(data: CreateProyectoArchivoDTO[]): Promise<ProyectoArchivoProps[]> {
      if (data.length === 0) return [];

      return this.db.transaction().execute(async (trx) => {
         const inserted = await trx
            .insertInto("proyecto_archivo")
            .values(data.map((d) => this.#toRow(d)))
            .returningAll()
            .execute();

         return inserted.map((r) => this.#mapRow(r));
      });
   }

   async update(id: string, nombreArchivo: string): Promise<ProyectoArchivoProps | null> {
      const row = await this.db
         .updateTable("proyecto_archivo")
         .set({ nombre_archivo: nombreArchivo })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      return row ? this.#mapRow(row) : null;
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("proyecto_archivo")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }

   #toRow(data: CreateProyectoArchivoDTO) {
      return {
         proyecto_id: data.proyecto_id,
         nombre_archivo: data.nombre_archivo,
         storage_path: data.storage_path,
         tipo_mime: data.tipo_mime,
         tamanio_bytes: data.tamanio_bytes,
      };
   }

   #mapRow(row: Record<string, unknown>): ProyectoArchivoProps {
      return {
         id: row.id as string,
         proyecto_id: row.proyecto_id as string,
         nombre_archivo: row.nombre_archivo as string,
         storage_path: row.storage_path as string,
         tipo_mime: row.tipo_mime as string,
         tamanio_bytes: Number(row.tamanio_bytes),
         created_at: new Date(row.created_at as string),
      };
   }
}
