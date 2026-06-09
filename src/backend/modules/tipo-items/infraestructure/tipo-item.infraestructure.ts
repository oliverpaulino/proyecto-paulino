import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import { CreateTipoItemDTO, ITipoItemRepository, TipoItem, UpdateTipoItemDTO } from "../domain/tipo-item.domain";

export class KyselyTipoItemRepository implements ITipoItemRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<TipoItem[]> {
      const rows = await this.db
         .selectFrom("tipo_item")
         .selectAll()
         .orderBy("nombre", "asc")
         .execute();

      return rows.map((row) =>
         TipoItem.create({
            ...row,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
         })
      );
   }

   async findById(id: string): Promise<TipoItem | null> {
      const row = await this.db
         .selectFrom("tipo_item")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return TipoItem.create({
         ...row,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async create(data: CreateTipoItemDTO): Promise<TipoItem> {
      try {
         const row = await this.db
            .insertInto("tipo_item")
            .values({
               nombre: data.nombre,
               descripcion: data.descripcion ?? null,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         return TipoItem.create({
            ...row,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
         });
      } catch (err: unknown) {
         if (isUniqueViolation(err)) {
            throw new Error("Ya existe una categoría con ese nombre");
         }
         throw err;
      }
   }

   async update(id: string, data: UpdateTipoItemDTO): Promise<TipoItem | null> {
      try {
         const row = await this.db
            .updateTable("tipo_item")
            .set({ ...data, updated_at: new Date() })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst();

         if (!row) return null;

         return TipoItem.create({
            ...row,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
         });
      } catch (err: unknown) {
         if (isUniqueViolation(err)) {
            throw new Error("Ya existe una categoría con ese nombre");
         }
         throw err;
      }
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("tipo_item")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}

function isUniqueViolation(err: unknown): boolean {
   return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}
