import { ConduceProps } from "../../conduce/domain/conduce.domain";
import { GastoProps } from "../../gastos/domain/gastos.domain";

export type EstadoProyecto = "BORRADOR" | "COMPLETADO" | "EN PROGRESO" | "CANCELADO";

// ─── Historial de cambios de estado (proyecto_estado_historial) ────────────
// Se registra cada vez que `estado` cambia (p. ej. COMPLETADO → EN PROGRESO).
// Sin esto no habría forma de saber cuándo se cerró/reabrió un proyecto.
export interface ProyectoEstadoHistorialProps {
   id: string;
   proyecto_id: string;
   estado_anterior: EstadoProyecto | null;
   estado_nuevo: EstadoProyecto;
   changed_by: string | null;
   changed_by_name: string | null;
   created_at: Date;
}

// ─── Ítem de detalle (cargos/gastos manuales, no ligados a equipos) ─────────
export interface ProyectoDetalleProps {
   id: string;
   proyecto_id: string;
   descripcion: string;
   cantidad: number;
   precio_unitario: number;
   subtotal: number;
   es_cobrable: boolean;
   created_at: Date;
   updated_at: Date;
}

// ─── Proyecto (cabecera) ─────────────────────────────────────────────────────
// NOTA: `asignaciones` (proyecto_asignacion) se removió de aquí — esa tabla
// nunca se llenaba en el flujo actual (createExpress no la insertaba), así
// que era código muerto. Si la necesitas para otra cosa, dímelo y la regreso.
// NOTA 2: `proyecto_detalle` (cargos/gastos manuales) se desactivó — los
// cobrables/incobrables del proyecto ahora viven en la tabla `gasto`, con
// cobrable_proyecto. Los gastos del proyecto se exponen aquí en `gastos`.
export type ProyectoProps = {
   id: string;
   /** Código legible tipo `PRO-001`, derivado de `proyecto.referencia`. */
   codigoReferencia: string;
   estado: EstadoProyecto;
   tarifa_servicio: number;
   nombre: string;
   cliente_id: string;
   cliente_nombre?: string;
   total_cobrable: number;
   total_gasto_interno: number;
   total_equipos: number; // ← NUEVO: suma cacheada de conduces (para el historial)
   total_costo_operador: number; // Σ cantidad × monto_pago de los conduces (lo que se paga a los choferes)
   rentabilidad: number;
   porcentaje_avance: number; // 0-100, ajustable con el slider de la vista general
   notas: string | null;
   fecha_inicio: Date;
   fecha_fin: Date | null;
   gastos: GastoProps[]; // ← reemplaza a proyecto.detalle
   conduces: ConduceProps[]; // ← reemplaza a equiposDetalle
   historial_estados?: ProyectoEstadoHistorialProps[];
   created_at: Date;
   updated_at: Date;
};

export interface CreateProyectoDTO {
   nombre: string;
   cliente_id: string;
   notas?: string | null;
   fecha_inicio?: Date;
   fecha_fin?: Date;
   tarifa_servicio?: number;
}

// ─── Totales recalculados (usado por ConduceService tras cada mutación) ─────
export interface ProyectoTotales {
   total_cobrable: number;
   total_gasto_interno: number;
   total_equipos: number;
   total_costo_operador: number;
   rentabilidad: number;
}

// ─── Facade de liquidación (para el PDF) ─────────────────────────────────────
// Antes tenía operador_nombre/equipo_nombre/horas_trabajadas (un solo equipo
// asumido). Ahora puede haber muchos conduces, así que se expone la lista.
// Los cargos cobrables/incobrables ahora salen de la tabla `gasto` filtrada
// por cobrable_proyecto (reemplaza a proyecto_detalle).
export interface LiquidacionFacade {
   proyecto_id: string;
   nombre: string;
   cliente_nombre: string;
   tarifa_servicio: number;
   gastos_cobrables: GastoProps[];
   gastos_incobrables: GastoProps[];
   conduces: ConduceProps[];
   total_cobrable: number;
   total_gasto_interno: number;
   total_costo_operador: number;
   rentabilidad: number;
   porcentaje_avance: number;
   fecha: Date;
}

export interface UpdateProyectoDTO {
   nombre?: string;
   estado?: string;
   tarifa_servicio?: number;
   notas?: string | null;
   fecha_fin?: Date | null;
   fecha_inicio?: Date | string;
   cliente_id?: string;
   porcentaje_avance?: number;
   // Metadatos del cambio de estado (se insertan en proyecto_estado_historial).
   // No se persisten en `proyecto`; vienen de la sesión en la ruta.
   changed_by?: string | null;
   changed_by_name?: string | null;
}

// ─── Repository Interface ─────────────────────────────────────────────────────
export interface IProyectoRepository {
   findAll(search?: string, pagination?: { page: number, limit: number }): Promise<ProyectoProps[]>;
   findById(id: string): Promise<ProyectoProps | null>;
   findByClientId(clienteId: string, search?: string, pagination?: { page: number, limit: number }): Promise<ProyectoProps[]>;
   create(data: CreateProyectoDTO): Promise<ProyectoProps>;
   update(id: string, data: UpdateProyectoDTO): Promise<ProyectoProps | null>;
   /** Estado actual (ligero, para los guards de "proyecto COMPLETADO"). */
   getEstado(id: string): Promise<EstadoProyecto | null>;
   getLiquidacion(id: string): Promise<LiquidacionFacade | null>;
   recalcularTotales(proyectoId: string): Promise<ProyectoTotales>;
}