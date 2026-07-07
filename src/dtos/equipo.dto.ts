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

const EquipoEstadoHistorialSchema = z.object({
   id: z.string(),
   equipo_id: z.string(),
   estado_anterior: z.enum(ESTADOS_EQUIPO).nullable(),
   estado_nuevo: z.enum(ESTADOS_EQUIPO),
   changed_by: z.string().nullable(),
   changed_by_name: z.string().nullable(),
   nota: z.string().nullable(),
   created_at: z.coerce.date(),
});

const EquipoCompraItemSchema = z.object({
   id: z.string(),
   orden_compra_id: z.string(),
   orden_fecha: z.coerce.date(),
   orden_estado: z.string(),
   descripcion: z.string(),
   cantidad: z.number(),
   precio_unitario: z.number(),
   subtotal: z.number(),
});

const ChangeEstadoFormSchema = z.object({
   estado: z.enum(ESTADOS_EQUIPO),
   nota: z.string().optional(),
});

export type Equipo = z.infer<typeof EquipoDTO>;
export type EquipoForm = z.infer<typeof CreateEquipoDTO>;
export type UpdateEquipoForm = z.infer<typeof UpdateEquipoDTO>;
export type EquipoEstadoHistorial = z.infer<typeof EquipoEstadoHistorialSchema>;
export type EquipoCompraItem = z.infer<typeof EquipoCompraItemSchema>;
export type ChangeEstadoForm = z.infer<typeof ChangeEstadoFormSchema>;
