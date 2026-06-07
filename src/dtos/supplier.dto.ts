import { z } from "zod";

const TipoProveedorSchema = z.enum(["SUPLIDOR", "SUB_CONTRATISTA"]);

const SupplierDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   tipo: TipoProveedorSchema,
   rnc: z.string(),
   telefono: z.string().nullable(),
   email: z.string().nullable(),
   direccion: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateSupplierDTO = z.object({
   nombre: z.string().min(1),
   tipo: TipoProveedorSchema,
   rnc: z.string().min(1),
   telefono: z.string().nullable().optional(),
   email: z.string().email().nullable().optional(),
   direccion: z.string().nullable().optional(),
});

const UpdateSupplierDTO = CreateSupplierDTO.partial();

export type Supplier = z.infer<typeof SupplierDTO>;
export type SupplierForm = z.infer<typeof CreateSupplierDTO>;
export type UpdateSupplierForm = z.infer<typeof UpdateSupplierDTO>;
export type TipoProveedor = z.infer<typeof TipoProveedorSchema>;
