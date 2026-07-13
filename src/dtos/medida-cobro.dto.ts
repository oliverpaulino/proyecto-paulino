import { z } from "zod";

const MedidaCobroDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   descripcion: z.string().nullable(),
   permite_decimales: z.boolean(),
   is_active: z.boolean(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateMedidaCobroDTO = z.object({
   nombre: z.string().min(1),
   descripcion: z.string().nullable(),
   permite_decimales: z.boolean(),
   is_active: z.boolean(),
});

const UpdateMedidaCobroDTO = CreateMedidaCobroDTO.partial();

export type MedidaCobro = z.infer<typeof MedidaCobroDTO>;
export type CreateMedidaCobroForm = z.infer<typeof CreateMedidaCobroDTO>;
export type UpdateMedidaCobroForm = z.infer<typeof UpdateMedidaCobroDTO>;
