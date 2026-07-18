import { z } from "zod";

export const TarifaCategoriaDTO = z.object({
   id: z.string().optional(),
   nombre: z.string().min(1, "El nombre de la tarifa es requerido"), // Ej: Bote, Viaje
   medida_cobro_id: z.string().min(1, "La unidad de medida es requerida"),
   precio_unitario: z.coerce.number().min(0, "El precio no puede ser negativo"),
   cobra_minimo: z.coerce.number().min(0).nullable().optional(),
});

const CategoriaEquipoDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   tarifas: z.array(TarifaCategoriaDTO),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateCategoriaEquipoDTO = z.object({
   nombre: z.string().min(1, "El nombre es requerido"),
   tarifas: z.array(TarifaCategoriaDTO).min(1, "Debe agregar al menos una tarifa"),
});

const UpdateCategoriaEquipoDTO = CreateCategoriaEquipoDTO.partial();

export type TarifaCategoria = z.infer<typeof TarifaCategoriaDTO>;
export type CategoriaEquipo = z.infer<typeof CategoriaEquipoDTO>;
export type CategoriaEquipoForm = z.infer<typeof CreateCategoriaEquipoDTO>;
export type UpdateCategoriaEquipoForm = z.infer<typeof UpdateCategoriaEquipoDTO>;