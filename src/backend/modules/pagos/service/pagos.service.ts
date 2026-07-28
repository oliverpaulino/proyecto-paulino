import {
   CreatePagoDTO,
   DeletePagoDTO,
   PagoProps,
   IPagoRepository,
   UpdatePagoDTO,
} from "../domain/pagos.domain";

export class PagoService {
   constructor(private readonly repo: IPagoRepository) { }

   private validarExclusividad(data: Partial<CreatePagoDTO>) {
      const count = [data.gasto_empresa_id, data.costo_cliente_id, data.deduccion_empleado_id, data.proyecto_id].filter(Boolean).length;
      if (count !== 1) {
         throw new Error("El pago debe estar asociado a exactamente un origen (Gasto, Costo, Deducción o Proyecto).");
      }
   }

   async getAll(params?: any): Promise<PagoProps[]> {
      const items = await this.repo.findAll(params);
      return items.map((c) => c.toJSON());
   }

   async getAllDeleted(params?: any): Promise<PagoProps[]> {
      const items = await this.repo.findAllDeleted(params);
      return items.map((c) => c.toJSON());
   }

   async getById(id: string): Promise<PagoProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }
   
   async getDeletedById(id: string): Promise<PagoProps | null> {
      const item = await this.repo.findDeletedById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreatePagoDTO): Promise<PagoProps> {
      if (data.monto_pagado <= 0) throw new Error("El monto pagado debe ser mayor a 0");
      this.validarExclusividad(data);
      
      const item = await this.repo.create(data);
      return item.toJSON();
   }

   async update(id: string, data: UpdatePagoDTO): Promise<PagoProps | null> {
      if (data.monto_pagado !== undefined && data.monto_pagado <= 0) {
         throw new Error("El monto pagado debe ser mayor a 0");
      }
      
      const current = await this.repo.findById(id);
      if (!current) throw new Error("Pago no encontrado");

      const mergeData = {
         gasto_empresa_id: data.gasto_empresa_id !== undefined ? data.gasto_empresa_id : current.gasto_empresa_id,
         costo_cliente_id: data.costo_cliente_id !== undefined ? data.costo_cliente_id : current.costo_cliente_id,
         deduccion_empleado_id: data.deduccion_empleado_id !== undefined ? data.deduccion_empleado_id : current.deduccion_empleado_id,
         proyecto_id: data.proyecto_id !== undefined ? data.proyecto_id : current.proyecto_id,
      };

      this.validarExclusividad(mergeData);

      const item = await this.repo.update(id, data);
      return item ? item.toJSON() : null;
   }

   async delete(id: string, data: DeletePagoDTO): Promise<boolean> {
      if (!data.deleted_reason?.trim()) {
         throw new Error("Debe proporcionar un motivo de anulación");
      }
      return this.repo.delete(id, data);
   }

   async restore(id: string): Promise<PagoProps | null>{
      if (!id) {
         throw new Error("Debe proporcionar el id para restaurar el pago");
      }
      return this.repo.restore(id);
   }
}