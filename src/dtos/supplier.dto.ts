import { z } from "zod";

export const TipoProveedor = {
  SUPLIDOR: "Suplidor",
  SUB_CONTRATISTA: "Sub-contratista",
  AMBOS: "Ambos",
} as const;

const TipoProveedorSchema = z.enum(
  Object.keys(TipoProveedor) as [
    keyof typeof TipoProveedor,
    ...(keyof typeof TipoProveedor)[]
  ]
);

export const SupplierSchemasDTO = {
  TipoProveedorSchema,
};

const SupplierDTO = z.object({
   id: z.string(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   nombre: z.string(),
   tipo: SupplierSchemasDTO.TipoProveedorSchema,
   rnc: z.string(),
   telefono: z.string().nullable(),
   email: z.string().nullable(),
   direccion: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateSupplierDTO = z.object({
   nombre: z.string().min(1),
   tipo: SupplierSchemasDTO.TipoProveedorSchema,
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
