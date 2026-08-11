/**
 * Tipos del panel principal.
 *
 * Cada widget del dashboard consume UNA de estas formas. El backend agrega en
 * SQL y devuelve totales ya calculados: el panel es de solo lectura y no debe
 * traerse listados completos al cliente para sumarlos ahí.
 *
 * Nota sobre dinero: todos los montos son números en pesos (RD$), no centavos,
 * porque así viven en las tablas de origen (`numeric` mapeado a number).
 */

// ── Facturación (conduces cobrables) ──────────────────────────────────────
/** Un día de la serie semanal. `fecha` es "YYYY-MM-DD", sin hora. */
export interface FacturacionDia {
   fecha: string;
   monto: number;
   cantidad_conduces: number;
}

/**
 * OJO: esto es lo que se le FACTURA AL CLIENTE (`conduce.subtotal`), no lo que
 * se le paga al chofer (eso sale de `empleado_categoria_tarifa.monto_pago`).
 * La UI lo rotula "Facturado" y nunca "Ventas" para que no se lea como margen.
 */
export interface FacturacionSemanal {
   total_semana: number;
   total_semana_anterior: number;
   /** Variación porcentual vs. la semana anterior. NULL si la anterior fue 0. */
   variacion_pct: number | null;
   cantidad_conduces: number;
   /** Serie de los últimos 7 días, del más viejo al más reciente. */
   serie: FacturacionDia[];
}

// ── Flujo: cobros vs. gastos ──────────────────────────────────────────────
export interface FlujoMes {
   /** "YYYY-MM" */
   mes: string;
   cobrado: number;
   gastado: number;
}

// ── Nómina ────────────────────────────────────────────────────────────────
export interface CicloNominaAbierto {
   id: string;
   nombre: string;
   frecuencia: string;
   estado: string;
   fecha_inicio: Date;
   fecha_fin: Date;
   fecha_pago: Date | null;
   /** Σ neto_pagar del snapshot. 0 mientras el ciclo no se haya calculado. */
   neto_total: number;
   cantidad_empleados: number;
   /**
    * Conduces atribuidos infiriendo por `equipo.operador_id`. Si > 0 hay
    * suposiciones que un humano debería revisar antes de pagar.
    */
   conduces_inferidos: number;
}

// ── Proyectos ─────────────────────────────────────────────────────────────
/**
 * Se sirve en dos variantes segun el permiso del usuario: quien no tiene
 * `finances` recibe los montos en NULL (ver DashboardService.proyectosActivos).
 * Se omiten del JSON en vez de mandarse en 0, porque 0 es un valor legítimo.
 */
export interface ProyectoActivo {
   id: string;
   referencia: number;
   codigoReferencia: string;
   nombre: string;
   cliente_nombre: string | null;
   fecha_inicio: Date;
   total_cobrable: number | null;
   total_gasto_interno: number | null;
   rentabilidad: number | null;
   /** rentabilidad / total_cobrable. NULL si no hay cobrable o sin permiso. */
   margen_pct: number | null;
}

// ── Equipos ───────────────────────────────────────────────────────────────
export interface FlotaResumen {
   activos: number;
   en_mantenimiento: number;
   inactivos: number;
   total: number;
}

/**
 * Motivo por el que un equipo aparece en el widget de alertas.
 *
 * NO existe horómetro ni kilometraje en la tabla `equipo`, así que un semáforo
 * de "próximo a mantenimiento" por uso NO se puede calcular. Todo lo que sigue
 * se deriva de fechas e historial, que es lo que el dato aguanta hoy.
 */
export type MotivoAlertaEquipo =
   /** Nunca se le registró un preventivo. */
   | "SIN_PREVENTIVO"
   /** Pasaron demasiados días desde el último preventivo cerrado. */
   | "PREVENTIVO_VENCIDO"
   /** Lleva demasiados días con un mantenimiento abierto (fecha_fin NULL). */
   | "MANTENIMIENTO_LARGO"
   /** Varios correctivos en ventana corta: predice falla mejor que el calendario. */
   | "CORRECTIVOS_REPETIDOS";

export type SeveridadAlerta = "AMBAR" | "ROJO";

export interface AlertaEquipo {
   equipo_id: string;
   referencia: number;
   codigoReferencia: string;
   nombre: string;
   placa: string | null;
   estado: string;
   motivo: MotivoAlertaEquipo;
   severidad: SeveridadAlerta;
   /** Texto ya armado para la UI, p.ej. "148 días sin preventivo". */
   detalle: string;
   /** Días desde el último preventivo cerrado. NULL si nunca hubo uno. */
   dias_desde_preventivo: number | null;
   /** Días que lleva abierto el mantenimiento en curso, si hay uno. */
   dias_mantenimiento_abierto: number | null;
   /** Correctivos cerrados o abiertos dentro de la ventana de reincidencia. */
   correctivos_recientes: number;
}

/**
 * Umbrales del semáforo. Viven en datos y no hardcodeados dentro del SQL
 * porque son política de taller, no una verdad del dominio: cambian por flota
 * y el dueño los va a querer ajustar sin tocar una query.
 */
export interface UmbralesAlertaEquipo {
   /** Días sin preventivo para pintar ámbar. */
   preventivo_ambar_dias: number;
   /** Días sin preventivo para pintar rojo. */
   preventivo_rojo_dias: number;
   /** Días con mantenimiento abierto para pintar ámbar. */
   mantenimiento_abierto_ambar_dias: number;
   /** Días con mantenimiento abierto para pintar rojo. */
   mantenimiento_abierto_rojo_dias: number;
   /** Ventana en días donde se cuentan correctivos repetidos. */
   correctivos_ventana_dias: number;
   /** Cantidad de correctivos en la ventana que dispara la alerta. */
   correctivos_umbral: number;
}

export const UMBRALES_ALERTA_EQUIPO_DEFECTO: UmbralesAlertaEquipo = {
   preventivo_ambar_dias: 90,
   preventivo_rojo_dias: 120,
   mantenimiento_abierto_ambar_dias: 7,
   mantenimiento_abierto_rojo_dias: 14,
   correctivos_ventana_dias: 90,
   correctivos_umbral: 3,
};

// ── Operativo ─────────────────────────────────────────────────────────────
export interface ConduceSinFirmar {
   id: string;
   numero_referencia: string;
   fecha: Date;
   cliente_nombre: string | null;
   equipo_nombre: string | null;
   subtotal: number;
   /** Cuál firma falta; un conduce puede tener ambas pendientes. */
   falta_firma_recibido: boolean;
   falta_firma_chofer: boolean;
   dias_pendiente: number;
}

export interface LicenciaPorVencer {
   operador_id: string;
   empleado_id: string;
   empleado_nombre: string;
   licencia: string;
   fecha_vencimiento: Date;
   /** Negativo si ya venció. */
   dias_para_vencer: number;
}

export interface OrdenCompraPendiente {
   id: string;
   referencia: number;
   codigoReferencia: string;
   proveedor_nombre: string | null;
   fecha: Date;
   total: number;
   estado: string;
   dias_pendiente: number;
}

export interface CitaProxima {
   id: string;
   referencia: number;
   fecha: Date;
   cliente_nombre: string | null;
   motivo: string | null;
   estado: string;
}

export interface DeduccionPendiente {
   id: string;
   referencia: number;
   empleado_nombre: string | null;
   concepto: string;
   monto_total: number;
   balance_pendiente: number;
   monto_cuota: number;
}
