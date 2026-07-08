import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import { CreateMedidaCobroDTO, IMedidaCobroRepository, MedidaCobro, MedidaCobroProps, UpdateMedidaCobroDTO } from "../domain/medida-cobro.domain";

function toProps(row: {
   id: string;
   nombre: string;
   descripcion: string | null;
   permite_decimales: boolean;
   is_active: boolean;
   created_at: Date;
   updated_at: Date;
}): MedidaCobroProps {
   return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      permite_decimales: row.permite_decimales,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
   };
}

export class KyselyMedidaCobroRepository implements IMedidaCobroRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<MedidaCobro[]> {
      const rows = await this.db
         .selectFrom("medida_cobro")
         .selectAll()
         .orderBy("nombre", "asc")
         .execute();

      return rows.map((row) => MedidaCobro.create(toProps(row)));
   }

   async findById(id: string): Promise<MedidaCobro | null> {
      const row = await this.db
         .selectFrom("medida_cobro")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return MedidaCobro.create(toProps(row));
   }

   async create(data: CreateMedidaCobroDTO): Promise<MedidaCobro> {
      try {
         const row = await this.db
            .insertInto("medida_cobro")
            .values({
               nombre: data.nombre,
               descripcion: data.descripcion ?? null,
               permite_decimales: data.permite_decimales,
               is_active: data.is_active,
               created_at: new Date(),
               updated_at: new Date(),
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         return MedidaCobro.create(toProps(row));
      } catch (err: unknown) {
         if (isUniqueViolation(err)) {
            throw new Error("Ya existe una medida de cobro con ese nombre");
         }
         throw err;
      }
   }

   async update(id: string, data: UpdateMedidaCobroDTO): Promise<MedidaCobro | null> {
      try {
         const row = await this.db
            .updateTable("medida_cobro")
            .set({ ...data, updated_at: new Date() })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst();

         if (!row) return null;
         return MedidaCobro.create(toProps(row));
      } catch (err: unknown) {
         if (isUniqueViolation(err)) {
            throw new Error("Ya existe una medida de cobro con ese nombre");
         }
         throw err;
      }
   }

   async delete(id: string): Promise<boolean> {
      try {
         const result = await this.db
            .deleteFrom("medida_cobro")
            .where("id", "=", id)
            .executeTakeFirst();

         return Number(result.numDeletedRows) > 0;
      } catch (err: unknown) {
         if (isFKViolation(err)) {
            throw new Error("No se puede eliminar la medida de cobro porque tiene categorias asociadas");
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
