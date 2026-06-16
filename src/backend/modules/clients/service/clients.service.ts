import crypto from "crypto";
import { ClientProps, CreateClientDTO, IClientRepository, UpdateClientDTO, ContactClientProps } from "../domain/clients.domain";

export class ClientService {
   constructor(private readonly repo: IClientRepository) { }

   async getAll(): Promise<ClientProps[]> {
      const clients = await this.repo.findAll();
      return clients.map((c) => c.toJSON());
   }

   async getById(id: string): Promise<ClientProps | null> {
      const client = await this.repo.findById(id);
      return client ? client.toJSON() : null;
   }

   async create(data: CreateClientDTO): Promise<ClientProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (!data.identificacion?.trim()) throw new Error("Identificación es requerida");
      if (!data.tipo_identificacion) throw new Error("Tipo de identificación es requerido");
      if (!data.tipo_cliente) throw new Error("Tipo de cliente es requerido");
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
         throw new Error("Email inválido");
      }

      const client = await this.repo.create(data);
      return client.toJSON();
   }

   async update(id: string, data: UpdateClientDTO): Promise<ClientProps | null> {
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
         throw new Error("Email inválido");
      }

      const client = await this.repo.update(id, data);
      return client ? client.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }

   async getContacts(clientId: string): Promise<ContactClientProps[]> {
      return this.repo.getContactsByClientId(clientId);
   }

   async createContact(data: { client_id: string; name: string; email?: string | null; phone?: string | null; job_title?: string | null }): Promise<ContactClientProps> {
      const contactData: ContactClientProps = {
         id: crypto.randomUUID(),
         client_id: data.client_id,
         name: data.name,
         email: data.email ?? null,
         phone: data.phone ?? null,
         job_title: data.job_title ?? null,
         created_at: new Date(),
         updated_at: new Date(),
      };
      return this.repo.createContact(contactData);
   }

   async updateContact(id: string, clientId: string, data: any): Promise<ContactClientProps> {
      const updateData: Partial<ContactClientProps> = {
         ...data,
         updated_at: new Date(),
      };
      if (data.created_at) updateData.created_at = new Date(data.created_at);
      
      return this.repo.updateContact(id, clientId, updateData);
   }

   async deleteContact(id: string, clientId: string): Promise<boolean> {
      return this.repo.deleteContact(id, clientId);
   }
}