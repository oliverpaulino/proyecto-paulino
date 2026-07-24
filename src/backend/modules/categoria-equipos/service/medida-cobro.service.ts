import { IMedidaCobroRepository, MedidaCobroProps, UpdateMedidaCobroDTO } from "../domain/medida-cobro.domain";

export class MedidaCobroService {
   constructor(private readonly repo: IMedidaCobroRepository) { }

   async getAll(): Promise<MedidaCobroProps[]> {
      const items = await this.repo.findAll();
      return items.map((c) => c.toJSON());
   }

   async getById(id: string): Promise<MedidaCobroProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: MedidaCobroProps): Promise<MedidaCobroProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (data.permite_decimales === undefined) throw new Error("El campo 'permite_decimales' es requerido");

      const item = await this.repo.create({
         nombre: data.nombre.trim(),
         descripcion: data.descripcion ?? null,
         permite_decimales: data.permite_decimales,
         is_active: data.is_active
      });
      return item.toJSON();
   }

   async update(id: string, data: UpdateMedidaCobroDTO): Promise<MedidaCobroProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("Nombre es requerido");
      }

      const payload: UpdateMedidaCobroDTO = {};
      if (data.nombre !== undefined) payload.nombre = data.nombre.trim();
      if (data.descripcion !== undefined) payload.descripcion = data.descripcion.trim();
      if (data.permite_decimales !== undefined) payload.permite_decimales = data.permite_decimales;
      if (data.is_active !== undefined) payload.is_active = data.is_active;
      const item = await this.repo.update(id, payload);
      return item ? item.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}
