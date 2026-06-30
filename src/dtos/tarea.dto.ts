import { z } from "zod";

// Mirror the Postgres `estado_tarea` enum. Kept here (and not imported from the
// backend domain) so client components can pull it without dragging server-only
// modules into the bundle.
export const ESTADOS_TAREA = ["PENDIENTE", "EN_PROGRESO", "COMPLETADA"] as const;

export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

/** Valor del <Select> que representa "Sin proyecto" (proyecto_id = null). */
export const SIN_PROYECTO = "__none__";

/** Display labels for each estado (Spanish, used in Kanban columns / table). */
export const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
   PENDIENTE: "Pendiente",
   EN_PROGRESO: "En progreso",
   COMPLETADA: "Completada",
};

const TareaDTO = z.object({
   id: z.string(),
   proyecto_id: z.string().nullable(),
   nombre: z.string(),
   descripcion: z.string().nullable(),
   estado: z.enum(ESTADOS_TAREA),
   fecha_inicio: z.coerce.date().nullable(),
   fecha_fin: z.coerce.date().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateTareaDTO = z.object({
   proyecto_id: z.string().nullable().optional(),
   nombre: z.string().min(1),
   descripcion: z.string().nullable().optional(),
   estado: z.enum(ESTADOS_TAREA).optional(),
   fecha_inicio: z.coerce.date().nullable().optional(),
   fecha_fin: z.coerce.date().nullable().optional(),
});

const UpdateTareaDTO = CreateTareaDTO.partial();

export type Tarea = z.infer<typeof TareaDTO>;
export type TareaForm = z.infer<typeof CreateTareaDTO>;
export type UpdateTareaForm = z.infer<typeof UpdateTareaDTO>;

/** Minimal proyecto shape used by the project filter / create form. */
export type ProyectoOption = {
   id: string;
   nombre: string;
};
