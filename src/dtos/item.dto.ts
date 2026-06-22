import { z } from "zod";

const ItemDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   tipo_id: z.string(),
   descripcion: z.string().nullable(),
   unidad: z.string().nullable(),
   stock: z.number(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
   // joined from tipo_item on reads
   tipo_nombre: z.string().nullable().optional(),
});

const CreateItemDTO = z.object({
   nombre: z.string().min(1),
   tipo_id: z.string().uuid(),
   descripcion: z.string().nullable().optional(),
   unidad: z.string().nullable().optional(),
   stock: z.coerce.number().min(0).optional(),
});

const UpdateItemDTO = CreateItemDTO.partial();

export type Item = z.infer<typeof ItemDTO>;
export type ItemForm = z.infer<typeof CreateItemDTO>;
export type UpdateItemForm = z.infer<typeof UpdateItemDTO>;
