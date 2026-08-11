import { PaginatedResult } from "@/backend/shared/pagination";
import {
   CreateDeduccionDTO,
   DeduccionesParams,
   DeduccionProps,
   DeleteDeduccionDTO,
   IDeduccionRepository,
   PagarDeduccionDTO,
   UpdateDeduccionDTO,
} from "../domain/deducciones.domain";

export class DeduccionService {
   constructor(private readonly repo: IDeduccionRepository) { }

   async getAll(params?: DeduccionesParams): Promise<PaginatedResult<DeduccionProps>> {
      const result = await this.repo.findAll(params);
      return { ...result, data: result.data.map((c) => c.toJSON()) };
   }

   async getAllDeleted(params?: DeduccionesParams): Promise<PaginatedResult<DeduccionProps>> {
      const result = await this.repo.findAllDeleted(params);
      return { ...result, data: result.data.map((c) => c.toJSON()) };
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
    * Registra un pago directo contra una deducción (fuera de la nómina).
    * El monto no puede exceder lo que queda pendiente por cobrar.
    */
   async pagar(id: string, data: PagarDeduccionDTO): Promise<DeduccionProps | null> {
      if (!id) throw new Error("Debe proporcionar el id de la deducción");

      const item = await this.repo.pagar(id, data);
      if (!item) return null;
      return item.toJSON();
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