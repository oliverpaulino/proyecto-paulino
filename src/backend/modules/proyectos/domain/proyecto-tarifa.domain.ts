// Precio negociado para UN proyecto en particular, sobre una tarifa
// específica de categoria_equipo_tarifa (que ya combina categoría +
// medida_cobro). Tiene prioridad sobre categoria_equipo_tarifa.precio_unitario
// al precargar el precio en el conduce-form, pero sigue siendo editable a
// mano al registrar el conduce.

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

export interface IProyectoTarifaRepository {
   findByProyectoId(proyectoId: string): Promise<ProyectoTarifaProps[]>;
   upsert(data: UpsertProyectoTarifaDTO): Promise<ProyectoTarifaProps>;
   delete(id: string): Promise<void>;
}