import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   CategoriaGasto,
   CreateCategoriaGastoDTO,
   GrupoGasto,
   ICategoriaGastoRepository,
   UpdateCategoriaGastoDTO,
} from "../domain/categoria-gastos.domain";

export class KyselyCategoriaGastoRepository implements ICategoriaGastoRepository {
   constructor(private readonly db: Kysely<DB>) { }

   private mapToEntity(row: any): CategoriaGasto {
      return CategoriaGasto.create({
         id: row.id,
         nombre: row.nombre,
         grupo: row.grupo as GrupoGasto,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async findAll(params?: { page?: number; limit?: number; search?: string; grupo?: GrupoGasto; }): Promise<CategoriaGasto[]> {
      const { page = 1, limit = 20, search = "", grupo } = params || {};
      
      let query = this.db.selectFrom("categoria_gasto").selectAll();

      if (search) {
         query = query.where("nombre", "ilike", `%${search}%`);
      }

      if (grupo) {
         query = query.where("grupo", "=", grupo);
      }

      const rows = await query
         .orderBy("nombre", "asc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<CategoriaGasto | null> {
      const row = await this.db
         .selectFrom("categoria_gasto")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async create(data: CreateCategoriaGastoDTO): Promise<CategoriaGasto> {
      try {
         const row = await this.db
            .insertInto("categoria_gasto")
            .values({
               nombre: data.nombre,
               grupo: data.grupo,
               created_at: new Date(),
               updated_at: new Date(),
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         return this.mapToEntity(row);
      } catch (err: unknown) {
         if (isUniqueViolation(err)) {
            throw new Error("Ya existe una categoría de gasto con ese nombre");
         }
         throw err;
      }
   }

   async update(id: string, data: UpdateCategoriaGastoDTO): Promise<CategoriaGasto | null> {
      try {
         const row = await this.db
            .updateTable("categoria_gasto")
            .set({ ...data, updated_at: new Date() })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst();

         if (!row) return null;
         return this.mapToEntity(row);
      } catch (err: unknown) {
         if (isUniqueViolation(err)) {
            throw new Error("Ya existe una categoría de gasto con ese nombre");
         }
         throw err;
      }
   }

   async delete(id: string): Promise<boolean> {
      try {
         const result = await this.db
            .deleteFrom("categoria_gasto")
            .where("id", "=", id)
            .executeTakeFirst();

         return Number(result.numDeletedRows) > 0;
      } catch (err: unknown) {
         if (isFKViolation(err)) {
            throw new Error("No se puede eliminar la categoría porque tiene gastos asociados");
         }
         throw err;
      }
   }
}

function isUniqueViolation(err: unknown): boolean {
   return typeof err === "object" && err !== null && "code" in err &&
      (err as { code?: string }).code === "23505";
}

function isFKViolation(err: unknown): boolean {
   return typeof err === "object" && err !== null && "code" in err &&
      (err as { code?: string }).code === "23503";
}