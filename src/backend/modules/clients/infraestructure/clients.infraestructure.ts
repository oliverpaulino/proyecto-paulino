import { Kysely } from "kysely";
import { IClientRepository, CreateClientDTO, UpdateClientDTO, Client, TipoIdentificacion, TipoCliente } from "../domain/clients.domain";
import { DB } from "@/backend/database";

export class KyselyClientRepository implements IClientRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<Client[]> {
      const rows = await this.db
         .selectFrom("cliente")
         .selectAll()
         .orderBy("created_at", "desc")
         .execute();

      return rows.map((row) =>
         Client.create({
            ...row,
            tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
            tipo_cliente: row.tipo_cliente as TipoCliente,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
         })
      );
   }

   async findById(id: string): Promise<Client | null> {
      const row = await this.db
         .selectFrom("cliente")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return Client.create({
         ...row,
         tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
         tipo_cliente: row.tipo_cliente as TipoCliente,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async create(data: CreateClientDTO): Promise<Client> {
      const row = await this.db
         .insertInto("cliente")
         .values({
            nombre: data.nombre,
            identificacion: data.identificacion,
            tipo_identificacion: data.tipo_identificacion,
            tipo_cliente: data.tipo_cliente,
            email: data.email ?? null,
            telefono: data.telefono ?? null,
            direccion: data.direccion ?? null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return Client.create({
         ...row,
         tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
         tipo_cliente: row.tipo_cliente as TipoCliente,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async update(id: string, data: UpdateClientDTO): Promise<Client | null> {
      const row = await this.db
         .updateTable("cliente")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;

      return Client.create({
         ...row,
         tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
         tipo_cliente: row.tipo_cliente as TipoCliente,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("cliente")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}