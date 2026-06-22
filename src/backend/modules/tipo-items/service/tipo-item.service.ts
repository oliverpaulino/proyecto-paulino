import { CreateTipoItemDTO, ITipoItemRepository, TipoItemProps, UpdateTipoItemDTO } from "../domain/tipo-item.domain";

export class TipoItemService {
   constructor(private readonly repo: ITipoItemRepository) { }

   async getAll(): Promise<TipoItemProps[]> {
      const tipos = await this.repo.findAll();
      return tipos.map((t) => t.toJSON());
   }

   async getById(id: string): Promise<TipoItemProps | null> {
      const tipo = await this.repo.findById(id);
      return tipo ? tipo.toJSON() : null;
   }

   async create(data: CreateTipoItemDTO): Promise<TipoItemProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");

      const tipo = await this.repo.create(data);
      return tipo.toJSON();
   }

   async update(id: string, data: UpdateTipoItemDTO): Promise<TipoItemProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("Nombre es requerido");
      }

      const tipo = await this.repo.update(id, data);
      return tipo ? tipo.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}
