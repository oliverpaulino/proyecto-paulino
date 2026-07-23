import {
   CategoriaGastoProps,
   CreateCategoriaGastoDTO,
   GrupoGasto,
   ICategoriaGastoRepository,
   UpdateCategoriaGastoDTO,
} from "../domain/categoria-gastos.domain";

export class CategoriaGastoService {
   constructor(private readonly repo: ICategoriaGastoRepository) { }

   async getAll(params: { page?: number; limit?: number; search?: string; grupo?: GrupoGasto; }): Promise<CategoriaGastoProps[]> {
      const items = await this.repo.findAll(params);
      return items.map((c) => c.toJSON());
   }

   async getById(id: string): Promise<CategoriaGastoProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreateCategoriaGastoDTO): Promise<CategoriaGastoProps> {
      if (!data.nombre?.trim()) throw new Error("El nombre es requerido");
      if (!data.grupo?.trim()) throw new Error("El grupo es requerido");

      const item = await this.repo.create({
         nombre: data.nombre.trim(),
         grupo: data.grupo,
      });
      return item.toJSON();
   }

   async update(id: string, data: UpdateCategoriaGastoDTO): Promise<CategoriaGastoProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("El nombre no puede estar vacío");
      }

      const payload: UpdateCategoriaGastoDTO = {};
      if (data.nombre !== undefined) payload.nombre = data.nombre.trim();
      if (data.grupo !== undefined) payload.grupo = data.grupo;

      const item = await this.repo.update(id, payload);
      return item ? item.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}