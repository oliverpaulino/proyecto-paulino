export interface ProyectoEmpleadoTarifaProps {
   id: string;
   proyecto_id: string;
   empleado_id: string;
   empleado_nombre: string;
   categoria_equipo_tarifa_id: string;
   categoria_equipo_tarifa_nombre: string;
   categoria_equipo_nombre: string;
   medida_cobro_nombre: string;
   monto_pago: number;
   created_at: Date;
   updated_at: Date;
}

export interface UpsertProyectoEmpleadoTarifaDTO {
   proyecto_id: string;
   empleado_id: string;
   categoria_equipo_tarifa_id: string;
   monto_pago: number;
}

export interface OperadorTarifaRow {
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

export interface BulkUpsertInput {
   empleado_id: string;
   categoria_equipo_tarifa_id: string;
   monto_pago: number;
}

export interface IProyectoEmpleadoTarifaRepository {
   findByProyectoId(proyectoId: string): Promise<ProyectoEmpleadoTarifaProps[]>;
   findOperadoresConTarifas(proyectoId: string, search?: string, page?: number, limit?: number): Promise<{ rows: OperadorTarifaRow[]; total: number }>;
   upsert(data: UpsertProyectoEmpleadoTarifaDTO): Promise<ProyectoEmpleadoTarifaProps>;
   bulkUpsert(proyectoId: string, tarifas: BulkUpsertInput[]): Promise<void>;
   delete(id: string): Promise<void>;
}
