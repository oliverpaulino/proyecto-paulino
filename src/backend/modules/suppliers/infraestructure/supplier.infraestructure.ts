import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import { CreateSupplierDTO, ISupplierRepository, Supplier, SupplierProps, TipoProveedor, UpdateSupplierDTO } from "../domain/supplier.domain";

export class KyselySupplierRepository implements ISupplierRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<Supplier[]> {
      const rows = await this.db
         .selectFrom("proveedor")
         .selectAll()
         .orderBy("created_at", "desc")
         .execute();

      return rows.map((row) =>
         Supplier.create({
            ...row,
            tipo: row.tipo as TipoProveedor,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
         })
      );
   }

   async findById(id: string): Promise<Supplier | null> {
      const row = await this.db
         .selectFrom("proveedor")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return Supplier.create({
         ...row,
         tipo: row.tipo as TipoProveedor,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async create(data: CreateSupplierDTO): Promise<Supplier> {
      const row = await this.db
         .insertInto("proveedor")
         .values({
            nombre: data.nombre,
            tipo: data.tipo,
            rnc: data.rnc,
            telefono: data.telefono ?? null,
            email: data.email ?? null,
            direccion: data.direccion ?? null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return Supplier.create({
         ...row,
         tipo: row.tipo as TipoProveedor,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async update(id: string, data: UpdateSupplierDTO): Promise<Supplier | null> {
      const row = await this.db
         .updateTable("proveedor")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;

      return Supplier.create({
         ...row,
         tipo: row.tipo as TipoProveedor,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("proveedor")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}
