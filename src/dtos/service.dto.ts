import { z } from "zod";

export const TipoServicio = {
  REGADO: "Regado",
  BOTE: "Bote",
  CORTE_Y_BOTE: "Corte y bote",
  NIVELACION: "Nivelación",
  COMPACTACION: "Compactación",
  OTRO: "Otro",
} as const;

const TipoServicioSchema = z.enum(
  Object.keys(TipoServicio) as [
    keyof typeof TipoServicio,
    ...(keyof typeof TipoServicio)[]
  ]
);

export const ServicioSchemasDTO = {
  TipoServicioSchema,
};

const ServicioDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   tipo: ServicioSchemasDTO.TipoServicioSchema,
   descripcion: z.string().nullable(),
   precio_base: z.coerce.number(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateServicioDTO = z.object({
   nombre: z.string().min(1),
   tipo: ServicioSchemasDTO.TipoServicioSchema,
   descripcion: z.string().nullable().optional(),
   precio_base: z.coerce.number().min(0).optional(),
});

const UpdateServicioDTO = CreateServicioDTO.partial();

export type Servicio = z.infer<typeof ServicioDTO>;
export type ServicioForm = z.infer<typeof CreateServicioDTO>;
export type UpdateServicioForm = z.infer<typeof UpdateServicioDTO>;
export type TipoServicio = z.infer<typeof TipoServicioSchema>;
