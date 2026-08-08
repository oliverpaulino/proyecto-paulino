import type {
   IProyectoEmpleadoTarifaRepository,
   UpsertProyectoEmpleadoTarifaDTO,
   ProyectoEmpleadoTarifaProps,
   OperadorTarifaRow,
   BulkUpsertInput,
} from "../domain/proyecto-empleado-tarifa.domain";

export class ProyectoEmpleadoTarifaService {
   constructor(private readonly repo: IProyectoEmpleadoTarifaRepository) { }

   async getByProyecto(proyectoId: string): Promise<ProyectoEmpleadoTarifaProps[]> {
      return this.repo.findByProyectoId(proyectoId);
   }

   async getOperadoresConTarifas(
      proyectoId: string,
      search?: string,
      page?: number,
      limit?: number
   ): Promise<{ rows: OperadorTarifaRow[]; total: number }> {
      return this.repo.findOperadoresConTarifas(proyectoId, search, page, limit);
   }

   async upsert(data: UpsertProyectoEmpleadoTarifaDTO): Promise<ProyectoEmpleadoTarifaProps> {
      if (!data.proyecto_id) throw new Error("El proyecto es requerido");
      if (!data.empleado_id) throw new Error("El empleado es requerido");
      if (!data.categoria_equipo_tarifa_id) throw new Error("La tarifa es requerida");
      if (data.monto_pago < 0) throw new Error("El monto debe ser mayor o igual a 0");
      return this.repo.upsert(data);
   }

   async bulkUpsert(proyectoId: string, tarifas: BulkUpsertInput[]): Promise<void> {
      const validas = tarifas.filter(
         (t) => t.empleado_id && t.categoria_equipo_tarifa_id && t.monto_pago >= 0
      );
      if (validas.length === 0) return;
      await this.repo.bulkUpsert(proyectoId, validas);
   }

   async remove(id: string): Promise<void> {
      await this.repo.delete(id);
   }
}
