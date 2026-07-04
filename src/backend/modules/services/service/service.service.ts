import {
   CreateServicioDTO,
   IServicioRepository,
   ServicioProps,
   TipoServicio,
   UpdateServicioDTO,
} from "../domain/service.domain";

const TIPOS_VALIDOS: TipoServicio[] = [
   "REGADO",
   "BOTE",
   "CORTE_Y_BOTE",
   "NIVELACION",
   "COMPACTACION",
   "OTRO",
];

export class ServicioService {
   constructor(private readonly repo: IServicioRepository) { }

   async getAll(): Promise<ServicioProps[]> {
      const servicios = await this.repo.findAll();
      return servicios.map((s) => s.toJSON());
   }

   async getById(id: string): Promise<ServicioProps | null> {
      const servicio = await this.repo.findById(id);
      return servicio ? servicio.toJSON() : null;
   }

   async create(data: CreateServicioDTO): Promise<ServicioProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (!data.tipo || !TIPOS_VALIDOS.includes(data.tipo)) {
         throw new Error("Tipo de servicio inválido");
      }
      if (data.precio_base !== undefined && data.precio_base !== null) {
         if (typeof data.precio_base !== "number" || Number.isNaN(data.precio_base)) {
            throw new Error("El precio base debe ser un número");
         }
         if (data.precio_base < 0) {
            throw new Error("El precio base no puede ser negativo");
         }
      }

      const servicio = await this.repo.create(data);
      return servicio.toJSON();
   }

   async update(id: string, data: UpdateServicioDTO): Promise<ServicioProps | null> {
      if (data.nombre !== undefined && !data.nombre?.trim()) {
         throw new Error("Nombre es requerido");
      }
      if (data.tipo !== undefined && !TIPOS_VALIDOS.includes(data.tipo)) {
         throw new Error("Tipo de servicio inválido");
      }
      if (data.precio_base !== undefined && data.precio_base !== null) {
         if (typeof data.precio_base !== "number" || Number.isNaN(data.precio_base)) {
            throw new Error("El precio base debe ser un número");
         }
         if (data.precio_base < 0) {
            throw new Error("El precio base no puede ser negativo");
         }
      }

      const servicio = await this.repo.update(id, data);
      return servicio ? servicio.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}
