import type {
   IProyectoTarifaRepository,
   UpsertProyectoTarifaDTO,
   ProyectoTarifaProps,
} from "../domain/proyecto-tarifa.domain";

export class ProyectoTarifaService {
   constructor(private readonly repo: IProyectoTarifaRepository) { }

   async getByProyecto(proyectoId: string): Promise<ProyectoTarifaProps[]> {
      return this.repo.findByProyectoId(proyectoId);
   }

   async upsert(data: UpsertProyectoTarifaDTO): Promise<ProyectoTarifaProps> {
      if (!data.proyecto_id) throw new Error("El proyecto es requerido");
      if (!data.categoria_equipo_tarifa_id) throw new Error("La tarifa es requerida");
      if (data.precio_unitario < 0) throw new Error("El precio unitario debe ser mayor o igual a 0");

      return this.repo.upsert(data);
   }

   async remove(id: string): Promise<void> {
      await this.repo.delete(id);
   }
}