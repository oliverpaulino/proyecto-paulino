import { z } from "zod";

export const EstadoOrdenCompraSchema = z.enum([
   "BORRADOR",
   "PENDIENTE",
   "APROBADA",
   "RECIBIDA",
   "CANCELADA",
]);

const PurchaseOrderItemSchema = z.object({
   id: z.string(),
   orden_compra_id: z.string(),
   descripcion: z.string(),
   cantidad: z.number(),
   precio_unitario: z.number(),
   subtotal: z.number(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const PurchaseOrderItemFormSchema = z.object({
   descripcion: z.string().min(1),
   cantidad: z.number().positive(),
   precio_unitario: z.number().min(0),
});

const PurchaseOrderDTO = z.object({
   id: z.string(),
   proveedor_id: z.string(),
   proveedor_nombre: z.string().optional(),
   referencia: z.string(),
   codigoReferencia: z.string(),
   fecha: z.coerce.date(),
   estado: EstadoOrdenCompraSchema,
   notas: z.string().nullable(),
   total: z.number(),
   approved_by: z.string().nullable().optional(),
   approved_by_name: z.string().nullable().optional(),
   approved_at: z.coerce.date().nullable().optional(),
   items: z.array(PurchaseOrderItemSchema),
   created_at: z.coerce.date(),
   deleted_by: z.string().nullable().optional(),
   deleted_reason: z.string().nullable().optional(),
   deleted_at: z.coerce.date().nullable().optional(),
   updated_at: z.coerce.date(),
});

const CreatePurchaseOrderDTO = z.object({
   proveedor_id: z.string().min(1),
   fecha: z.coerce.date(),
   notas: z.string().nullable().optional(),
   items: z.array(PurchaseOrderItemFormSchema).min(1),
});

const UpdatePurchaseOrderDTO = z.object({
   proveedor_id: z.string().min(1).optional(),
   fecha: z.coerce.date().optional(),
   notas: z.string().nullable().optional(),
   items: z.array(PurchaseOrderItemFormSchema).min(1).optional(),
});



export type PurchaseOrder = z.infer<typeof PurchaseOrderDTO>;
export type PurchaseOrderForm = z.infer<typeof CreatePurchaseOrderDTO>;
export type UpdatePurchaseOrderForm = z.infer<typeof UpdatePurchaseOrderDTO>;
export type PurchaseOrderItemForm = z.infer<typeof PurchaseOrderItemFormSchema>;
export type EstadoOrdenCompra = z.infer<typeof EstadoOrdenCompraSchema>;
