import { Kysely } from "kysely";
import { IClientRepository, CreateClientDTO, UpdateClientDTO, Client, TipoIdentificacion, TipoCliente, ContactClientProps } from "../domain/clients.domain";
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

   async getContactsByClientId(clientId: string): Promise<ContactClientProps[]> {
      const rows = await this.db
         .selectFrom("contact")
         .selectAll()
         .where("client_id", "=", clientId)
         .execute();

      return rows.map(r => ({
         ...r,
         created_at: new Date(r.created_at),
         updated_at: new Date(r.updated_at),
      })) as ContactClientProps[];
   }

   async createContact(data: ContactClientProps): Promise<ContactClientProps> {
      const row = await this.db
         .insertInto("contact")
         .values(data as any)
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         ...row,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as ContactClientProps;
   }

   async updateContact(id: string, clientId: string, data: Partial<ContactClientProps>): Promise<ContactClientProps> {
      const row = await this.db
         .updateTable("contact")
         .set(data as any)
         .where("id", "=", id)
         .where("client_id", "=", clientId)
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         ...row,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as ContactClientProps;
   }

   async deleteContact(id: string, clientId: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("contact")
         .where("id", "=", id)
         .where("client_id", "=", clientId)
         .executeTakeFirst();
         
      return Number(result.numDeletedRows) > 0;
   }
}