import { z } from "zod";

export const UpsertProyectoTarifaDTOSchema = z.object({
   proyecto_id: z.string().min(1, "El proyecto es requerido"),
   categoria_equipo_tarifa_id: z.string().min(1, "La tarifa es requerida"),
   precio_unitario: z.number().min(0),
});

export type UpsertProyectoTarifaForm = z.infer<typeof UpsertProyectoTarifaDTOSchema>;

export interface ProyectoTarifaDTO {
   id: string;
   proyecto_id: string;
   categoria_equipo_tarifa_id: string;
   categoria_equipo_tarifa_nombre: string;
   categoria_equipo_nombre: string;
   medida_cobro_nombre: string;
   precio_unitario: number;
   created_at: string;
   updated_at: string;
}

export interface TarifaGlobalRowDTO {
   categoria_equipo_tarifa_id: string;
   categoria_equipo_tarifa_nombre: string;
   categoria_equipo_id: string;
   categoria_equipo_nombre: string;
   medida_cobro_nombre: string;
   precio_global: number;
   precio_proyecto: number | null;
   proyecto_tarifa_id: string | null;
}

export interface BulkUpsertTarifaPayload {
   proyecto_id: string;
   tarifas: Array<{
      categoria_equipo_tarifa_id: string;
      precio_unitario: number;
   }>;
}
