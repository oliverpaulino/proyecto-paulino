import {
   CategoriaEquipoProps,
   CreateCategoriaEquipoDTO,
   ICategoriaEquipoRepository,
   UpdateCategoriaEquipoDTO,
} from "../domain/categoria-equipo.domain";

export class CategoriaEquipoService {
   constructor(private readonly repo: ICategoriaEquipoRepository) { }

   async getAll(): Promise<CategoriaEquipoProps[]> {
      const items = await this.repo.findAll();
      return items.map((c) => c.toJSON());
   }

   async getById(id: string): Promise<CategoriaEquipoProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreateCategoriaEquipoDTO): Promise<CategoriaEquipoProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (!data.tarifas || data.tarifas.length === 0) {
         throw new Error("Debe agregar al menos una tarifa");
      }

      const item = await this.repo.create({
         nombre: data.nombre.trim(),
         tarifas: data.tarifas,
      });
      return item.toJSON();
   }

   async update(id: string, data: UpdateCategoriaEquipoDTO): Promise<CategoriaEquipoProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("Nombre es requerido");
      }

      const payload: UpdateCategoriaEquipoDTO = {};

      if (data.nombre !== undefined) payload.nombre = data.nombre.trim();

      if (data.tarifas !== undefined) {
         if (data.tarifas.length === 0) {
            throw new Error("La categoría debe tener al menos una tarifa");
         }
         payload.tarifas = data.tarifas;
      }

      const item = await this.repo.update(id, payload);
      return item ? item.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}