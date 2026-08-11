import { z } from "zod";
import type { ConduceDTO } from "./conduce.dto";
import type { Gasto } from "./gastos.dto";

// ─── Creación (formulario simplificado: ya NO incluye tarifas ni equipos) ───
export const CreateProyectoDTOSchema = z.object({
   nombre: z.string().min(1, "El nombre del proyecto es requerido"),
   cliente_id: z.string().min(1, "El cliente es requerido"),
   notas: z.string().nullable().optional(),
   fecha_inicio: z.string().optional(),
   fecha_fin: z.string().nullable().optional(),
   tarifa_servicio: z.number().min(0).optional(),
});
export interface UpdateProyectoForm {
   nombre?: string;
   estado?: EstadoProyecto;
   tarifa_servicio?: number;
   notas?: string | null;
   fecha_fin?: string | null;
   fecha_inicio?: string;
   cliente_id?: string;
   cliente_nombre?: string;
   porcentaje_avance?: number;
}
export type CreateProyectoForm = z.infer<typeof CreateProyectoDTOSchema>;

// ─── Lectura ─────────────────────────────────────────────────────────────
export type EstadoProyecto = "BORRADOR" | "COMPLETADO" | "EN PROGRESO" | "CANCELADO";
export const EstadoProyectoArray: EstadoProyecto[] = ["BORRADOR", "COMPLETADO", "EN PROGRESO", "CANCELADO"];

export interface ProyectoDetalle {
   id: string;
   proyecto_id: string;
   descripcion: string;
   cantidad: number;
   precio_unitario: number;
   subtotal: number;
   es_cobrable: boolean;
   created_at: string;
   updated_at: string;
}

export interface ProyectoEstadoHistorial {
   id: string;
   proyecto_id: string;
   estado_anterior: EstadoProyecto | null;
   estado_nuevo: EstadoProyecto;
   changed_by: string | null;
   changed_by_name: string | null;
   created_at: string;
}

interface ProyectoBase {
   detalle: any;
   id: string;
   codigoReferencia: string; // PRO-001
   estado: EstadoProyecto;
   nombre: string;
   cliente_id: string;
   tarifa_servicio: number;
   cliente_nombre?: string;
   total_cobrable: number;
   total_gasto_interno: number;
   total_equipos: number; // ← NUEVO, para la columna "Total en Camiones" del historial
   total_costo_operador: number; // Σ cantidad × monto_pago (lo que se paga a los choferes)
   rentabilidad: number;
   porcentaje_avance: number; // 0-100, ajustable con el slider de la vista general
   notas: string | null;
   fecha_inicio: string;
   fecha_fin: string | null;
   conduces: ConduceDTO[]; // ← reemplaza a equiposDetalle
   gastos?: Gasto[]; // ← gastos del módulo Gastos vinculados a este proyecto
   historial_estados?: ProyectoEstadoHistorial[];
   created_at: string;
   updated_at: string;
}

export type Proyecto = ProyectoBase;

// ─── Facade de liquidación (para el PDF) ────────────────────────────────
export interface LiquidacionExpress {
   nombre: string;
   proyecto_id: string;
   cliente_nombre: string;
   tarifa_servicio: number;
   gastos_cobrables: Gasto[];
   gastos_incobrables: Gasto[];
   conduces: ConduceDTO[];
   total_cobrable: number;
   total_gasto_interno: number;
   total_costo_operador: number;
   rentabilidad: number;
   fecha: string;
}