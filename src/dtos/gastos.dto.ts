import { z } from "zod";

export const EntidadResponsableEnum = {
   CLIENTE: "CLIENTE",
   EMPLEADO: "EMPLEADO",
   EMPRESA: "EMPRESA",
} as const;

const EntidadResponsableSchema = z.enum(
   Object.keys(EntidadResponsableEnum) as [keyof typeof EntidadResponsableEnum, ...(keyof typeof EntidadResponsableEnum)[]]
);

export const GastoDTO = z.object({
   id: z.uuid(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   monto_total: z.number(),
   concepto: z.string(),
   ncf: z.string(),
   entidad_responsable: EntidadResponsableSchema,
   categoria_gasto_id: z.uuid(),

   //join categoria
   categoria_gasto_nombre: z.string(),
   categoria_gasto_grupo: z.string(),

   orden_compra_id: z.uuid().nullable(),
   proyecto_id: z.uuid().nullable(),
   equipo_id: z.uuid().nullable(),
   empleado_id: z.uuid().nullable(),
   fecha: z.coerce.date(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
   deleted_by: z.string().nullable(),
   deleted_at: z.coerce.date().nullable(),
   deleted_reason: z.string().nullable(),
});

export const CreateGastoSchema = z.object({
   monto_total: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
   concepto: z.string().min(1, "El concepto es requerido"),
   ncf: z.string().min(1, "El NCF es requerido"),
   fecha: z.coerce.date(),
   entidad_responsable: EntidadResponsableSchema,
   categoria_gasto_id: z.uuid("ID de categoría inválido"),
   orden_compra_id: z.uuid().optional().nullable(),
   proyecto_id: z.uuid().optional().nullable(),
   equipo_id: z.uuid().optional().nullable(),
   empleado_id: z.uuid().optional().nullable(),
});

export const UpdateGastoSchema = CreateGastoSchema.partial();

export const DeleteGastoSchema = z.object({
   deleted_by: z.uuid().optional(),
   deleted_reason: z.string().min(1, "Debe proveer una razón").optional(),
});

export type EntidadResponsable = z.infer<typeof EntidadResponsableSchema>;
export type Gasto = z.infer<typeof GastoDTO>;
export type CreateGastoForm = z.infer<typeof CreateGastoSchema>;
export type UpdateGastoForm = z.infer<typeof UpdateGastoSchema>;
export type DeleteGastoForm = z.infer<typeof DeleteGastoSchema>;