import { z } from "zod";

export const GrupoGastoEnum = {
   OPERATIVO: "OPERATIVO",
   ADMINISTRATIVO: "ADMINISTRATIVO",
   FINANCIERO: "FINANCIERO",
   OTRO: "OTRO",
} as const;

const GrupoGastoSchema = z.enum(
   Object.keys(GrupoGastoEnum) as [keyof typeof GrupoGastoEnum, ...(keyof typeof GrupoGastoEnum)[]]
);

export const CategoriaGastoDTO = z.object({
   id: z.string().uuid(),
   nombre: z.string(),
   grupo: GrupoGastoSchema,
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

export const CreateCategoriaGastoSchema = z.object({
   nombre: z.string().min(1, "El nombre es requerido"),
   grupo: GrupoGastoSchema,
});

export const UpdateCategoriaGastoSchema = CreateCategoriaGastoSchema.partial();

export type GrupoGasto = z.infer<typeof GrupoGastoSchema>;
export type CategoriaGasto = z.infer<typeof CategoriaGastoDTO>;
export type CreateCategoriaGastoForm = z.infer<typeof CreateCategoriaGastoSchema>;
export type UpdateCategoriaGastoForm = z.infer<typeof UpdateCategoriaGastoSchema>;