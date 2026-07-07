import { z } from "zod";

const CategoriaEquipoDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   cobra_en: z.string(),
   cobra_minimo: z.number().nullable(),
   precio_unitario: z.number().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateCategoriaEquipoDTO = z.object({
   nombre: z.string().min(1),
   cobra_en: z.string().min(1),
   cobra_minimo: z.coerce.number().min(0).nullable().optional(),
   precio_unitario: z.coerce.number().min(0).nullable().optional(),
});

const UpdateCategoriaEquipoDTO = CreateCategoriaEquipoDTO.partial();

export type CategoriaEquipo = z.infer<typeof CategoriaEquipoDTO>;
export type CategoriaEquipoForm = z.infer<typeof CreateCategoriaEquipoDTO>;
export type UpdateCategoriaEquipoForm = z.infer<typeof UpdateCategoriaEquipoDTO>;
