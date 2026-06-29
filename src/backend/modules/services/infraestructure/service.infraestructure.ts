import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   CreateServicioDTO,
   IServicioRepository,
   Servicio,
   TipoServicio,
   UpdateServicioDTO,
} from "../domain/service.domain";

type ServicioRow = {
   id: string;
   nombre: string;
   tipo: string;
   descripcion: string | null;
   precio_base: number | string;
   created_at: Date | string;
   updated_at: Date | string;
};

function toEntity(row: ServicioRow): Servicio {
   return Servicio.create({
      id: row.id,
      nombre: row.nombre,
      tipo: row.tipo as TipoServicio,
      descripcion: row.descripcion,
      precio_base: Number(row.precio_base),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
   });
}

export class KyselyServicioRepository implements IServicioRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<Servicio[]> {
      const rows = await this.db
         .selectFrom("servicio")
         .selectAll()
         .orderBy("created_at", "desc")
         .execute();

      return rows.map(toEntity);
   }

   async findById(id: string): Promise<Servicio | null> {
      const row = await this.db
         .selectFrom("servicio")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return toEntity(row);
   }

   async create(data: CreateServicioDTO): Promise<Servicio> {
      const row = await this.db
         .insertInto("servicio")
         .values({
            nombre: data.nombre,
            tipo: data.tipo,
            descripcion: data.descripcion ?? null,
            precio_base: data.precio_base ?? 0,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return toEntity(row);
   }

   async update(id: string, data: UpdateServicioDTO): Promise<Servicio | null> {
      const row = await this.db
         .updateTable("servicio")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;
      return toEntity(row);
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("servicio")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}
