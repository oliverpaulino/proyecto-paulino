import { z } from "zod";
import { GastoDTO } from "./gastos.dto";

/** Un mes del reporte, "YYYY-MM" + etiqueta para mostrar. */
export const EquipoRentabilidadMesSchema = z.object({
   mes: z.string(),
   etiqueta: z.string(),
   ingresos: z.number(),
   costos_operativos: z.number(),
   utilidad: z.number(),
   compras: z.number(),
});

/** Desglose de la producción del equipo por tarifa aplicada. */
export const EquipoRentabilidadTarifaSchema = z.object({
   tarifa_nombre: z.string(),
   medida_cobro: z.string(),
   count: z.number(),
   cantidad: z.number(),
   subtotal_facturado: z.number(),
   costo_operador: z.number(),
});

/** Desglose de gastos por categoría. */
export const EquipoRentabilidadCategoriaGastoSchema = z.object({
   categoria: z.string(),
   grupo: z.string(),
   count: z.number(),
   total: z.number(),
});

/**
 * Conduce enriquecido con el costo del operador: lo que se le PAGA al chofer
 * por ese conduce (cantidad × monto_pago de `empleado_categoria_tarifa`), que
 * NO es lo mismo que `subtotal` (lo que se le factura al cliente).
 */
export const EquipoRentabilidadConduceSchema = z.object({
   id: z.string(),
   numero_referencia: z.string(),
   fecha: z.coerce.date(),
   tipo_conduce: z.string(),
   cliente_nombre: z.string().nullable(),
   proyecto_nombre: z.string().nullable(),
   tarifa_nombre: z.string(),
   medida_cobro: z.string(),
   cantidad: z.number(),
   es_cobrable: z.boolean(),
   subtotal: z.number(),
   operador_nombre: z.string().nullable(),
   monto_pago_operador: z.number(),
   costo_operador: z.number(),
});

/** Ítems de órdenes de compra registrados contra este equipo. */
export const EquipoRentabilidadCompraSchema = z.object({
   id: z.string(),
   orden_compra_id: z.string(),
   orden_codigo: z.string(),
   fecha: z.coerce.date(),
   estado: z.string(),
   descripcion: z.string(),
   cantidad: z.number(),
   precio_unitario: z.number(),
   subtotal: z.number(),
});

export const EquipoRentabilidadMantenimientoSchema = z.object({
   id: z.string(),
   tipo: z.string(),
   estado: z.string(),
   descripcion: z.string(),
   costo: z.number().nullable(),
   fecha_inicio: z.coerce.date(),
   fecha_fin: z.coerce.date().nullable(),
});

export const EquipoRentabilidadPagoSchema = z.object({
   id: z.string(),
   codigo_referencia: z.string(),
   fecha: z.coerce.date(),
   concepto: z.string(),
   tipo_movimiento: z.string(),
   metodo_pago: z.string(),
   monto_pagado: z.number(),
   destino: z.string().nullable(),
});

export const EquipoRentabilidadResumenSchema = z.object({
   ingresos: z.number(),
   conduces_totales: z.number(),
   conduces_cobrables: z.number(),
   costo_operador: z.number(),
   gastos: z.number(),
   mantenimientos: z.number(),
   compras: z.number(),
   pagos_salida: z.number(),
   pagos_entrada: z.number(),
   rentabilidad_operativa: z.number(),
   rentabilidad_neta: z.number(),
   margen_operativo: z.number(),
});

export const EquipoRentabilidadSchema = z.object({
   desde: z.string().nullable(),
   hasta: z.string().nullable(),
   resumen: EquipoRentabilidadResumenSchema,
   por_mes: z.array(EquipoRentabilidadMesSchema),
   por_tarifa: z.array(EquipoRentabilidadTarifaSchema),
   por_categoria_gasto: z.array(EquipoRentabilidadCategoriaGastoSchema),
   conduces: z.array(EquipoRentabilidadConduceSchema),
   gastos: z.array(GastoDTO),
   compras: z.array(EquipoRentabilidadCompraSchema),
   mantenimientos: z.array(EquipoRentabilidadMantenimientoSchema),
   pagos: z.array(EquipoRentabilidadPagoSchema),
});

export type EquipoRentabilidad = z.infer<typeof EquipoRentabilidadSchema>;
export type EquipoRentabilidadMes = z.infer<typeof EquipoRentabilidadMesSchema>;
export type EquipoRentabilidadConduce = z.infer<typeof EquipoRentabilidadConduceSchema>;
export type EquipoRentabilidadCompra = z.infer<typeof EquipoRentabilidadCompraSchema>;
export type EquipoRentabilidadMantenimiento = z.infer<typeof EquipoRentabilidadMantenimientoSchema>;
export type EquipoRentabilidadPago = z.infer<typeof EquipoRentabilidadPagoSchema>;
export type EquipoRentabilidadResumen = z.infer<typeof EquipoRentabilidadResumenSchema>;
