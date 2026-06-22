import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   ApproverRecord,
   CreatePurchaseOrderDTO,
   EstadoOrdenCompra,
   IPurchaseOrderRepository,
   PurchaseOrder,
   PurchaseOrderItemProps,
   UpdatePurchaseOrderDTO,
} from "../domain/purchase-order.domain";

export class KyselyPurchaseOrderRepository implements IPurchaseOrderRepository {
   constructor(private readonly db: Kysely<DB>) {}

   async findAll(): Promise<PurchaseOrder[]> {
      const rows = await this.db
         .selectFrom("orden_compra")
         .leftJoin("proveedor", "proveedor.id", "orden_compra.proveedor_id")
         .select([
            "orden_compra.id",
            "orden_compra.proveedor_id",
            "proveedor.nombre as proveedor_nombre",
            "orden_compra.fecha",
            "orden_compra.estado",
            "orden_compra.notas",
            "orden_compra.total",
            "orden_compra.approved_by",
            "orden_compra.approved_by_name",
            "orden_compra.approved_at",
            "orden_compra.created_at",
            "orden_compra.updated_at",
         ])
         .orderBy("orden_compra.created_at", "desc")
         .execute();

      return rows.map((row) =>
         PurchaseOrder.create({
            id: row.id,
            proveedor_id: row.proveedor_id,
            proveedor_nombre: row.proveedor_nombre ?? undefined,
            fecha: new Date(row.fecha),
            estado: row.estado as EstadoOrdenCompra,
            notas: row.notas ?? null,
            total: Number(row.total),
            approved_by: row.approved_by ?? null,
            approved_by_name: row.approved_by_name ?? null,
            approved_at: row.approved_at ? new Date(row.approved_at) : null,
            items: [],
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
         })
      );
   }

   async findById(id: string): Promise<PurchaseOrder | null> {
      const row = await this.db
         .selectFrom("orden_compra")
         .leftJoin("proveedor", "proveedor.id", "orden_compra.proveedor_id")
         .select([
            "orden_compra.id",
            "orden_compra.proveedor_id",
            "proveedor.nombre as proveedor_nombre",
            "orden_compra.fecha",
            "orden_compra.estado",
            "orden_compra.notas",
            "orden_compra.total",
            "orden_compra.approved_by",
            "orden_compra.approved_by_name",
            "orden_compra.approved_at",
            "orden_compra.created_at",
            "orden_compra.updated_at",
         ])
         .where("orden_compra.id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      const itemRows = await this.db
         .selectFrom("orden_compra_item")
         .selectAll()
         .where("orden_compra_id", "=", id)
         .execute();

      const items: PurchaseOrderItemProps[] = itemRows.map((i) => ({
         id: i.id,
         orden_compra_id: i.orden_compra_id,
         descripcion: i.descripcion,
         cantidad: Number(i.cantidad),
         precio_unitario: Number(i.precio_unitario),
         subtotal: Number(i.subtotal),
         created_at: new Date(i.created_at),
         updated_at: new Date(i.updated_at),
      }));

      return PurchaseOrder.create({
         id: row.id,
         proveedor_id: row.proveedor_id,
         proveedor_nombre: row.proveedor_nombre ?? undefined,
         fecha: new Date(row.fecha),
         estado: row.estado as EstadoOrdenCompra,
         notas: row.notas ?? null,
         total: Number(row.total),
         approved_by: row.approved_by ?? null,
         approved_by_name: row.approved_by_name ?? null,
         approved_at: row.approved_at ? new Date(row.approved_at) : null,
         items,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async create(data: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
      const result = await this.db.transaction().execute(async (trx) => {
         const header = await trx
            .insertInto("orden_compra")
            .values({
               proveedor_id: data.proveedor_id,
               fecha: data.fecha,
               estado: "BORRADOR",
               notas: data.notas ?? null,
               total: 0,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         const itemsToInsert = data.items.map((item) => ({
            orden_compra_id: header.id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.cantidad * item.precio_unitario,
         }));

         const insertedItems = await trx
            .insertInto("orden_compra_item")
            .values(itemsToInsert)
            .returningAll()
            .execute();

         const total = insertedItems.reduce(
            (sum, i) => sum + Number(i.subtotal),
            0
         );

         await trx
            .updateTable("orden_compra")
            .set({ total, updated_at: new Date() })
            .where("id", "=", header.id)
            .execute();

         return { header: { ...header, total }, items: insertedItems };
      });

      const items: PurchaseOrderItemProps[] = result.items.map((i) => ({
         id: i.id,
         orden_compra_id: i.orden_compra_id,
         descripcion: i.descripcion,
         cantidad: Number(i.cantidad),
         precio_unitario: Number(i.precio_unitario),
         subtotal: Number(i.subtotal),
         created_at: new Date(i.created_at),
         updated_at: new Date(i.updated_at),
      }));

      return PurchaseOrder.create({
         id: result.header.id,
         proveedor_id: result.header.proveedor_id,
         fecha: new Date(result.header.fecha),
         estado: result.header.estado as EstadoOrdenCompra,
         notas: result.header.notas ?? null,
         total: Number(result.header.total),
         approved_by: null,
         approved_by_name: null,
         approved_at: null,
         items,
         created_at: new Date(result.header.created_at),
         updated_at: new Date(result.header.updated_at),
      });
   }

   async updateHeader(
      id: string,
      data: Omit<UpdatePurchaseOrderDTO, "items">
   ): Promise<PurchaseOrder | null> {
      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (data.proveedor_id !== undefined) updateData.proveedor_id = data.proveedor_id;
      if (data.fecha !== undefined) updateData.fecha = data.fecha;
      if (data.notas !== undefined) updateData.notas = data.notas;

      const row = await this.db
         .updateTable("orden_compra")
         .set(updateData)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;
      return this.findById(id);
   }

   async replaceItems(
      id: string,
      items: Array<{
         descripcion: string;
         cantidad: number;
         precio_unitario: number;
      }>
   ): Promise<PurchaseOrder | null> {
      await this.db.transaction().execute(async (trx) => {
         await trx
            .deleteFrom("orden_compra_item")
            .where("orden_compra_id", "=", id)
            .execute();

         const itemsToInsert = items.map((item) => ({
            orden_compra_id: id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.cantidad * item.precio_unitario,
         }));

         const inserted = await trx
            .insertInto("orden_compra_item")
            .values(itemsToInsert)
            .returningAll()
            .execute();

         const total = inserted.reduce(
            (sum, i) => sum + Number(i.subtotal),
            0
         );

         await trx
            .updateTable("orden_compra")
            .set({ total, updated_at: new Date() })
            .where("id", "=", id)
            .execute();
      });

      return this.findById(id);
   }

   async updateStatus(
      id: string,
      estado: EstadoOrdenCompra,
      approvedBy?: string,
      approvedByName?: string
   ): Promise<PurchaseOrder | null> {
      const updateData: Record<string, unknown> = { estado, updated_at: new Date() };
      if (estado === "APROBADA" && approvedBy) {
         updateData.approved_by = approvedBy;
         updateData.approved_by_name = approvedByName ?? null;
         updateData.approved_at = new Date();
      }

      const row = await this.db
         .updateTable("orden_compra")
         .set(updateData)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;
      return this.findById(id);
   }

   async isApprover(userId: string): Promise<boolean> {
      const row = await this.db
         .selectFrom("purchase_order_approvers")
         .select("user_id")
         .where("user_id", "=", userId)
         .executeTakeFirst();
      return !!row;
   }

   async listApprovers(): Promise<ApproverRecord[]> {
      const rows = await this.db
         .selectFrom("purchase_order_approvers")
         .selectAll()
         .orderBy("granted_at", "desc")
         .execute();
      return rows.map((r) => ({
         user_id: r.user_id,
         user_name: r.user_name,
         granted_by: r.granted_by,
         granted_at: new Date(r.granted_at),
      }));
   }

   async addApprover(userId: string, userName: string, grantedBy: string): Promise<void> {
      await this.db
         .insertInto("purchase_order_approvers")
         .values({ user_id: userId, user_name: userName, granted_by: grantedBy })
         .onConflict((oc) => oc.column("user_id").doUpdateSet({ user_name: userName }))
         .execute();
   }

   async removeApprover(userId: string): Promise<void> {
      await this.db
         .deleteFrom("purchase_order_approvers")
         .where("user_id", "=", userId)
         .execute();
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("orden_compra")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}
