import { z } from "zod";

export const MetodoPago = {
   CHEQUE: "Cheque",
   EFECTIVO: "Efectivo",
   TRANSFERENCIA: "Transferencia",
   TARJETA: "Tarjeta",
   DESCUENTO_NOMINA: "Descuento de Nómina",
   CAPITAL_PROYECTO: "Capital del Proyecto",
} as const;

export const TipoMovimiento = {
   ENTRADA: "Entrada",
   SALIDA: "Salida",
} as const;

const METODOS_PAGO = Object.keys(MetodoPago) as [keyof typeof MetodoPago, ...Array<keyof typeof MetodoPago>];
const TIPOS_MOVIMIENTO = Object.keys(TipoMovimiento) as [keyof typeof TipoMovimiento, ...Array<keyof typeof TipoMovimiento>];

export type TipoMetodoPago = keyof typeof MetodoPago;
export type TipoMovimientoPago = keyof typeof TipoMovimiento;

export const TIPOS_DESTINO_PAGO = ["GASTO", "DEDUCCION", "PROYECTO", "ORDEN_COMPRA"] as const;
export type TipoDestinoPago = (typeof TIPOS_DESTINO_PAGO)[number];

/**
 * Config funcional de cada destino de pago. El form la usa para que los
 * enums (método de pago y tipo de movimiento) varíen según el destino
 * elegido, en vez de usar los catálogos globales MetodoPago/TipoMovimiento.
 */
export type ConfigPagoDestino = {
   /** Si el destino recibe pagos en absoluto. */
   recibePago: boolean;
   destino: TipoDestinoPago;
   /** Métodos de pago permitidos para este destino (valor + label). */
   tipoMetodoPagoPosible: { value: TipoMetodoPago; label: string }[];
   /** Movimientos permitidos (ENTRADA y/o SALIDA). */
   tipoMovimientoPosibles: { value: TipoMovimientoPago; label: string }[];
};

export const ConfigPagoPorDestino: Record<TipoDestinoPago, ConfigPagoDestino> = {
   GASTO: {
      recibePago: true,
      destino: "GASTO",
      tipoMetodoPagoPosible: [
         { value: "TRANSFERENCIA", label: MetodoPago.TRANSFERENCIA },
         { value: "EFECTIVO", label: MetodoPago.EFECTIVO },
         { value: "TARJETA", label: MetodoPago.TARJETA },
         { value: "CHEQUE", label: MetodoPago.CHEQUE },
      ],
      tipoMovimientoPosibles: [
         { value: "SALIDA", label: TipoMovimiento.SALIDA },
         { value: "ENTRADA", label: TipoMovimiento.ENTRADA },
      ],
   },
   DEDUCCION: {
      recibePago: true,
      destino: "DEDUCCION",
      tipoMetodoPagoPosible: [
         { value: "DESCUENTO_NOMINA", label: MetodoPago.DESCUENTO_NOMINA },
         { value: "TRANSFERENCIA", label: MetodoPago.TRANSFERENCIA },
         { value: "EFECTIVO", label: MetodoPago.EFECTIVO },
         { value: "TARJETA", label: MetodoPago.TARJETA },
         { value: "CHEQUE", label: MetodoPago.CHEQUE },
      ],
      tipoMovimientoPosibles: [{ value: "ENTRADA", label: TipoMovimiento.ENTRADA }],
   },
   PROYECTO: {
      recibePago: true,
      destino: "PROYECTO",
      tipoMetodoPagoPosible: [
         { value: "TRANSFERENCIA", label: MetodoPago.TRANSFERENCIA },
         { value: "EFECTIVO", label: MetodoPago.EFECTIVO },
         { value: "TARJETA", label: MetodoPago.TARJETA },
         { value: "CHEQUE", label: MetodoPago.CHEQUE },
      ],
      tipoMovimientoPosibles: [
         { value: "ENTRADA", label: TipoMovimiento.ENTRADA },
         { value: "SALIDA", label: TipoMovimiento.SALIDA },
      ],
   },
   ORDEN_COMPRA: {
      recibePago: true,
      destino: "ORDEN_COMPRA",
      tipoMetodoPagoPosible: [
         { value: "TRANSFERENCIA", label: MetodoPago.TRANSFERENCIA },
         { value: "EFECTIVO", label: MetodoPago.EFECTIVO },
         { value: "TARJETA", label: MetodoPago.TARJETA },
         { value: "CHEQUE", label: MetodoPago.CHEQUE },
      ],
      tipoMovimientoPosibles: [{ value: "SALIDA", label: TipoMovimiento.SALIDA }],
   },
};

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

/**
 * Información polimórfica del destino de un pago (sección informativa del
 * form). Los campos dependen del tipo (ver `getInfoDestino` en el repo de
 * pagos); los no aplicables van en 0. Los topes `aceptaPagoEntrada` /
 * `aceptaPagoSalida` son el monto máximo que admite cada movimiento
 * (null = sin tope, y 0 = no acepta ese movimiento).
 */
export const InfoDestinoPagoSchema = z.object({
   tipo: z.enum(TIPOS_DESTINO_PAGO),
   referencia: z.string(),
   concepto: z.string().nullable(),
   estado: z.string().nullable(),

   // GASTO nacido de una orden de compra: referencia de la OC a la que
   // deben ir los pagos de salida en su lugar (null si no aplica).
   ordenCompraReferencia: z.string().nullable(),

   montoTotal: z.number(),
   capital: z.number(),

   // GASTO
   cobrableProyecto: z.boolean(),
   cobrableCliente: z.number(),
   cobrableEmpresa: z.number(),

   // Pagos acumulados
   pagadoCliente: z.number(),
   pagadoEmpresa: z.number(),

   // DEDUCCION
   totalPagado: z.number(),

   // PROYECTO
   totalAbonado: z.number(),
   totalUtilizado: z.number(),

   // ORDEN_COMPRA
   montoPagado: z.number(),

   // Topes por movimiento (null = sin tope)
   aceptaPagoEntrada: z.number().nullable(),
   aceptaPagoSalida: z.number(),
});

export type Pago = z.infer<typeof PagoDTO>;
export type CreatePagoForm = z.infer<typeof CreatePagoSchema>;
export type UpdatePagoForm = z.infer<typeof UpdatePagoSchema>;
export type DeletePagoForm = z.infer<typeof DeletePagoSchema>;
export type InfoDestinoPago = z.infer<typeof InfoDestinoPagoSchema>;