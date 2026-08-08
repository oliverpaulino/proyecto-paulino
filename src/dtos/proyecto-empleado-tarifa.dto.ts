import { z } from "zod";

export const UpsertProyectoEmpleadoTarifaDTOSchema = z.object({
   proyecto_id: z.string().min(1, "El proyecto es requerido"),
   empleado_id: z.string().min(1, "El empleado es requerido"),
   categoria_equipo_tarifa_id: z.string().min(1, "La tarifa es requerida"),
   monto_pago: z.number().min(0),
});

export type UpsertProyectoEmpleadoTarifaForm = z.infer<typeof UpsertProyectoEmpleadoTarifaDTOSchema>;

export interface ProyectoEmpleadoTarifaDTO {
   id: string;
   proyecto_id: string;
   empleado_id: string;
   empleado_nombre: string;
   categoria_equipo_tarifa_id: string;
   categoria_equipo_tarifa_nombre: string;
   categoria_equipo_nombre: string;
   medida_cobro_nombre: string;
   monto_pago: number;
   created_at: string;
   updated_at: string;
}

export interface OperadorTarifaRowDTO {
   empleado_id: string;
   empleado_nombre: string;
   categoria_equipo_tarifa_id: string;
   categoria_equipo_tarifa_nombre: string;
   categoria_equipo_nombre: string;
   medida_cobro_nombre: string;
   monto_pago_global: number | null;
   monto_pago_proyecto: number | null;
   proyecto_empleado_tarifa_id: string | null;
}

export interface BulkUpsertPayload {
   proyecto_id: string;
   tarifas: Array<{
      empleado_id: string;
      categoria_equipo_tarifa_id: string;
      monto_pago: number;
   }>;
}
