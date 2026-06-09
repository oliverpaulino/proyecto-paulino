import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import { CreateItemDTO, IItemRepository, Item, UpdateItemDTO } from "../domain/item.domain";

// PG numeric(12,2) comes back as a string; normalize to number.
type ItemRow = {
   id: string;
   nombre: string;
   tipo_id: string;
   descripcion: string | null;
   unidad: string | null;
   stock: number | string;
   created_at: Date;
   updated_at: Date;
   tipo_nombre?: string | null;
};

function toDomain(row: ItemRow): Item {
   return Item.create({
      id: row.id,
      nombre: row.nombre,
      tipo_id: row.tipo_id,
      descripcion: row.descripcion,
      unidad: row.unidad,
      stock: Number(row.stock),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      tipo_nombre: row.tipo_nombre ?? null,
   });
}

export class KyselyItemRepository implements IItemRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<Item[]> {
      const rows = await this.db
         .selectFrom("item")
         .leftJoin("tipo_item", "tipo_item.id", "item.tipo_id")
         .select([
            "item.id",
            "item.nombre",
            "item.tipo_id",
            "item.descripcion",
            "item.unidad",
            "item.stock",
            "item.created_at",
            "item.updated_at",
            "tipo_item.nombre as tipo_nombre",
         ])
         .orderBy("item.created_at", "desc")
         .execute();

      return rows.map(toDomain);
   }

   async findById(id: string): Promise<Item | null> {
      const row = await this.db
         .selectFrom("item")
         .leftJoin("tipo_item", "tipo_item.id", "item.tipo_id")
         .select([
            "item.id",
            "item.nombre",
            "item.tipo_id",
            "item.descripcion",
            "item.unidad",
            "item.stock",
            "item.created_at",
            "item.updated_at",
            "tipo_item.nombre as tipo_nombre",
         ])
         .where("item.id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return toDomain(row);
   }

   async create(data: CreateItemDTO): Promise<Item> {
      const row = await this.db
         .insertInto("item")
         .values({
            nombre: data.nombre,
            tipo_id: data.tipo_id,
            descripcion: data.descripcion ?? null,
            unidad: data.unidad ?? null,
            stock: data.stock ?? 0,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return toDomain(row);
   }

   async update(id: string, data: UpdateItemDTO): Promise<Item | null> {
      const row = await this.db
         .updateTable("item")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;
      return toDomain(row);
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("item")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}
