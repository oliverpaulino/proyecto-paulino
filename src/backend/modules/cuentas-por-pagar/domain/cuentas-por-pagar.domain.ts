// ─── Cuentas por pagar ───────────────────────────────────────────────────────
//
// Lo que la empresa debe: gastos y costos que todavía no se han pagado, o que
// se pagaron solo en parte.
//
// NI `gasto` NI `costo` tienen columna de estado o de saldo. El pendiente se
// DERIVA sumando los pagos que apuntan a cada documento:
//
//   pagado    = Σ pago.monto_pagado  (gasto_empresa_id | costo_cliente_id)
//   pendiente = monto_total − pagado
//
// Derivarlo en vez de almacenarlo evita el problema que ya tiene
// `deduccion.balance_pendiente`: un campo que se escribe una vez y queda
// desincronizado en cuanto entra un pago.

export type TipoCuenta = "GASTO" | "COSTO";

/**
 * PENDIENTE = sin un solo pago
 * PARCIAL   = pagado en parte
 * PAGADO    = saldado (o sobrepagado)
 */
export type EstadoCuenta = "PENDIENTE" | "PARCIAL" | "PAGADO";

export function estadoDeCuenta(montoTotal: number, pagado: number): EstadoCuenta {
   // Tolerancia de un centavo: los numeric de Postgres y las sumas de varios
   // pagos parciales pueden dejar un residuo que no es una deuda real.
   if (pagado >= montoTotal - 0.01) return "PAGADO";
   if (pagado > 0.01) return "PARCIAL";
   return "PENDIENTE";
}

export interface CuentaPorPagar {
   id: string;
   tipo: TipoCuenta;
   referencia: number;
   codigoReferencia: string;

   concepto: string;
   ncf: string | null;
   fecha: Date;

   monto_total: number;
   pagado: number;
   pendiente: number;
   estado: EstadoCuenta;

   /** Días desde la fecha del documento. Negativo si está fechado a futuro. */
   dias_transcurridos: number;

   // Contexto según el tipo
   categoria_gasto_nombre: string | null; // solo GASTO
   /** Proveedor (suplidor o subcontratista) asociado al gasto, si lo hay. */
   proveedor_id: string | null;
   proveedor_nombre: string | null;
   proveedor_tipo: string | null;
   proyecto_id: string | null; // solo COSTO
   /** `proyecto` no tiene columna de referencia: se identifica por nombre. */
   proyecto_nombre: string | null;
   orden_compra_id: string | null;
   orden_compra_codigo_referencia: string | null;

   ultimo_pago_fecha: Date | null;
   cantidad_pagos: number;
}

export interface CuentasPorPagarFiltros {
   tipo?: TipoCuenta;
   /** Por defecto se ocultan las saldadas: son "cuentas POR pagar". */
   estado?: EstadoCuenta;
   incluir_pagadas?: boolean;
   proyecto_id?: string;
   categoria_gasto_id?: string;
   proveedor_id?: string;
   fecha_desde?: Date;
   fecha_hasta?: Date;
   busqueda?: string;
   page?: number;
   pageSize?: number;
}

export interface ResumenCuentasPorPagar {
   total_documentos: number;
   total_monto: number;
   total_pagado: number;
   total_pendiente: number;

   pendientes: number;
   parciales: number;

   gastos_pendiente: number;
   costos_pendiente: number;

   /** Antigüedad de lo pendiente, por días desde la fecha del documento. */
   antiguedad: {
      hasta_30: number;
      de_31_a_60: number;
      de_61_a_90: number;
      mas_de_90: number;
   };
}

export interface CuentasPorPagarResult {
   data: CuentaPorPagar[];
   resumen: ResumenCuentasPorPagar;
   total: number;
   page: number;
   pageSize: number;
}

export interface ICuentasPorPagarRepository {
   listar(filtros: CuentasPorPagarFiltros): Promise<CuentasPorPagarResult>;
}
