import { z } from "zod";

export const DeduccionDTO = z.object({
   id: z.string().uuid(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   monto_total: z.number(),
   balance_pendiente: z.number().nullable(),
   concepto: z.string(),

   empleado_id: z.string().uuid(),
   //join empleado
   empleado_nombre: z.string().nullable(),

   equipo_id: z.string().uuid().nullable(),
   //join equipo
   equipo_codigo_referencia: z.string().nullable(),
   
   fecha: z.coerce.date(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
   deleted_by: z.string().nullable(),
   deleted_at: z.coerce.date().nullable(),
   deleted_reason: z.string().nullable(),
});

export const CreateDeduccionSchema = z.object({
   empleado_id: z.string().uuid("ID de empleado inválido"),
   equipo_id: z.string().uuid().optional().nullable(),
   monto_total: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
   balance_pendiente: z.coerce.number().optional().nullable(),
   concepto: z.string().min(1, "El concepto es requerido"),
   fecha: z.coerce.date(),
});

export const UpdateDeduccionSchema = CreateDeduccionSchema.partial();

export const DeleteDeduccionSchema = z.object({
   deleted_by: z.string().uuid().optional(),
   deleted_reason: z.string().min(1, "Debe proveer una razón").optional(),
});

export type Deduccion = z.infer<typeof DeduccionDTO>;
export type CreateDeduccionForm = z.infer<typeof CreateDeduccionSchema>;
export type UpdateDeduccionForm = z.infer<typeof UpdateDeduccionSchema>;
export type DeleteDeduccionForm = z.infer<typeof DeleteDeduccionSchema>;