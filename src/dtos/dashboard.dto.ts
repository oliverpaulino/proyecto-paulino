/**
 * Tipos que el panel principal consume desde `/api/dashboard/*`.
 *
 * Las fechas llegan como string (JSON) y se dejan como string: los widgets solo
 * las formatean, y convertirlas a Date en el store solo agregaría un lugar
 * donde el timezone puede correr un día.
 */

export interface FacturacionDiaDTO {
   /** "YYYY-MM-DD" */
   fecha: string;
   monto: number;
   cantidad_conduces: number;
}

/**
 * OJO: `total_semana` es lo FACTURADO al cliente (`conduce.subtotal`), no el
 * pago al chofer ni margen. La UI lo rotula "Facturado".
 */
export interface FacturacionSemanalDTO {
   total_semana: number;
   total_semana_anterior: number;
   /** NULL cuando la semana anterior fue 0 (no hay base para comparar). */
   variacion_pct: number | null;
   cantidad_conduces: number;
   serie: FacturacionDiaDTO[];
}

export interface FlujoMesDTO {
   /** "YYYY-MM" */
   mes: string;
   cobrado: number;
   gastado: number;
}

export interface CicloNominaAbiertoDTO {
   id: string;
   nombre: string;
   frecuencia: string;
   estado: string;
   fecha_inicio: string;
   fecha_fin: string;
   fecha_pago: string | null;
   neto_total: number;
   cantidad_empleados: number;
   /** > 0 significa que hay conduces atribuidos por suposición. */
   conduces_inferidos: number;
}

export interface DeduccionPendienteDTO {
   id: string;
   referencia: number;
   empleado_nombre: string | null;
   concepto: string;
   monto_total: number;
   balance_pendiente: number;
   monto_cuota: number;
}

/**
 * Los montos vienen en NULL cuando el rol no puede leer finanzas — NULL es
 * "oculto", que no es lo mismo que 0. El widget debe pintar "—", nunca "RD$ 0".
 */
export interface ProyectoActivoDTO {
   id: string;
   referencia: number;
   codigoReferencia: string;
   nombre: string;
   cliente_nombre: string | null;
   fecha_inicio: string;
   total_cobrable: number | null;
   total_gasto_interno: number | null;
   rentabilidad: number | null;
   margen_pct: number | null;
}

export interface FlotaResumenDTO {
   activos: number;
   en_mantenimiento: number;
   inactivos: number;
   total: number;
}

export type MotivoAlertaEquipo =
   | "SIN_PREVENTIVO"
   | "PREVENTIVO_VENCIDO"
   | "MANTENIMIENTO_LARGO"
   | "CORRECTIVOS_REPETIDOS";

export type SeveridadAlerta = "AMBAR" | "ROJO";

export interface AlertaEquipoDTO {
   equipo_id: string;
   referencia: number;
   codigoReferencia: string;
   nombre: string;
   placa: string | null;
   estado: string;
   motivo: MotivoAlertaEquipo;
   severidad: SeveridadAlerta;
   /** Texto ya armado por el backend, p.ej. "148 días sin preventivo". */
   detalle: string;
   dias_desde_preventivo: number | null;
   dias_mantenimiento_abierto: number | null;
   correctivos_recientes: number;
}

export interface ConduceSinFirmarDTO {
   id: string;
   numero_referencia: string;
   fecha: string;
   cliente_nombre: string | null;
   equipo_nombre: string | null;
   subtotal: number;
   falta_firma_recibido: boolean;
   falta_firma_chofer: boolean;
   dias_pendiente: number;
}

export interface LicenciaPorVencerDTO {
   operador_id: string;
   empleado_id: string;
   empleado_nombre: string;
   licencia: string;
   fecha_vencimiento: string;
   /** Negativo = ya venció. */
   dias_para_vencer: number;
}

export interface OrdenCompraPendienteDTO {
   id: string;
   referencia: number;
   codigoReferencia: string;
   proveedor_nombre: string | null;
   fecha: string;
   total: number;
   estado: string;
   dias_pendiente: number;
}

export interface CitaProximaDTO {
   id: string;
   referencia: number;
   fecha: string;
   cliente_nombre: string | null;
   motivo: string | null;
   estado: string;
}
