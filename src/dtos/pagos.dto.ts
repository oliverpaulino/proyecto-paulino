import { z } from "zod";

export const MetodoPago = {
   CHEQUE: "Cheque",
   EFECTIVO: "Efectivo",
   TRANSFERENCIA: "Transferencia",
   TARJETA: "Tarjeta",
   DESCUENTO_NOMINA: "Descuento de Nómina",
} as const;

export const TipoMovimiento = {
   ENTRADA: "Entrada",
   SALIDA: "Salida",
} as const;

const METODOS_PAGO = Object.keys(MetodoPago) as [keyof typeof MetodoPago, ...Array<keyof typeof MetodoPago>];
const TIPOS_MOVIMIENTO = Object.keys(TipoMovimiento) as [keyof typeof TipoMovimiento, ...Array<keyof typeof TipoMovimiento>];

export const PagoDTO = z.object({
   id: z.string().uuid(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   metodo_pago: z.string(),
   monto_pagado: z.number(),
   concepto: z.string(),
   tipo_movimiento: z.string(),

   gasto_empresa_id: z.string().uuid().nullable(),
   gasto_codigo_referencia: z.string().nullable(),

   deduccion_empleado_id: z.string().uuid().nullable(),
   deduccion_codigo_referencia: z.string().nullable(),

   proyecto_id: z.string().uuid().nullable(),
   proyecto_codigo_referencia: z.string().nullable(),

   orden_compra_id: z.string().uuid().nullable(),
   orden_compra_codigo_referencia: z.string().nullable(),
   
   fecha: z.coerce.date(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
   deleted_by: z.string().nullable(),
   deleted_at: z.coerce.date().nullable(),
   deleted_reason: z.string().nullable(),
});

const ExclusivityRefinement = (data: any) => {
   const count = [data.gasto_empresa_id, data.deduccion_empleado_id, data.proyecto_id, data.orden_compra_id].filter(Boolean).length;
   return count === 1;
};

export const BasePagoSchema = z.object({
   metodo_pago: z.enum(METODOS_PAGO),
   monto_pagado: z.coerce.number().min(0.01, "El monto pagado debe ser mayor a 0"),
   concepto: z.string().min(1, "El concepto es requerido"),
   tipo_movimiento: z.enum(TIPOS_MOVIMIENTO),
   fecha: z.coerce.date(),
   gasto_empresa_id: z.string().uuid().optional().nullable(),
   deduccion_empleado_id: z.string().uuid().optional().nullable(),
   proyecto_id: z.string().uuid().optional().nullable(),
   orden_compra_id: z.string().uuid().optional().nullable(),
});

export const CreatePagoSchema = BasePagoSchema.refine(ExclusivityRefinement, {
   message: "Debe proveer exactamente un destino (Gasto, Deducción, Proyecto u Orden de Compra)",
   path: ["concepto"]
});

export const UpdatePagoSchema = BasePagoSchema.partial().refine(ExclusivityRefinement, {
   message: "Debe proveer exactamente un destino (Gasto, Deducción, Proyecto u Orden de Compra)",
   path: ["concepto"]
});

export const DeletePagoSchema = z.object({
   deleted_by: z.string().uuid().optional(),
   deleted_reason: z.string().min(1, "Debe proveer una razón").optional(),
});

export type Pago = z.infer<typeof PagoDTO>;
export type CreatePagoForm = z.infer<typeof CreatePagoSchema>;
export type UpdatePagoForm = z.infer<typeof UpdatePagoSchema>;
export type DeletePagoForm = z.infer<typeof DeletePagoSchema>;