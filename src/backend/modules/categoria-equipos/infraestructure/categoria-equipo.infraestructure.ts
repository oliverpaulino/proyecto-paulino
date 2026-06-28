import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   CategoriaEquipo,
   CategoriaEquipoProps,
   CreateCategoriaEquipoDTO,
   ICategoriaEquipoRepository,
   UpdateCategoriaEquipoDTO,
} from "../domain/categoria-equipo.domain";

function toProps(row: {
   id: string;
   nombre: string;
   cobra_en: string;
   cobra_minimo: number | string | null;
   created_at: Date;
   updated_at: Date;
}): CategoriaEquipoProps {
   return {
      id: row.id,
      nombre: row.nombre,
      cobra_en: row.cobra_en,
      cobra_minimo: row.cobra_minimo == null ? null : Number(row.cobra_minimo),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
   };
}

export class KyselyCategoriaEquipoRepository implements ICategoriaEquipoRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<CategoriaEquipo[]> {
      const rows = await this.db
         .selectFrom("categoria_equipo")
         .selectAll()
         .orderBy("nombre", "asc")
         .execute();

      return rows.map((row) => CategoriaEquipo.create(toProps(row)));
   }

   async findById(id: string): Promise<CategoriaEquipo | null> {
      const row = await this.db
         .selectFrom("categoria_equipo")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return CategoriaEquipo.create(toProps(row));
   }

   async create(data: CreateCategoriaEquipoDTO): Promise<CategoriaEquipo> {
      try {
         const row = await this.db
            .insertInto("categoria_equipo")
            .values({
               nombre: data.nombre,
               cobra_en: data.cobra_en,
               cobra_minimo: data.cobra_minimo ?? null,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         return CategoriaEquipo.create(toProps(row));
      } catch (err: unknown) {
         if (isUniqueViolation(err)) {
            throw new Error("Ya existe una categoría con ese nombre");
         }
         throw err;
      }
   }

   async update(id: string, data: UpdateCategoriaEquipoDTO): Promise<CategoriaEquipo | null> {
      try {
         const row = await this.db
            .updateTable("categoria_equipo")
            .set({ ...data, updated_at: new Date() })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst();

         if (!row) return null;
         return CategoriaEquipo.create(toProps(row));
      } catch (err: unknown) {
         if (isUniqueViolation(err)) {
            throw new Error("Ya existe una categoría con ese nombre");
         }
         throw err;
      }
   }

   async delete(id: string): Promise<boolean> {
      try {
         const result = await this.db
            .deleteFrom("categoria_equipo")
            .where("id", "=", id)
            .executeTakeFirst();

         return Number(result.numDeletedRows) > 0;
      } catch (err: unknown) {
         if (isFKViolation(err)) {
            throw new Error("No se puede eliminar la categoría porque tiene equipos asociados");
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
