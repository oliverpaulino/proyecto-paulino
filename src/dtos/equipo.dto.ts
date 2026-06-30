import { z } from "zod";

export const ESTADOS_EQUIPO = [
   "ACTIVO",
   "MANTENIMIENTO",
   "INACTIVO",
   "BAJA",
] as const;

export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];

const EquipoDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   categoria_id: z.string().uuid(),
   categoria_nombre: z.string(),
   cobra_en: z.string(),
   cobra_minimo: z.number().nullable(),
   estado: z.enum(ESTADOS_EQUIPO),
   costo_por_hora: z.number(),
   placa: z.string().nullable(),
   modelo: z.string().nullable(),
   ano: z.number().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateEquipoDTO = z.object({
   nombre: z.string().min(1),
   categoria_id: z.string().uuid(),
   estado: z.enum(ESTADOS_EQUIPO).optional(),
   costo_por_hora: z.coerce.number().min(0).optional(),
   placa: z.string().nullable().optional(),
   modelo: z.string().nullable().optional(),
   ano: z.coerce.number().int().nullable().optional(),
});

const UpdateEquipoDTO = CreateEquipoDTO.partial();

export type Equipo = z.infer<typeof EquipoDTO>;
export type EquipoForm = z.infer<typeof CreateEquipoDTO>;
export type UpdateEquipoForm = z.infer<typeof UpdateEquipoDTO>;
