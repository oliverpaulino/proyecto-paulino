export type EstadoTarea = "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA";

export interface TareaProps {
   id: string;
   proyecto_id: string;
   nombre: string;
   descripcion: string | null;
   estado: EstadoTarea;
   fecha_inicio: Date | null;
   fecha_fin: Date | null;
   created_at: Date;
   updated_at: Date;
}

export class Tarea {
   private constructor(private readonly props: TareaProps) { }

   static create(props: TareaProps): Tarea {
      return new Tarea(props);
   }

   get id() { return this.props.id; }
   get proyecto_id() { return this.props.proyecto_id; }
   get nombre() { return this.props.nombre; }
   get descripcion() { return this.props.descripcion; }
   get estado() { return this.props.estado; }
   get fecha_inicio() { return this.props.fecha_inicio; }
   get fecha_fin() { return this.props.fecha_fin; }
   get created_at() { return this.props.created_at; }
   get updated_at() { return this.props.updated_at; }

   toJSON(): TareaProps {
      return { ...this.props };
   }
}

export interface CreateTareaDTO {
   proyecto_id: string;
   nombre: string;
   descripcion?: string | null;
   estado?: EstadoTarea;
   fecha_inicio?: Date | string | null;
   fecha_fin?: Date | string | null;
}

export interface UpdateTareaDTO {
   nombre?: string;
   descripcion?: string | null;
   estado?: EstadoTarea;
   fecha_inicio?: Date | string | null;
   fecha_fin?: Date | string | null;
}

/** Minimal proyecto shape used to populate the project filter / create form. */
export interface ProyectoOption {
   id: string;
   nombre: string;
}

export interface ITareaRepository {
   findAll(proyectoId?: string): Promise<Tarea[]>;
   findById(id: string): Promise<Tarea | null>;
   create(data: CreateTareaDTO): Promise<Tarea>;
   update(id: string, data: UpdateTareaDTO): Promise<Tarea | null>;
   delete(id: string): Promise<boolean>;

   // Relaciones
   listProyectos(): Promise<ProyectoOption[]>;
}
