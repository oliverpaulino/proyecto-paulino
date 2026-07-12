import { z } from "zod";

export const TipoUnidadEnum = {
  LONGITUD: "LONGITUD",
  AREA: "AREA",
  VOLUMEN: "VOLUMEN",
  TIEMPO: "TIEMPO",
  FRECUENCIA: "FRECUENCIA",
  MASA: "MASA",
  OTRO: "OTRO",
} as const;

const TipoUnidadSchema = z.enum(
  Object.keys(TipoUnidadEnum) as [keyof typeof TipoUnidadEnum, ...(keyof typeof TipoUnidadEnum)[]]
);

export const UnitDTO = z.object({
    id: z.string().uuid(),
    nombre: z.string().min(1, "El nombre es obligatorio"),
    abreviatura: z.string().min(1, "La abreviatura es obligatoria"),
    tipo_unidad: TipoUnidadSchema,
    factor_a_base: z.number().positive("El factor de conversión debe ser un número positivo"),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
});

export const CreateUnitDTO = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    abreviatura: z.string().min(1, "La abreviatura es obligatoria"),
    tipo_unidad: TipoUnidadSchema,
    factor_a_base: z.number().positive("El factor de conversión debe ser un número positivo"),
});

export const UpdateUnitDTO = CreateUnitDTO.partial();

export const ConversionResultDTO = z.object({
   valorOrigen: z.number(),
   unidadOrigen: z.string(),
   valorDestino: z.number(),
   unidadDestino: z.string(),
   factor: z.number(),
});

export type ConversionResult = z.infer<typeof ConversionResultDTO>;

export type Unit = z.infer<typeof UnitDTO>;
export type TipoUnidad = z.infer<typeof TipoUnidadSchema>;
export type CreateUnitForm = z.infer<typeof CreateUnitDTO>;
export type UpdateUnitForm = z.infer<typeof UpdateUnitDTO>;