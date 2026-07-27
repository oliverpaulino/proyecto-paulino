import {
   CloseMantenimientoDTO,
   CreateMantenimientoDTO,
   ESTADOS_MANTENIMIENTO,
   IMantenimientoRepository,
   MantenimientoFilters,
   MantenimientoProps,
   TIPOS_MANTENIMIENTO,
   UpdateMantenimientoDTO,
} from "../domain/mantenimiento.domain";

const TIPOS = new Set<string>(TIPOS_MANTENIMIENTO);
const ESTADOS = new Set<string>(ESTADOS_MANTENIMIENTO);

export class MantenimientoService {
   constructor(private readonly repo: IMantenimientoRepository) { }

   async getAll(params?: MantenimientoFilters): Promise<MantenimientoProps[]> {
      const items = await this.repo.findAll(params);
      return items.map((m) => m.toJSON());
   }

   async getById(id: string): Promise<MantenimientoProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }

   async getByEquipoId(equipoId: string): Promise<MantenimientoProps[]> {
      const items = await this.repo.findByEquipoId(equipoId);
      return items.map((m) => m.toJSON());
   }

   /** El mantenimiento abierto que el diálogo de reactivación debe cerrar. */
   async getAbiertoByEquipoId(equipoId: string): Promise<MantenimientoProps | null> {
      const item = await this.repo.findAbiertoByEquipoId(equipoId);
      return item ? item.toJSON() : null;
   }

   async create(data: CreateMantenimientoDTO): Promise<MantenimientoProps> {
      if (!data.equipo_id) throw new Error("Equipo es requerido");
      if (!data.descripcion?.trim()) throw new Error("Descripción es requerida");
      if (data.tipo !== undefined && !TIPOS.has(data.tipo)) {
         throw new Error("Tipo de mantenimiento inválido");
      }
      this.validateCosto(data.costo);
      this.validateRangoFechas(data.fecha_inicio, data.fecha_fin);

      // Un equipo no puede tener dos mantenimientos abiertos a la vez: el
      // diálogo de reactivación no sabría cuál cerrar.
      if (data.fecha_fin == null) {
         const abierto = await this.repo.findAbiertoByEquipoId(data.equipo_id);
         if (abierto) {
            throw new Error(
               "Este equipo ya tiene un mantenimiento abierto. Ciérralo antes de registrar otro."
            );
         }
      }

      const item = await this.repo.create({
         ...data,
         descripcion: data.descripcion.trim(),
         costo: data.costo != null ? Number(data.costo) : null,
      });
      return item.toJSON();
   }

   async update(id: string, data: UpdateMantenimientoDTO): Promise<MantenimientoProps | null> {
      if (data.descripcion !== undefined && !data.descripcion.trim()) {
         throw new Error("Descripción es requerida");
      }
      if (data.tipo !== undefined && !TIPOS.has(data.tipo)) {
         throw new Error("Tipo de mantenimiento inválido");
      }
      this.validateCosto(data.costo);

      const actual = await this.repo.findById(id);
      if (!actual) return null;
      this.validateRangoFechas(
         data.fecha_inicio ?? actual.fecha_inicio,
         data.fecha_fin !== undefined ? data.fecha_fin : actual.fecha_fin
      );

      const item = await this.repo.update(id, {
         ...data,
         costo: data.costo != null ? Number(data.costo) : data.costo,
      });
      return item ? item.toJSON() : null;
   }

   async close(id: string, data: CloseMantenimientoDTO): Promise<MantenimientoProps | null> {
      if (!data.trabajo_realizado?.trim()) {
         throw new Error("Debes describir el trabajo realizado");
      }
      this.validateCosto(data.costo);
      this.validateCosto(data.monto_gasto_nuevo);

      if (data.crear_gasto) {
         const monto = Number(data.monto_gasto_nuevo ?? data.costo ?? 0);
         if (monto > 0 && !data.categoria_gasto_id) {
            throw new Error("Categoría de gasto es requerida para crear el gasto");
         }
      }

      const actual = await this.repo.findById(id);
      if (!actual) return null;
      this.validateRangoFechas(actual.fecha_inicio, data.fecha_fin ?? new Date());

      const item = await this.repo.close(id, {
         ...data,
         trabajo_realizado: data.trabajo_realizado.trim(),
         costo: data.costo != null ? Number(data.costo) : null,
      });
      return item ? item.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }

   private validateCosto(costo: number | null | undefined): void {
      if (costo == null) return;
      const n = Number(costo);
      if (Number.isNaN(n) || n < 0) {
         throw new Error("El costo debe ser un número mayor o igual a 0");
      }
   }

   private validateRangoFechas(
      inicio: Date | string | undefined,
      fin: Date | string | null | undefined
   ): void {
      if (!inicio || fin == null) return;
      const desde = new Date(inicio);
      const hasta = new Date(fin);
      if (hasta < desde) {
         throw new Error("La fecha de fin no puede ser anterior a la fecha de inicio");
      }
   }
}
