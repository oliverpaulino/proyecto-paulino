import { ClientProps, CreateClientDTO, IClientRepository, UpdateClientDTO } from "../domain/clients.domain";

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
}