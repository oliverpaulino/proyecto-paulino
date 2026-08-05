import {
   CreateGastoDTO,
   CreateGastoDeduccionDTO,
   DeleteGastoDTO,
   GastoProps,
   IGastoRepository,
   UpdateGastoDTO,
} from "../domain/gastos.domain";

export class GastoService {
   constructor(private readonly repo: IGastoRepository) { }

   async getAll(params?: any): Promise<GastoProps[]> {
      const items = await this.repo.findAll(params);
      return items.map((g) => g.toJSON());
   }

   async getAllDeleted(params?: any): Promise<GastoProps[]> {
      const items = await this.repo.findAllDeleted(params);
      return items.map((g) => g.toJSON());
   }

   async getById(id: string): Promise<GastoProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }
   
   async getDeletedById(id: string): Promise<GastoProps | null> {
      const item = await this.repo.findDeletedById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreateGastoDTO): Promise<GastoProps> {
      if (data.monto_total <= 0) throw new Error("El monto debe ser mayor a 0");

      this.validateCobrable(data);

      if (data.deduccion) {
         this.validateDeduccion(data.deduccion);
         const disponible = this.montoDisponibleParaDeduccion(data);
         if (data.deduccion.monto_total > disponible) {
            throw new Error(
               `La deducción no puede superar el monto disponible del gasto ($${disponible.toLocaleString("en-US", { minimumFractionDigits: 2 })}), tras descontar lo cobrado al cliente.`
            );
         }
         const item = await this.repo.createWithDeduccion(data);
         return item.toJSON();
      }

      const item = await this.repo.create(data);
      return item.toJSON();
   }

   async update(id: string, data: UpdateGastoDTO): Promise<GastoProps | null> {
      if (data.monto_total !== undefined && data.monto_total <= 0) {
         throw new Error("El monto debe ser mayor a 0");
      }

      if (data.cobrable_monto !== undefined && data.cobrable_monto !== null && data.cobrable_monto < 0) {
         throw new Error("El monto a cobrar al cliente no puede ser menor a 0");
      }
      if (data.cobrable_proyecto && data.cobrable_monto != null && data.monto_total !== undefined) {
         if (data.cobrable_monto > data.monto_total) {
            throw new Error("El monto a cobrar al cliente no puede ser mayor al monto del gasto");
         }
      }

      const item = await this.repo.update(id, data);
      return item ? item.toJSON() : null;
   }

   private validateCobrable(data: CreateGastoDTO): void {
      if (!data.cobrable_proyecto) return;

      const cobrable = data.cobrable_monto ?? 0;
      if (cobrable < 0) {
         throw new Error("El monto a cobrar al cliente no puede ser menor a 0");
      }
      if (cobrable > data.monto_total) {
         throw new Error("El monto a cobrar al cliente no puede ser mayor al monto del gasto");
      }
   }

   private montoDisponibleParaDeduccion(data: CreateGastoDTO): number {
      const cobrable = data.cobrable_proyecto ? (data.cobrable_monto ?? 0) : 0;
      return Math.max(0, data.monto_total - cobrable);
   }

   private validateDeduccion(deduccion: CreateGastoDeduccionDTO): void {
      if (deduccion.monto_total <= 0) {
         throw new Error("El monto de la deducción debe ser mayor a 0");
      }
      if (deduccion.cuotas_sugeridas !== undefined && deduccion.cuotas_sugeridas <= 0) {
         throw new Error("La cantidad de cuotas sugeridas debe ser mayor a 0");
      }
   }

   async delete(id: string, data: DeleteGastoDTO): Promise<boolean> {
      if (!data.deleted_reason?.trim()) {
         throw new Error("Debe proporcionar un motivo de eliminación");
      }
      return this.repo.delete(id, data);
   }

   async restore(id: string): Promise<GastoProps | null>{
      if (!id) {
         throw new Error("Debe proporcionar el id para restaurar el gasto");
      }
      return this.repo.restore(id);
   }
}