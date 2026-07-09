// ─── Tipos base ──────────────────────────────────────────────────────────────
export type TipoProyecto = "EXPRESS" | "NORMAL" | "GRANDE";
export type EstadoProyecto = "BORRADOR" | "COMPLETADO" | "EN PROGRESO" | "CANCELADO";

// ─── Discriminated Union por tipo de proyecto ────────────────────────────────
type ProyectoExpressFields = {
   tipo_proyecto: "EXPRESS";
   tipo_servicio_id: string | null; // null hasta que exista la tabla tipo_servicio
   tarifa_servicio: number;
};
type ProyectoNormalFields = { tipo_proyecto: "NORMAL" };
type ProyectoGrandeFields = { tipo_proyecto: "GRANDE" };

type ProyectoTypeFields =
   | ProyectoExpressFields
   | ProyectoNormalFields
   | ProyectoGrandeFields;

// ─── Ítem de detalle ─────────────────────────────────────────────────────────
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

// ─── Asignación empleado + equipo ────────────────────────────────────────────
export interface ProyectoAsignacionProps {
   id: string;
   proyecto_id: string;
   operador_id: string;
   operador_nombre?: string;
   equipo_id: string;
   equipo_nombre?: string;
   horas_trabajadas: number;
}

// ─── Proyecto (cabecera) ─────────────────────────────────────────────────────
export type ProyectoProps = ProyectoTypeFields & {
   id: string;
   estado: EstadoProyecto;
   cliente_id: string;
   cliente_nombre?: string;
   total_cobrable: number;
   total_gasto_interno: number;
   rentabilidad: number;
   notas: string | null;
   fecha_inicio: Date;
   fecha_fin: Date | null;
   detalle: ProyectoDetalleProps[];
   asignaciones: ProyectoAsignacionProps[];
   created_at: Date;
   updated_at: Date;
};

// ─── DTO de creación — Proyecto Express ──────────────────────────────────────
export interface CreateProyectoExpressDTO {
   nombre: string;         // <-- Corregido de 'any' a 'string'
   servicio_id: string | null;    // <-- Corregido de 'any' a 'string'
   cliente_id: string;
   notas?: string | null;
   fecha_inicio?: Date;

   // ❌ ELIMINAR: tarifa_servicio, empleado_id, equipo_id, horas_trabajadas, tipo_servicio_id

   // ✅ Los nuevos arrays obligatorios/opcionales
   tarifas: Array<{
      categoria_equipo_id: string;
      precio_acordado: number;
      cobra_en_snapshot: string;
      cobra_minimo_snapshot: number;
   }>;
   equipos?: Array<{
      operador_id?: string;
      categoria_equipo_id: string;
      equipo_id: string;
      cantidad: number;
      es_cobrable: boolean;
   }>;
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

// ─── Facade de liquidación (para el PDF) ─────────────────────────────────────
// Consolida datos de facturación y costos internos en una sola estructura.
export interface LiquidacionExpressFacade {
   proyecto_id: string;
   cliente_nombre: string;
   tarifa_servicio: number;
   cargos_cobrables: ProyectoDetalleProps[];
   gastos_internos: ProyectoDetalleProps[];
   total_cobrable: number;
   total_gasto_interno: number;
   rentabilidad: number;
   operador_nombre: string;
   equipo_nombre: string;
   horas_trabajadas: number;
   fecha: Date;
}

// ─── Repository Interface ─────────────────────────────────────────────────────
export interface IProyectoRepository {
   findAll(tipo?: TipoProyecto): Promise<ProyectoProps[]>;
   findById(id: string): Promise<ProyectoProps | null>;
   createExpress(data: CreateProyectoExpressDTO): Promise<ProyectoProps>;
   getLiquidacion(id: string): Promise<LiquidacionExpressFacade | null>;
   // createExpressTransaction(data: CreateProyectoExpressDTO): Promise<ProyectoProps>;
}
