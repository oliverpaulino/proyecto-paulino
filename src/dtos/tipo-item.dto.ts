import { z } from "zod";

const TipoItemDTO = z.object({
   id: z.uuid(),
   nombre: z.string(),
   descripcion: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateTipoItemDTO = z.object({
   nombre: z.string().min(1),
   descripcion: z.string().nullable().optional(),
});

const UpdateTipoItemDTO = CreateTipoItemDTO.partial();

export type TipoItem = z.infer<typeof TipoItemDTO>;
export type TipoItemForm = z.infer<typeof CreateTipoItemDTO>;
export type UpdateTipoItemForm = z.infer<typeof UpdateTipoItemDTO>;
