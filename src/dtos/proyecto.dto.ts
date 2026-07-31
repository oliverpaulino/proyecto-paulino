import { z } from "zod";
import type { ConduceDTO } from "./conduce.dto";

// ─── Creación (formulario simplificado: ya NO incluye tarifas ni equipos) ───
export const CreateProyectoDTOSchema = z.object({
   nombre: z.string().min(1, "El nombre del proyecto es requerido"),
   cliente_id: z.string().min(1, "El cliente es requerido"),
   notas: z.string().nullable().optional(),
   fecha_inicio: z.string().optional(),
   fecha_fin: z.string().nullable().optional(),
   tarifa_servicio: z.number().min(0).optional(),
   cargos_cobrables: z
      .array(
         z.object({
            descripcion: z.string().min(1, "La descripción es requerida"),
            cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
            precio_unitario: z.number().min(0),
         })
      )
      .optional(),
   gastos_internos: z
      .array(
         z.object({
            descripcion: z.string().min(1, "La descripción es requerida"),
            cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
            precio_unitario: z.number().min(0),
         })
      )
      .optional(),
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
}
export type CreateProyectoForm = z.infer<typeof CreateProyectoDTOSchema>;
export type LineItemForm = { descripcion: string; cantidad: number; precio_unitario: number };

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

interface ProyectoBase {
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
   rentabilidad: number;
   notas: string | null;
   fecha_inicio: string;
   fecha_fin: string | null;
   detalle: ProyectoDetalle[];
   conduces: ConduceDTO[]; // ← reemplaza a equiposDetalle
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
   cargos_cobrables: ProyectoDetalle[];
   gastos_internos: ProyectoDetalle[];
   conduces: ConduceDTO[];
   total_cobrable: number;
   total_gasto_interno: number;
   rentabilidad: number;
   fecha: string;
}