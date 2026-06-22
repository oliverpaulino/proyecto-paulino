import { CreateItemDTO, IItemRepository, ItemProps, UpdateItemDTO } from "../domain/item.domain";

export class ItemService {
   constructor(private readonly repo: IItemRepository) { }

   async getAll(): Promise<ItemProps[]> {
      const items = await this.repo.findAll();
      return items.map((i) => i.toJSON());
   }

   async getById(id: string): Promise<ItemProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreateItemDTO): Promise<ItemProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (!data.tipo_id?.trim()) throw new Error("Categoría es requerida");
      if (data.stock !== undefined && (Number.isNaN(Number(data.stock)) || Number(data.stock) < 0)) {
         throw new Error("Stock debe ser un número mayor o igual a 0");
      }

      const item = await this.repo.create({ ...data, stock: data.stock !== undefined ? Number(data.stock) : 0 });
      return item.toJSON();
   }

   async update(id: string, data: UpdateItemDTO): Promise<ItemProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("Nombre es requerido");
      }
      if (data.tipo_id !== undefined && !data.tipo_id.trim()) {
         throw new Error("Categoría es requerida");
      }
      if (data.stock !== undefined && (Number.isNaN(Number(data.stock)) || Number(data.stock) < 0)) {
         throw new Error("Stock debe ser un número mayor o igual a 0");
      }

      const item = await this.repo.update(id, data.stock !== undefined ? { ...data, stock: Number(data.stock) } : data);
      return item ? item.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}
