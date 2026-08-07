// ─── Cuentas por cobrar ──────────────────────────────────────────────────────
//
// Lo que nos deben los clientes. La unidad mínima de deuda es el FOLIO: un
// PROYECTO con todo lo que se le factura al cliente, o un CONDUCE suelto que
// no pertenece a ningún proyecto.
//
// Un folio de proyecto agrupa TRES fuentes de deuda:
//
//   monto_total = tarifa_servicio      (proyecto.tarifa_servicio)
//               + cargos_cobrables     (Σ proyecto_detalle.subtotal, es_cobrable)
//               + conduces_cobrables   (Σ conduce.subtotal, es_cobrable)
//
// Lo cobrado se DERIVA de los pagos (ni `conduce` ni `proyecto` tienen estado
// ni saldo). Cada pago apunta a UN solo origen (migración 018, restricción
// `pago_destino_exclusivo`), así que nunca se escapa ni se cuenta doble:
//
//   pagado = Σ pago.monto_pagado (pago.conduce_id, conduces del folio)
//          + Σ pago.monto_pagado (pago.proyecto_id, el proyecto del folio)
//   pendiente = monto_total − pagado
//
// La parte de tarifa + cargos se paga con un pago ligado al PROYECTO
// (`pago.proyecto_id`); cada conduce se paga con su propio `pago.conduce_id`.
//
// Encima de los folios se agrega por CLIENTE para el listado principal, pero
// el detalle siempre baja al folio y, dentro de él, al conduce.

export type TipoCuentaCxc = "PROYECTO" | "CONDUCE";

export type EstadoCuenta = "PENDIENTE" | "PARCIAL" | "PAGADO";

/**
 * PENDIENTE = sin un solo pago
 * PARCIAL   = cobrado en parte
 * PAGADO    = saldado (o sobrecobrado)
 */
export function estadoDeCuenta(montoTotal: number, pagado: number): EstadoCuenta {
   // Tolerancia de un centavo: los numeric de Postgres y las sumas de varios
   // pagos parciales pueden dejar un residuo que no es una deuda real.
   if (pagado >= montoTotal - 0.01) return "PAGADO";
   if (pagado > 0.01) return "PARCIAL";
   return "PENDIENTE";
}

export interface AntiguedadMontos {
   hasta_30: number;
   de_31_a_60: number;
   de_61_a_90: number;
   mas_de_90: number;
}

/** Días completos entre la fecha del documento y hoy. */
export function diasDesde(fecha: Date | string): number {
   const f = typeof fecha === "string" ? new Date(`${fecha.slice(0, 10)}T12:00:00`) : new Date(fecha);
   const hoy = new Date();
   const ms = hoy.getTime() - f.getTime();
   return Math.floor(ms / 86_400_000);
}

/** Un conduce dentro de un folio de proyecto, con su propio cobrado. */
export interface ConduceDetalleCxc {
   id: string;
   numero_referencia: string;
   tipo_conduce: string;
   fecha: Date;
   categoria_equipo_tarifa_nombre: string | null;
   medida_cobro_nombre: string | null;
   /** `conduce.subtotal` — lo que se le factura al cliente por este folio. */
   monto_total: number;
   pagado: number;
   pendiente: number;
}

/**
 * Una cuenta por cobrar a nivel de folio.
 *
 * `tipo === "PROYECTO"` → `id` es el id del proyecto, el folio se muestra como
 * `PRO-XXX` y agrupa tarifa + cargos + conduces.
 * `tipo === "CONDUCE"` → es un conduce suelto (sin proyecto); tarifa/cargos son 0
 * y `conduces` trae un solo elemento.
 */
export interface CuentaPorCobrar {
   id: string;
   tipo: TipoCuentaCxc;
   /** `PRO-XXX` para proyectos, el folio físico para un conduce suelto. */
   numero_referencia: string;
   /** Nombre del proyecto (null en conduces sueltos). */
   nombre: string | null;
   fecha: Date;
   proyecto_id: string | null;
   cliente_id: string;
   cliente_nombre: string | null;
   cliente_telefono: string | null;
   cliente_email: string | null;
   /** `proyecto.tarifa_servicio` (0 en conduces sueltos). */
   tarifa_servicio: number;
   /** Σ proyecto_detalle.subtotal con es_cobrable = true (0 en sueltos). */
   cargos_cobrables: number;
   /** Σ conduce.subtotal con es_cobrable = true del proyecto. */
   conduces_cobrables: number;
   conduces_count: number;
   /** tarifa + cargos + conduces. */
   monto_total: number;
   /** pagos a los conduces del folio + pagos al proyecto. */
   pagado: number;
   pendiente: number;
   /** (tarifa + cargos) − Σ pago.proyecto_id — lo que falta de la tarifa/cargos. */
   pendiente_tarifa_cargos: number;
   estado: EstadoCuenta;
   dias_transcurridos: number;
   ultimo_pago_fecha: Date | null;
   cantidad_pagos: number;
   conduces: ConduceDetalleCxc[];
}

/** Cuenta por cobrar agregada por cliente para el listado principal. */
export interface ClienteCuentaPorCobrar {
   cliente_id: string;
   cliente_nombre: string;
   cliente_telefono: string | null;
   cliente_email: string | null;
   total_facturado: number;
   total_pagado: number;
   saldo_pendiente: number;
   /** Número de folios (proyectos + conduces sueltos) con cobrable. */
   cantidad_documentos: number;
   /** Folios con pendiente > 0. */
   documentos_pendientes: number;
   ultimo_pago_fecha: Date | null;
   /** Días desde el folio pendiente más antiguo del cliente. */
   dias_transcurridos: number;
   estado: EstadoCuenta;
   antiguedad: AntiguedadMontos;
}

export interface ResumenCuentasPorCobrar {
   total_clientes: number;
   /** Clientes con saldo pendiente > 0 (los que "por cobrar" de verdad). */
   clientes_con_deuda: number;
   total_documentos: number;
   total_facturado: number;
   total_pagado: number;
   total_pendiente: number;
   pendientes: number;
   parciales: number;
   documentos_pendientes: number;
   antiguedad: AntiguedadMontos;
}

export interface CuentasPorCobrarFiltros {
   cliente_id?: string;
   proyecto_id?: string;
   /** Por defecto se ocultan los saldados: son "cuentas POR cobrar". */
   estado?: EstadoCuenta;
   incluir_pagadas?: boolean;
   // "YYYY-MM-DD" (mismo criterio que conduce: no pasar por `new Date()`
   // para no correr la fecha por timezone).
   fecha_desde?: string;
   fecha_hasta?: string;
   busqueda?: string;
   page?: number;
   pageSize?: number;
}

export interface CuentasPorCobrarResult {
   data: ClienteCuentaPorCobrar[];
   resumen: ResumenCuentasPorCobrar;
   total: number;
   page: number;
   pageSize: number;
}

export interface PagoCxc {
   id: string;
   referencia: number;
   codigoReferencia: string;
   conduce_id: string | null;
   conduce_numero_referencia: string | null;
   proyecto_id: string | null;
   proyecto_codigo_referencia: string | null;
   monto_pagado: number;
   metodo_pago: string;
   fecha: Date;
   concepto: string;
   created_at: Date;
   deleted_at: Date | null;
}

export interface DetalleClienteCuentasPorCobrar {
   cliente: {
      id: string;
      nombre: string;
      telefono: string | null;
      email: string | null;
      identificacion: string;
   };
   resumen: {
      facturado: number;
      pagado: number;
      pendiente: number;
      cantidad_documentos: number;
      documentos_pendientes: number;
      antiguedad: AntiguedadMontos;
   };
   cuentas: CuentaPorCobrar[];
   historial_pagos: PagoCxc[];
   total: number;
   page: number;
   pageSize: number;
}

/** Una línea de la distribución explícita de un pago rápido. */
export interface PagoCxcInput {
   /** id del conduce (tipo CONDUCE) o del proyecto (tipo PROYECTO). */
   destino_id: string;
   tipo: TipoCuentaCxc;
   monto: number;
}

/**
 * Pago rápido de cuentas por cobrar.
 *
 * `pagos` (distribución explícita), `conduce_ids` y `proyecto_ids` (acotar la
 * distribución FIFO) son opcionales. Sin ninguno, el monto se reparte
 * automáticamente entre lo pendiente del cliente del más antiguo al más nuevo
 * (FIFO): primero los conduces de cada folio, luego la tarifa/cargos del folio.
 */
export interface RegistrarPagoCxcDTO {
   cliente_id: string;
   monto: number;
   metodo_pago: string;
   fecha?: Date;
   concepto?: string;
   conduce_ids?: string[];
   proyecto_ids?: string[];
   pagos?: PagoCxcInput[];
   created_by?: string | null;
}

export interface ICuentasPorCobrarRepository {
   listar(filtros: CuentasPorCobrarFiltros): Promise<CuentasPorCobrarResult>;
   detalleCliente(clienteId: string, filtros: CuentasPorCobrarFiltros): Promise<DetalleClienteCuentasPorCobrar>;
   /** Folios del cliente con saldo pendiente, más viejos primero. */
   listarPendientesCliente(clienteId: string): Promise<CuentaPorCobrar[]>;
   /** Inserta los pagos en una transacción (cada uno a su conduce o a su proyecto). */
   crearPagos(pagos: Array<{
      destino_id: string;
      tipo: TipoCuentaCxc;
      monto_pagado: number;
      metodo_pago: string;
      fecha: Date;
      concepto: string;
   }>): Promise<PagoCxc[]>;
}
