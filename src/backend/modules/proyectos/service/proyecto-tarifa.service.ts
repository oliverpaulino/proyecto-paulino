import type {
   IProyectoTarifaRepository,
   UpsertProyectoTarifaDTO,
   ProyectoTarifaProps,
   TarifaGlobalRow,
   BulkUpsertTarifaInput,
} from "../domain/proyecto-tarifa.domain";

export class ProyectoTarifaService {
   constructor(private readonly repo: IProyectoTarifaRepository) { }

   async getByProyecto(proyectoId: string): Promise<ProyectoTarifaProps[]> {
      return this.repo.findByProyectoId(proyectoId);
   }

   async getById(id: string): Promise<ProyectoTarifaProps | null> {
      return this.repo.findById(id);
   }

   async getAllConGlobales(
      proyectoId: string,
      search?: string,
      page?: number,
      limit?: number
   ): Promise<{ rows: TarifaGlobalRow[]; total: number }> {
      return this.repo.findAllConGlobales(proyectoId, search, page, limit);
   }

   async upsert(data: UpsertProyectoTarifaDTO): Promise<ProyectoTarifaProps> {
      if (!data.proyecto_id) throw new Error("El proyecto es requerido");
      if (!data.categoria_equipo_tarifa_id) throw new Error("La tarifa es requerida");
      if (data.precio_unitario < 0) throw new Error("El precio unitario debe ser mayor o igual a 0");

      return this.repo.upsert(data);
   }

   async bulkUpsert(proyectoId: string, tarifas: BulkUpsertTarifaInput[]): Promise<void> {
      const validas = tarifas.filter(
         (t) => t.categoria_equipo_tarifa_id && t.precio_unitario >= 0
      );
      if (validas.length === 0) return;
      await this.repo.bulkUpsert(proyectoId, validas);
   }

   async remove(id: string): Promise<void> {
      await this.repo.delete(id);
   }
}
