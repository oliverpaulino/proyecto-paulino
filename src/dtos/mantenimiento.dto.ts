import { z } from "zod";

export const TIPOS_MANTENIMIENTO = ["PREVENTIVO", "CORRECTIVO"] as const;
export type TipoMantenimiento = (typeof TIPOS_MANTENIMIENTO)[number];

export const ESTADOS_MANTENIMIENTO = ["EN_PROCESO", "COMPLETADO"] as const;
export type EstadoMantenimiento = (typeof ESTADOS_MANTENIMIENTO)[number];

export const TIPO_MANTENIMIENTO_LABEL: Record<TipoMantenimiento, string> = {
   PREVENTIVO: "Preventivo",
   CORRECTIVO: "Correctivo",
};

export const ESTADO_MANTENIMIENTO_LABEL: Record<EstadoMantenimiento, string> = {
   EN_PROCESO: "En proceso",
   COMPLETADO: "Completado",
};

export const ESTADO_MANTENIMIENTO_BADGE: Record<EstadoMantenimiento, string> = {
   EN_PROCESO:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
   COMPLETADO:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export const TIPO_MANTENIMIENTO_BADGE: Record<TipoMantenimiento, string> = {
   PREVENTIVO:
      "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
   CORRECTIVO:
      "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

const MantenimientoGastoSchema = z.object({
   id: z.string(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   concepto: z.string(),
   monto_total: z.number(),
   fecha: z.coerce.date(),
   categoria_gasto_nombre: z.string().nullable(),
});

const MantenimientoSchema = z.object({
   id: z.string(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   equipo_id: z.string(),
   equipo_nombre: z.string(),
   equipo_referencia: z.number(),
   equipo_placa: z.string().nullable(),
   tipo: z.enum(TIPOS_MANTENIMIENTO),
   estado: z.enum(ESTADOS_MANTENIMIENTO),
   descripcion: z.string(),
   taller: z.string().nullable(),
   trabajo_realizado: z.string().nullable(),
   costo: z.number().nullable(),
   gastos: z.array(MantenimientoGastoSchema).default([]),
   fecha_inicio: z.coerce.date(),
   fecha_fin: z.coerce.date().nullable(),
   created_by: z.string().nullable(),
   created_by_name: z.string().nullable(),
   closed_by: z.string().nullable(),
   closed_by_name: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateMantenimientoSchema = z.object({
   equipo_id: z.string().min(1, "Equipo es requerido"),
   tipo: z.enum(TIPOS_MANTENIMIENTO).optional(),
   descripcion: z.string().min(1, "Descripción es requerida"),
   taller: z.string().nullable().optional(),
   fecha_inicio: z.string().optional(),
   fecha_fin: z.string().nullable().optional(),
   trabajo_realizado: z.string().nullable().optional(),
   costo: z.coerce.number().min(0).nullable().optional(),
   gasto_ids: z.array(z.string()).optional(),
   crear_gasto: z.boolean().optional(),
   categoria_gasto_id: z.string().nullable().optional(),
});

const UpdateMantenimientoSchema = CreateMantenimientoSchema.partial().omit({
   equipo_id: true,
});

const CloseMantenimientoSchema = z.object({
   trabajo_realizado: z.string().min(1, "Debes describir el trabajo realizado"),
   fecha_fin: z.string().optional(),
   costo: z.coerce.number().min(0).nullable().optional(),
   crear_gasto: z.boolean().optional(),
   categoria_gasto_id: z.string().nullable().optional(),
   monto_gasto_nuevo: z.coerce.number().min(0).nullable().optional(),
   gasto_ids: z.array(z.string()).optional(),
});

export type Mantenimiento = z.infer<typeof MantenimientoSchema>;
export type MantenimientoGasto = z.infer<typeof MantenimientoGastoSchema>;
export type CreateMantenimientoForm = z.infer<typeof CreateMantenimientoSchema>;
export type UpdateMantenimientoForm = z.infer<typeof UpdateMantenimientoSchema>;
export type CloseMantenimientoForm = z.infer<typeof CloseMantenimientoSchema>;
