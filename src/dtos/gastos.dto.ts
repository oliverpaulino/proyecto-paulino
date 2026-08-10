import { z } from "zod";

export const GastoDTO = z.object({
   id: z.uuid(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   monto_total: z.number(),
   concepto: z.string(),
   ncf: z.string().nullable(),

   categoria_gasto_id: z.uuid(),
   //join categoria
   categoria_gasto_nombre: z.string(),
   categoria_gasto_grupo: z.string(),

   orden_compra_id: z.uuid().nullable(),
   //join oc
   orden_compra_codigo_referencia: z.string().nullable(),

   proyecto_id: z.uuid().nullable(),
   //join proyecto
   proyecto_codigo_referencia: z.string().nullable(),

   equipo_id: z.uuid().nullable(),
   //join equipo
   equipo_codigo_referencia: z.string().nullable(),

   cobrable_proyecto: z.boolean(),
   cobrable_monto: z.number().nullable(),

   // Ítem facturable (para la factura del proyecto).
   cantidad: z.number(),
   monto_unitario: z.number().nullable(),
   
   fecha: z.coerce.date(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
   deleted_by: z.string().nullable(),
   deleted_at: z.coerce.date().nullable(),
   deleted_reason: z.string().nullable(),
});

export const CreateGastoDeduccionSchema = z.object({
   empleado_id: z.uuid("ID de empleado inválido"),
   equipo_id: z.uuid().optional().nullable(),
   monto_total: z.coerce.number().min(0.01, "El monto de la deducción debe ser mayor a 0"),
   balance_pendiente: z.coerce.number().optional().nullable(),
   cuotas_sugeridas: z.coerce.number().int().min(1, "Las cuotas sugeridas deben ser mayores a 0").optional(),
   concepto: z.string().min(1, "El concepto es requerido"),
   fecha: z.coerce.date(),
});

export const CreateGastoSchema = z.object({
   monto_total: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
   concepto: z.string().min(1, "El concepto es requerido"),
   ncf: z.string().nullable(),
   fecha: z.coerce.date(),
   categoria_gasto_id: z.uuid("ID de categoría inválido"),
   orden_compra_id: z.uuid().optional().nullable(),
   proyecto_id: z.uuid().optional().nullable(),
   equipo_id: z.uuid().optional().nullable(),
   cobrable_proyecto: z.boolean().default(false),
   cobrable_monto: z.coerce.number().min(0, "El monto a cobrar al cliente no puede ser menor a 0").optional().nullable(),
   cantidad: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1").optional(),
   monto_unitario: z.coerce.number().min(0, "El precio unitario no puede ser menor a 0").optional().nullable(),
   deduccion: CreateGastoDeduccionSchema.optional(),
});

export const UpdateGastoSchema = CreateGastoSchema.omit({ deduccion: true }).partial();

export const MoveCobrableSchema = z.object({
   cobrable_proyecto: z.boolean(),
   cobrable_monto: z.coerce.number().min(0, "El monto a cobrar al cliente no puede ser menor a 0").nullable().optional(),
});

export const DeleteGastoSchema = z.object({
   deleted_by: z.uuid().optional(),
   deleted_reason: z.string().min(1, "Debe proveer una razón").optional(),
});

export type Gasto = z.infer<typeof GastoDTO>;
export type CreateGastoForm = z.infer<typeof CreateGastoSchema>;
export type UpdateGastoForm = z.infer<typeof UpdateGastoSchema>;
export type DeleteGastoForm = z.infer<typeof DeleteGastoSchema>;
export type MoveCobrableForm = z.infer<typeof MoveCobrableSchema>;