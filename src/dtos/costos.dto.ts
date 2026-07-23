import { z } from "zod";

export const CostoDTO = z.object({
   id: z.string().uuid(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   monto_total: z.number(),
   concepto: z.string(),
   ncf: z.string(),

   proyecto_id: z.string().uuid(),
   //join proyecto
   proyecto_codigo_referencia: z.string().nullable(),

   orden_compra_id: z.string().uuid().nullable(),
   //join oc
   orden_compra_codigo_referencia: z.string().nullable(),
   
   fecha: z.coerce.date(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
   deleted_by: z.string().nullable(),
   deleted_at: z.coerce.date().nullable(),
   deleted_reason: z.string().nullable(),
});

export const CreateCostoSchema = z.object({
   proyecto_id: z.string().uuid("ID de proyecto inválido"),
   monto_total: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
   concepto: z.string().min(1, "El concepto es requerido"),
   ncf: z.string().min(1, "El NCF es requerido"),
   fecha: z.coerce.date(),
   orden_compra_id: z.string().uuid().optional().nullable(),
});

export const UpdateCostoSchema = CreateCostoSchema.partial();

export const DeleteCostoSchema = z.object({
   deleted_by: z.string().uuid().optional(),
   deleted_reason: z.string().min(1, "Debe proveer una razón").optional(),
});

export type Costo = z.infer<typeof CostoDTO>;
export type CreateCostoForm = z.infer<typeof CreateCostoSchema>;
export type UpdateCostoForm = z.infer<typeof UpdateCostoSchema>;
export type DeleteCostoForm = z.infer<typeof DeleteCostoSchema>;