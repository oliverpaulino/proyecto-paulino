import { z } from "zod";

// Mirror the Postgres enums. Kept here (and not imported from the backend domain)
// so client components can pull them without dragging server-only modules into the bundle.
export const TIPOS_EQUIPO = [
   "EXCAVADORA",
   "RETROEXCAVADORA",
   "BULLDOZER",
   "GRUA",
   "CAMION",
   "CARGADOR",
   "COMPACTADORA",
   "MONTACARGAS",
   "GENERADOR",
   "OTRO",
] as const;

export const ESTADOS_EQUIPO = [
   "ACTIVO",
   "MANTENIMIENTO",
   "INACTIVO",
   "BAJA",
] as const;

export type TipoEquipo = (typeof TIPOS_EQUIPO)[number];
export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];

const EquipoDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   tipo: z.enum(TIPOS_EQUIPO),
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
   tipo: z.enum(TIPOS_EQUIPO),
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
