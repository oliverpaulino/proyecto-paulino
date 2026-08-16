export interface ProyectoTarifaProps {
   id: string;
   proyecto_id: string;
   categoria_equipo_tarifa_id: string;
   categoria_equipo_tarifa_nombre: string;
   categoria_equipo_nombre: string;
   medida_cobro_nombre: string;
   precio_unitario: number;
   created_at: Date;
   updated_at: Date;
}

export interface UpsertProyectoTarifaDTO {
   proyecto_id: string;
   categoria_equipo_tarifa_id: string;
   precio_unitario: number;
}

export interface TarifaGlobalRow {
   categoria_equipo_tarifa_id: string;
   categoria_equipo_tarifa_nombre: string;
   categoria_equipo_id: string;
   categoria_equipo_nombre: string;
   medida_cobro_nombre: string;
   precio_global: number;
   precio_proyecto: number | null;
   proyecto_tarifa_id: string | null;
}

export interface BulkUpsertTarifaInput {
   categoria_equipo_tarifa_id: string;
   precio_unitario: number;
}

export interface IProyectoTarifaRepository {
   findByProyectoId(proyectoId: string): Promise<ProyectoTarifaProps[]>;
   findAllConGlobales(proyectoId: string, search?: string, page?: number, limit?: number): Promise<{ rows: TarifaGlobalRow[]; total: number }>;
   upsert(data: UpsertProyectoTarifaDTO): Promise<ProyectoTarifaProps>;
   bulkUpsert(proyectoId: string, tarifas: BulkUpsertTarifaInput[]): Promise<void>;
   findById(id: string): Promise<ProyectoTarifaProps | null>;
   delete(id: string): Promise<void>;
}
