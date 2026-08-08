import { z } from "zod";

export const PagoDeduccionDTO = z.object({
   id: z.uuid(),
   fecha: z.coerce.date(),
   monto: z.number(),
   via: z.enum(["NOMINA", "DIRECTO"]),
   referencia: z.string().nullable(),
   metodo_pago: z.string().nullable(),
});

export const DeduccionDTO = z.object({
   id: z.uuid(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   monto_total: z.number(),
   balance_pendiente: z.number().nullable(),
   cuotas_sugeridas: z.number(),
   monto_sugerido: z.number(),
   monto_cuota: z.number(),
   cuotas_aplicadas: z.number(),
   monto_cobrado: z.number(),
   monto_pendiente: z.number(),
   pagos: z.array(PagoDeduccionDTO),
   concepto: z.string(),

   empleado_id: z.uuid(),
   //join empleado
   empleado_nombre: z.string().nullable(),
   empleado_codigo_referencia: z.string().nullable(),

   equipo_id: z.uuid().nullable(),
   //join equipo
   equipo_codigo_referencia: z.string().nullable(),
   
   gasto_id: z.uuid().nullable(),
   //join equipo
   gasto_codigo_referencia: z.string().nullable(),

   fecha: z.coerce.date(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
   deleted_by: z.string().nullable(),
   deleted_at: z.coerce.date().nullable(),
   deleted_reason: z.string().nullable(),
});

export const CreateDeduccionSchema = z.object({
   empleado_id: z.uuid("ID de empleado inválido"),
   equipo_id: z.uuid().optional().nullable(),
   gasto_id: z.uuid().optional().nullable(),
   monto_total: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
   balance_pendiente: z.coerce.number().optional().nullable(),
   cuotas_sugeridas: z.coerce.number().int().min(1, "Las cuotas sugeridas deben ser mayores a 0").optional(),
   concepto: z.string().min(1, "El concepto es requerido"),
   fecha: z.coerce.date(),
});

export const UpdateDeduccionSchema = CreateDeduccionSchema.partial();

export const DeleteDeduccionSchema = z.object({
   deleted_by: z.uuid().optional(),
   deleted_reason: z.string().min(1, "Debe proveer una razón").optional(),
});

export const PagarDeduccionSchema = z.object({
   monto: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
   metodo_pago: z.string().min(1, "El método de pago es requerido").optional(),
   concepto: z.string().optional(),
   fecha: z.coerce.date().optional(),
});

export type Deduccion = z.infer<typeof DeduccionDTO>;
export type CreateDeduccionForm = z.infer<typeof CreateDeduccionSchema>;
export type UpdateDeduccionForm = z.infer<typeof UpdateDeduccionSchema>;
export type DeleteDeduccionForm = z.infer<typeof DeleteDeduccionSchema>;
export type PagarDeduccionForm = z.infer<typeof PagarDeduccionSchema>;