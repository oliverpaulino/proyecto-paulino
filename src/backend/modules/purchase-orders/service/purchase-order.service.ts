import {
   ApproverRecord,
   canTransition,
   CreatePurchaseOrderDTO,
   EstadoOrdenCompra,
   IPurchaseOrderRepository,
   isEditable,
   PurchaseOrderItemInput,
   PurchaseOrderProps,
   UpdatePurchaseOrderDTO,
} from "../domain/purchase-order.domain";

export class PurchaseOrderService {
   constructor(private readonly repo: IPurchaseOrderRepository) { }

   async getAll(): Promise<PurchaseOrderProps[]> {
      const orders = await this.repo.findAll();
      return orders.map((o) => o.toJSON());
   }

   async getAllDeleted(): Promise<PurchaseOrderProps[]> {
      const orders = await this.repo.findAllDeleted();
      return orders.map((o) => o.toJSON());
   }

   async getById(id: string): Promise<PurchaseOrderProps | null> {
      const order = await this.repo.findById(id);
      return order ? order.toJSON() : null;
   }

   async create(data: CreatePurchaseOrderDTO): Promise<PurchaseOrderProps> {
      if (!data.proveedor_id?.trim()) {
         throw new Error("Proveedor es requerido");
      }
      if (!data.fecha) {
         throw new Error("Fecha es requerida");
      }
      if (!data.items || data.items.length === 0) {
         throw new Error("La orden debe tener al menos un ítem");
      }
      this.validateItems(data.items);

      const order = await this.repo.create(data);
      return order.toJSON();
   }

   async update(
      id: string,
      data: UpdatePurchaseOrderDTO
   ): Promise<PurchaseOrderProps | null> {
      const existing = await this.repo.findById(id);
      if (!existing) return null;

      if (!isEditable(existing.estado)) {
         throw new Error(
            `No se puede editar una orden en estado ${existing.estado}`
         );
      }

      const { items, ...headerData } = data;

      if (Object.keys(headerData).length > 0) {
         await this.repo.updateHeader(id, headerData);
      }

      if (items !== undefined) {
         if (items.length === 0) {
            throw new Error("La orden debe tener al menos un ítem");
         }
         this.validateItems(items);
         await this.repo.replaceItems(id, items);
      }

      return this.getById(id);
   }

   async changeStatus(
      id: string,
      nuevoEstado: EstadoOrdenCompra,
      userId?: string,
      userName?: string
   ): Promise<PurchaseOrderProps | null> {
      const existing = await this.repo.findById(id);
      if (!existing) return null;

      if (!canTransition(existing.estado, nuevoEstado)) {
         throw new Error(
            `Transición inválida: ${existing.estado} → ${nuevoEstado}`
         );
      }

      const order = await this.repo.updateStatus(id, nuevoEstado, userId, userName);
      return order ? order.toJSON() : null;
   }

   async isApprover(userId: string): Promise<boolean> {
      return this.repo.isApprover(userId);
   }

   async listApprovers(): Promise<ApproverRecord[]> {
      return this.repo.listApprovers();
   }

   async addApprover(userId: string, userName: string, grantedBy: string): Promise<void> {
      return this.repo.addApprover(userId, userName, grantedBy);
   }

   async removeApprover(userId: string): Promise<void> {
      return this.repo.removeApprover(userId);
   }

   async delete(userId: string, id: string): Promise<boolean> {
      return this.repo.delete(userId, id);
   }

   private validateItems(items: PurchaseOrderItemInput[]): void {
      for (let i = 0; i < items.length; i++) {
         const item = items[i];
         if (!item.descripcion?.trim()) {
            throw new Error(`Ítem ${i + 1}: descripción es requerida`);
         }
         if (!item.cantidad || item.cantidad <= 0) {
            throw new Error(`Ítem ${i + 1}: cantidad debe ser mayor a 0`);
         }
         if (item.precio_unitario === undefined || item.precio_unitario < 0) {
            throw new Error(
               `Ítem ${i + 1}: precio unitario debe ser mayor o igual a 0`
            );
         }
      }
   }
}
