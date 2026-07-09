import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   IUnitRepository,
   Unit,
   CreateUnitDTO,
   UpdateUnitDTO,
   TipoUnidad
} from "../domain/units.domain";

export class KyselyUnitRepository implements IUnitRepository {
   constructor(private readonly db: Kysely<DB>) {}

   private mapToEntity(row: any): Unit {
      return Unit.create({
         ...row,
         tipo_unidad: row.tipo_unidad as TipoUnidad,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }
   
   async findAll(): Promise<Unit[]> {
      const rows = await this.db
         .selectFrom("unidades")
         .selectAll()
         .orderBy("created_at", "desc")
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<Unit | null> {
      const row = await this.db
         .selectFrom("unidades")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return Unit.create({
         ...row,
         tipo_unidad: row.tipo_unidad as TipoUnidad,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async findAllByTipoUnidad(tipoUnidad: TipoUnidad): Promise<Unit[]> {
      const rows = await this.db
         .selectFrom("unidades")
         .selectAll()
         .where("tipo_unidad", "=", tipoUnidad)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async create(data: CreateUnitDTO): Promise<Unit> {
      const row = await this.db
         .insertInto("unidades")
         .values(data)
         .returningAll()
         .executeTakeFirstOrThrow();

      return Unit.create({
         ...row,
         tipo_unidad: row.tipo_unidad as TipoUnidad,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async update(id: string, data: UpdateUnitDTO): Promise<Unit | null> {
      const row = await this.db
         .updateTable("unidades")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;

      return Unit.create({
         ...row,
         tipo_unidad: row.tipo_unidad as TipoUnidad,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("unidades")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}