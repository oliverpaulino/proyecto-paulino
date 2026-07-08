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
      if (!data.cobra_en?.trim()) throw new Error("El campo 'cobra en' es requerido");

      const item = await this.repo.create({
         nombre: data.nombre.trim(),
         cobra_en: data.cobra_en.trim(),
         cobra_minimo: data.cobra_minimo ?? null,
         precio_unitario: data.precio_unitario ?? null,
         medida_cobro_id: data.medida_cobro_id,
      });
      return item.toJSON();
   }

   async update(id: string, data: UpdateCategoriaEquipoDTO): Promise<CategoriaEquipoProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("Nombre es requerido");
      }
      if (data.cobra_en !== undefined && !data.cobra_en.trim()) {
         throw new Error("El campo 'cobra en' es requerido");
      }
      if (data.medida_cobro_id !== undefined && !data.medida_cobro_id.trim()) {
         throw new Error("El campo 'medida de cobro' es requerido");
      }

      const payload: UpdateCategoriaEquipoDTO = {};
      if (data.nombre !== undefined) payload.nombre = data.nombre.trim();
      if (data.cobra_en !== undefined) payload.cobra_en = data.cobra_en.trim();
      if (data.cobra_minimo !== undefined) payload.cobra_minimo = data.cobra_minimo;
      if (data.precio_unitario !== undefined) payload.precio_unitario = data.precio_unitario ?? null;
      if (data.medida_cobro_id !== undefined) payload.medida_cobro_id = data.medida_cobro_id;

      const item = await this.repo.update(id, payload);
      return item ? item.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}
