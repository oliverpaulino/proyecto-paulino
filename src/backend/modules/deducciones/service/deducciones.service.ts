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
      
      const item = await this.repo.create(data);
      return item.toJSON();
   }

   async update(id: string, data: UpdateDeduccionDTO): Promise<DeduccionProps | null> {
      if (data.monto_total !== undefined && data.monto_total <= 0) {
         throw new Error("El monto de la deducción debe ser mayor a 0");
      }
      
      const item = await this.repo.update(id, data);
      return item ? item.toJSON() : null;
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