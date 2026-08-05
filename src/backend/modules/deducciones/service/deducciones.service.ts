import {
   CreateDeduccionDTO,
   DeleteDeduccionDTO,
   DeduccionProps,
   IDeduccionRepository,
   UpdateDeduccionDTO,
} from "../domain/deducciones.domain";

export class DeduccionService {
   constructor(private readonly repo: IDeduccionRepository) { }

   async getAll(params?: any): Promise<DeduccionProps[]> {
      const items = await this.repo.findAll(params);
      return items.map((c) => c.toJSON());
   }

   async getAllDeleted(params?: any): Promise<DeduccionProps[]> {
      const items = await this.repo.findAllDeleted(params);
      return items.map((c) => c.toJSON());
   }

   async getById(id: string): Promise<DeduccionProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }
   
   async getDeletedById(id: string): Promise<DeduccionProps | null> {
      const item = await this.repo.findDeletedById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreateDeduccionDTO): Promise<DeduccionProps> {
      if (data.monto_total <= 0) throw new Error("El monto de la deducción debe ser mayor a 0");

      const cuotas_sugeridas = data.cuotas_sugeridas ?? 1;
      this.calcularMontoSugerido(data.monto_total, cuotas_sugeridas);

      const item = await this.repo.create({ ...data, cuotas_sugeridas });
      return item.toJSON();
   }

   async update(id: string, data: UpdateDeduccionDTO): Promise<DeduccionProps | null> {
      if (data.monto_total !== undefined && data.monto_total <= 0) {
         throw new Error("El monto de la deducción debe ser mayor a 0");
      }

      if (data.cuotas_sugeridas !== undefined && data.cuotas_sugeridas <= 0) {
         throw new Error("La cantidad de cuotas sugeridas debe ser mayor a 0");
      }

      const item = await this.repo.update(id, data);
      return item ? item.toJSON() : null;
   }

   /**
    * Calcula el monto sugerido de la deducción por cuota:
    * monto_total ÷ cuotas_sugeridas. Valida que ambos sean mayores a 0.
    */
   calcularMontoSugerido(monto_total: number, cuotas_sugeridas: number): number {
      if (!Number.isFinite(monto_total) || monto_total <= 0) {
         throw new Error("El monto de la deducción debe ser mayor a 0");
      }
      if (!Number.isInteger(cuotas_sugeridas) || cuotas_sugeridas <= 0) {
         throw new Error("La cantidad de cuotas sugeridas debe ser mayor a 0");
      }
      return monto_total / cuotas_sugeridas;
   }

   async delete(id: string, data: DeleteDeduccionDTO): Promise<boolean> {
      if (!data.deleted_reason?.trim()) {
         throw new Error("Debe proporcionar un motivo de anulación");
      }
      return this.repo.delete(id, data);
   }

   async restore(id: string): Promise<DeduccionProps | null>{
      if (!id) {
         throw new Error("Debe proporcionar el id para restaurar la deducción");
      }
      return this.repo.restore(id);
   }
}