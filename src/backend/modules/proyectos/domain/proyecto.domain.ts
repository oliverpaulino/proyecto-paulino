import { ConduceProps } from "../../conduce/domain/conduce.domain";

// ─── Tipos base ──────────────────────────────────────────────────────────────
export type TipoProyecto = "EXPRESS" | "NORMAL" | "GRANDE";
export type EstadoProyecto = "BORRADOR" | "COMPLETADO" | "EN PROGRESO" | "CANCELADO";

// ─── Discriminated Union por tipo de proyecto ────────────────────────────────
type ProyectoExpressFields = {
   tipo_proyecto: "EXPRESS";
   tarifa_servicio: number;
};
type ProyectoNormalFields = { tipo_proyecto: "NORMAL" };
type ProyectoGrandeFields = { tipo_proyecto: "GRANDE" };

type ProyectoTypeFields =
   | ProyectoExpressFields
   | ProyectoNormalFields
   | ProyectoGrandeFields;

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
export type ProyectoProps = ProyectoTypeFields & {
   id: string;
   estado: EstadoProyecto;
   nombre: string;
   cliente_id: string;
   cliente_nombre?: string;
   total_cobrable: number;
   total_gasto_interno: number;
   total_equipos: number; // ← NUEVO: suma cacheada de conduces (para el historial)
   rentabilidad: number;
   notas: string | null;
   fecha_inicio: Date;
   fecha_fin: Date | null;
   detalle: ProyectoDetalleProps[];
   conduces: ConduceProps[]; // ← reemplaza a equiposDetalle
   created_at: Date;
   updated_at: Date;
};

// ─── DTO de creación — Proyecto Express ──────────────────────────────────────
// `tarifas` y `equipos` se eliminaron: el equipo ya no se registra al crear
// el proyecto, se registra después vía conduces uno por uno.
export interface CreateProyectoExpressDTO {
   nombre: string;
   servicio_id: string | null;
   cliente_id: string;
   notas?: string | null;
   fecha_inicio?: Date;
   tarifa_servicio?: number;

   cargos_cobrables: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
   }>;
   gastos_internos: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
   }>;
}

// ─── Totales recalculados (usado por ConduceService tras cada mutación) ─────
export interface ProyectoTotales {
   total_cobrable: number;
   total_gasto_interno: number;
   total_equipos: number;
   rentabilidad: number;
}

// ─── Facade de liquidación (para el PDF) ─────────────────────────────────────
// Antes tenía operador_nombre/equipo_nombre/horas_trabajadas (un solo equipo
// asumido). Ahora puede haber muchos conduces, así que se expone la lista.
export interface LiquidacionExpressFacade {
   proyecto_id: string;
   nombre: string;
   cliente_nombre: string;
   tarifa_servicio: number;
   cargos_cobrables: ProyectoDetalleProps[];
   gastos_internos: ProyectoDetalleProps[];
   conduces: ConduceProps[];
   total_cobrable: number;
   total_gasto_interno: number;
   rentabilidad: number;
   fecha: Date;
}

// ─── Repository Interface ─────────────────────────────────────────────────────
export interface IProyectoRepository {
   findAll(tipo?: TipoProyecto): Promise<ProyectoProps[]>;
   findById(id: string): Promise<ProyectoProps | null>;
   findByClientId(clienteId: string): Promise<ProyectoProps[]>;
   createExpress(data: CreateProyectoExpressDTO): Promise<ProyectoProps>;
   getLiquidacion(id: string): Promise<LiquidacionExpressFacade | null>;
   // ← NUEVO: recalcula y persiste los totales de un proyecto a partir de
   // proyecto_detalle + conduce. Lo llama ConduceService tras crear/editar/
   // borrar un conduce, y también se puede llamar tras editar detalle.
   recalcularTotales(proyectoId: string): Promise<ProyectoTotales>;
}