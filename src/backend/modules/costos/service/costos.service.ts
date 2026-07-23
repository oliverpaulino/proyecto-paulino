import {
   CreateCostoDTO,
   DeleteCostoDTO,
   CostoProps,
   ICostoRepository,
   UpdateCostoDTO,
} from "../domain/costos.domain";

export class CostoService {
   constructor(private readonly repo: ICostoRepository) { }

   async getAll(params?: any): Promise<CostoProps[]> {
      const items = await this.repo.findAll(params);
      return items.map((c) => c.toJSON());
   }

   async getAllDeleted(params?: any): Promise<CostoProps[]> {
      const items = await this.repo.findAllDeleted(params);
      return items.map((c) => c.toJSON());
   }

   async getById(id: string): Promise<CostoProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }
   
   async getDeletedById(id: string): Promise<CostoProps | null> {
      const item = await this.repo.findDeletedById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreateCostoDTO): Promise<CostoProps> {
      if (data.monto_total <= 0) throw new Error("El monto debe ser mayor a 0");
      
      const item = await this.repo.create(data);
      return item.toJSON();
   }

   async update(id: string, data: UpdateCostoDTO): Promise<CostoProps | null> {
      if (data.monto_total !== undefined && data.monto_total <= 0) {
         throw new Error("El monto debe ser mayor a 0");
      }
      
      const item = await this.repo.update(id, data);
      return item ? item.toJSON() : null;
   }

   async delete(id: string, data: DeleteCostoDTO): Promise<boolean> {
      if (!data.deleted_reason?.trim()) {
         throw new Error("Debe proporcionar un motivo de eliminación");
      }
      return this.repo.delete(id, data);
   }

   async restore(id: string): Promise<CostoProps | null>{
      if (!id) {
         throw new Error("Debe proporcionar el id para restaurar el costo");
      }
      return this.repo.restore(id);
   }
}