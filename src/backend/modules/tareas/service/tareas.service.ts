import {
   TareaProps,
   CreateTareaDTO,
   ITareaRepository,
   UpdateTareaDTO,
   EstadoTarea,
   ProyectoOption,
} from "../domain/tareas.domain";

const ESTADOS_VALIDOS: EstadoTarea[] = ["PENDIENTE", "EN_PROCESO", "COMPLETADA", "CANCELADA"];

function validarRangoFechas(inicio?: Date | string | null, fin?: Date | string | null) {
   if (!inicio || !fin) return;
   const i = inicio instanceof Date ? inicio : new Date(inicio);
   const f = fin instanceof Date ? fin : new Date(fin);
   if (i > f) {
      throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin");
   }
}

export class TareaService {
   constructor(private readonly repo: ITareaRepository) { }

   async getAll(proyectoId?: string): Promise<TareaProps[]> {
      const tareas = await this.repo.findAll(proyectoId);
      return tareas.map((t) => t.toJSON());
   }

   async getById(id: string): Promise<TareaProps | null> {
      const tarea = await this.repo.findById(id);
      return tarea ? tarea.toJSON() : null;
   }

   async create(data: CreateTareaDTO): Promise<TareaProps> {
      // proyecto_id es opcional: una tarea puede crearse sin proyecto.
      if (!data.nombre?.trim()) throw new Error("El nombre de la tarea es requerido");
      if (data.estado && !ESTADOS_VALIDOS.includes(data.estado)) {
         throw new Error("Estado de tarea inválido");
      }
      validarRangoFechas(data.fecha_inicio, data.fecha_fin);

      const tarea = await this.repo.create(data);
      return tarea.toJSON();
   }

   async update(id: string, data: UpdateTareaDTO): Promise<TareaProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("El nombre de la tarea no puede estar vacío");
      }
      if (data.estado && !ESTADOS_VALIDOS.includes(data.estado)) {
         throw new Error("Estado de tarea inválido");
      }
      validarRangoFechas(data.fecha_inicio, data.fecha_fin);

      const tarea = await this.repo.update(id, data);
      return tarea ? tarea.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }

   async getProyectos(): Promise<ProyectoOption[]> {
      return this.repo.listProyectos();
   }
}
