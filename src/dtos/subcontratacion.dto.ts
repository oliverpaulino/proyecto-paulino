import { z } from "zod";

export const EstadoTrabajoEnum = {
   PENDIENTE: "PENDIENTE",
   EN_PROGRESO: "EN_PROGRESO",
   TERMINADA: "TERMINADA",
   CANCELADA: "CANCELADA",
} as const;

const EstadoTrabajoSchema = z.enum(
   Object.keys(EstadoTrabajoEnum) as [keyof typeof EstadoTrabajoEnum, ...(keyof typeof EstadoTrabajoEnum)[]]
);

export const EstadoPagoEnum = {
   PENDIENTE: "PENDIENTE",
   PARCIAL: "PARCIAL",
   PAGADO: "PAGADO",
} as const;

const EstadoPagoSchema = z.enum(
   Object.keys(EstadoPagoEnum) as [keyof typeof EstadoPagoEnum, ...(keyof typeof EstadoPagoEnum)[]]
);

const metodoPagoSchema = z.enum(["CHEQUE", "EFECTIVO", "TRANSFERENCIA", "TARJETA", "DESCUENTO_NOMINA"]);

export const SubcontratacionDTO = z.object({
   id: z.string().uuid(),
   referencia: z.number(),
   codigoReferencia: z.string(),

   proveedor_id: z.string().uuid(),
   proveedor_nombre: z.string().nullable(),
   proveedor_tipo: z.string().nullable(),
   proveedor_rnc: z.string().nullable(),

   proyecto_id: z.string().uuid().nullable(),
   proyecto_nombre: z.string().nullable(),

   equipo_id: z.string().uuid().nullable(),
   equipo_nombre: z.string().nullable(),
   equipo_codigo_referencia: z.string().nullable(),

   trabajo_descripcion: z.string().nullable(),
   monto_total: z.number(),
   estado_trabajo: EstadoTrabajoSchema,
   fecha_deuda: z.coerce.date(),
   fecha_inicio: z.coerce.date().nullable(),
   fecha_fin: z.coerce.date().nullable(),
   observaciones: z.string().nullable(),

   gasto_id: z.string().uuid().nullable(),
   gasto_codigo_referencia: z.string().nullable(),

   pagado: z.number(),
   pendiente: z.number(),
   estado_pago: EstadoPagoSchema,
   ultimo_pago_fecha: z.coerce.date().nullable(),
   cantidad_pagos: z.number(),

   created_by: z.string().nullable(),
   created_by_name: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
   deleted_by: z.string().nullable(),
   deleted_at: z.coerce.date().nullable(),
   deleted_reason: z.string().nullable(),
});

export const CreateSubcontratacionSchema = z.object({
   proveedor_id: z.string().uuid("Seleccione un subcontratista"),
   proyecto_id: z.string().uuid().optional().nullable(),
   equipo_id: z.string().uuid().optional().nullable(),
   trabajo_descripcion: z.string().optional().nullable(),
   monto_total: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
   estado: EstadoTrabajoSchema.optional(),
   fecha_deuda: z.coerce.date("La fecha de la deuda es requerida"),
   fecha_inicio: z.coerce.date().optional().nullable(),
   fecha_fin: z.coerce.date().optional().nullable(),
   observaciones: z.string().optional().nullable(),
   categoria_gasto_id: z.string().uuid("Seleccione una categoría de gasto"),
});

export const UpdateSubcontratacionSchema = CreateSubcontratacionSchema.partial();

export const CambiarEstadoSchema = z.object({
   estado: EstadoTrabajoSchema,
});

export const CrearPagoSchema = z.object({
   monto_pagado: z.coerce.number().min(0.01, "El monto del pago debe ser mayor a 0"),
   metodo_pago: metodoPagoSchema,
   fecha: z.coerce.date(),
   concepto: z.string().optional().nullable(),
});

export const CrearApunteSchema = z.object({
   texto: z.string().min(1, "El apunte es requerido"),
});

export const DeleteSubcontratacionSchema = z.object({
   deleted_by: z.string().uuid().optional(),
   deleted_reason: z.string().min(1, "Debe proveer una razón").optional(),
});

export type Subcontratacion = z.infer<typeof SubcontratacionDTO>;
export type CreateSubcontratacionForm = z.infer<typeof CreateSubcontratacionSchema>;
export type UpdateSubcontratacionForm = z.infer<typeof UpdateSubcontratacionSchema>;
export type EstadoTrabajo = z.infer<typeof EstadoTrabajoSchema>;
export type EstadoPago = z.infer<typeof EstadoPagoSchema>;
export type CrearPagoForm = z.infer<typeof CrearPagoSchema>;
export type CrearApunteForm = z.infer<typeof CrearApunteSchema>;
