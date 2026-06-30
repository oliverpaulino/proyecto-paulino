import { z } from "zod";

export const TipoProyectoSchema   = z.enum(["EXPRESS", "NORMAL", "GRANDE"]);
export const EstadoProyectoSchema = z.enum(["BORRADOR", "COMPLETADO", "CANCELADO"]);

const ProyectoDetalleSchema = z.object({
   id: z.string(),
   proyecto_id: z.string(),
   descripcion: z.string(),
   cantidad: z.number(),
   precio_unitario: z.number(),
   subtotal: z.number(),
   es_cobrable: z.boolean(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const ProyectoAsignacionSchema = z.object({
   id: z.string(),
   proyecto_id: z.string(),
   empleado_id: z.string(),
   empleado_nombre: z.string().optional(),
   equipo_id: z.string(),
   equipo_nombre: z.string().optional(),
   horas_trabajadas: z.number(),
});

export const ProyectoDTO = z.discriminatedUnion("tipo_proyecto", [
   z.object({
      tipo_proyecto: z.literal("EXPRESS"),
      tipo_servicio_id: z.string().nullable(),
      tarifa_servicio: z.number(),
      id: z.string(),
      estado: EstadoProyectoSchema,
      cliente_id: z.string(),
      cliente_nombre: z.string().optional(),
      total_cobrable: z.number(),
      total_gasto_interno: z.number(),
      rentabilidad: z.number(),
      notas: z.string().nullable(),
      fecha_inicio: z.coerce.date(),
      fecha_fin: z.coerce.date().nullable(),
      detalle: z.array(ProyectoDetalleSchema),
      asignaciones: z.array(ProyectoAsignacionSchema),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
   }),
   z.object({
      tipo_proyecto: z.literal("NORMAL"),
      id: z.string(),
      estado: EstadoProyectoSchema,
      cliente_id: z.string(),
      cliente_nombre: z.string().optional(),
      total_cobrable: z.number(),
      total_gasto_interno: z.number(),
      rentabilidad: z.number(),
      notas: z.string().nullable(),
      fecha_inicio: z.coerce.date(),
      fecha_fin: z.coerce.date().nullable(),
      detalle: z.array(ProyectoDetalleSchema),
      asignaciones: z.array(ProyectoAsignacionSchema),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
   }),
   z.object({
      tipo_proyecto: z.literal("GRANDE"),
      id: z.string(),
      estado: EstadoProyectoSchema,
      cliente_id: z.string(),
      cliente_nombre: z.string().optional(),
      total_cobrable: z.number(),
      total_gasto_interno: z.number(),
      rentabilidad: z.number(),
      notas: z.string().nullable(),
      fecha_inicio: z.coerce.date(),
      fecha_fin: z.coerce.date().nullable(),
      detalle: z.array(ProyectoDetalleSchema),
      asignaciones: z.array(ProyectoAsignacionSchema),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
   }),
]);

const LineItemFormSchema = z.object({
   descripcion: z.string().min(1, "Descripción requerida"),
   cantidad: z.number().positive("Cantidad debe ser mayor a 0"),
   precio_unitario: z.number().min(0, "Precio unitario debe ser >= 0"),
});

export const CreateProyectoExpressFormSchema = z.object({
   cliente_id: z.string().min(1, "El cliente es requerido"),
   tipo_servicio_id: z.string().nullable().optional(),
   tarifa_servicio: z.number().min(0, "La tarifa debe ser >= 0"),
   empleado_id: z.string().min(1, "El operador es requerido"),
   equipo_id: z.string().min(1, "El equipo es requerido"),
   horas_trabajadas: z.number().min(0),
   notas: z.string().optional(),
   cargos_cobrables: z.array(LineItemFormSchema),
   gastos_internos: z.array(LineItemFormSchema),
});

export const LiquidacionExpressFacadeSchema = z.object({
   proyecto_id: z.string(),
   cliente_nombre: z.string(),
   tarifa_servicio: z.number(),
   cargos_cobrables: z.array(ProyectoDetalleSchema),
   gastos_internos: z.array(ProyectoDetalleSchema),
   total_cobrable: z.number(),
   total_gasto_interno: z.number(),
   rentabilidad: z.number(),
   empleado_nombre: z.string(),
   equipo_nombre: z.string(),
   horas_trabajadas: z.number(),
   fecha: z.coerce.date(),
});

export type Proyecto                    = z.infer<typeof ProyectoDTO>;
export type ProyectoExpressDTO          = Extract<Proyecto, { tipo_proyecto: "EXPRESS" }>;
export type ProyectoDetalle             = z.infer<typeof ProyectoDetalleSchema>;
export type CreateProyectoExpressForm   = z.infer<typeof CreateProyectoExpressFormSchema>;
export type LineItemForm                = z.infer<typeof LineItemFormSchema>;
export type LiquidacionExpress          = z.infer<typeof LiquidacionExpressFacadeSchema>;
export type TipoProyecto                = z.infer<typeof TipoProyectoSchema>;
export type EstadoProyecto              = z.infer<typeof EstadoProyectoSchema>;
