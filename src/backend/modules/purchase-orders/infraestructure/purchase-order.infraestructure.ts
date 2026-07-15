import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   ApproverRecord,
   CreatePurchaseOrderDTO,
   EstadoOrdenCompra,
   IPurchaseOrderRepository,
   PurchaseOrder,
   PurchaseOrderItemInput,
   PurchaseOrderItemProps,
   PurchaseOrderProps,
   UpdatePurchaseOrderDTO,
} from "../domain/purchase-order.domain";

function buildCodigoReferencia(referencia: number, fecha: Date): string {
   const yy = String(fecha.getFullYear()).slice(-2);
   const mm = String(fecha.getMonth() + 1).padStart(2, "0");
   const dd = String(fecha.getDate()).padStart(2, "0");
   const ref = String(referencia).padStart(3, "0");
   return `OC-${yy}${mm}${dd}-${ref}`;
}

export class KyselyPurchaseOrderRepository implements IPurchaseOrderRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(params: {
      supplierId?: string;
      search?: string;
      page?: number;
      limit?: number;
   }): Promise<{
      data: PurchaseOrder[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
   }> {
      const { supplierId = "", search = "", page = 1, limit = 10 } = params;

      let baseQuery = this.db
         .selectFrom("orden_compra")
         .leftJoin("proveedor", "proveedor.id", "orden_compra.proveedor_id")
         .where("orden_compra.deleted_at", "is", null);

      if (supplierId) {
         baseQuery = baseQuery.where(
            "orden_compra.proveedor_id",
            "=",
            supplierId
         );
      }

      if (search) {
         const match = search.match(/OC-\d{6}-(\d+)/i);
         const referencia = match ? Number(match[1]) : Number(search);

         baseQuery = baseQuery.where((eb) =>
            eb.or([
               ...(Number.isNaN(referencia)
                  ? []
                  : [eb("orden_compra.referencia", "=", referencia)]),
               eb("proveedor.nombre", "like", `%${search}%`),
               eb("proveedor.rnc", "like", `%${search}%`),
               eb("orden_compra.estado", "like", `%${search}%`),
            ])
         );
      }

      // Total de órdenes
      const totalResult = await baseQuery
         .select(({ fn }) => fn.count("orden_compra.id").as("count"))
         .executeTakeFirstOrThrow();

      const total = Number(totalResult.count);

      // IDs de la página
      const pageOrders = await baseQuery
         .select("orden_compra.id")
         .orderBy("orden_compra.created_at", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      if (pageOrders.length === 0) {
         return {
            data: [],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
         };
      }

      const ids = pageOrders.map((o) => o.id);

      // Traer todos los datos de esas órdenes
      const rows = await this.db
         .selectFrom("orden_compra")
         .leftJoin("proveedor", "proveedor.id", "orden_compra.proveedor_id")
         .innerJoin("orden_compra_item as oci", "oci.orden_compra_id", "orden_compra.id")
         .select([
            "orden_compra.id",
            "orden_compra.referencia",
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

            "oci.id as item_id",
            "oci.cantidad",
            "oci.precio_unitario",
            "oci.descripcion",
            "oci.equipo_id",
            "oci.subtotal",
         ])
         .where("orden_compra.id", "in", ids)
         .orderBy("orden_compra.created_at", "desc")
         .execute();

      const grouped = rows.reduce((acc, row) => {
         if (!acc[row.id]) {
            acc[row.id] = {
               ...row,
               items: [],
            };
         }

         acc[row.id].items.push({
            id: row.item_id,
            orden_compra_id: row.id,
            cantidad: row.cantidad,
            precio_unitario: Number(row.precio_unitario),
            descripcion: row.descripcion ?? null,
            equipo_id: row.equipo_id ?? null,
            subtotal: Number(row.subtotal),
         });

         return acc;
      }, {} as Record<string, any>);

      const data = Object.values(grouped).map((row) =>
         PurchaseOrder.create({
            id: row.id,
            referencia: row.referencia,
            codigoReferencia: buildCodigoReferencia(
               row.referencia,
               new Date(row.fecha)
            ),
            proveedor_id: row.proveedor_id,
            proveedor_nombre: row.proveedor_nombre ?? undefined,
            fecha: new Date(row.fecha),
            estado: row.estado as EstadoOrdenCompra,
            notas: row.notas ?? null,
            total: Number(row.total),
            approved_by: row.approved_by ?? null,
            approved_by_name: row.approved_by_name ?? null,
            approved_at: row.approved_at
               ? new Date(row.approved_at)
               : null,
            items: row.items,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_by: null,
            deleted_at: null,
            deleted_reason: null,
         })
      );

      return {
         data,
         total,
         page,
         limit,
         totalPages: Math.ceil(total / limit),
      };
   }

   async findAllDeleted(params: { supplierId?: string, search?: string, page?: number, limit?: number }): Promise<{
      data: PurchaseOrder[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
   }> {
      const { supplierId = "", search = "", page = 1, limit = 10 } = params;
      let dataQuery = this.db
         .selectFrom("orden_compra")
         .leftJoin("proveedor", "proveedor.id", "orden_compra.proveedor_id")
         .select([
            "orden_compra.id",
            "orden_compra.proveedor_id",
            "proveedor.nombre as proveedor_nombre",
            "orden_compra.referencia",
            "orden_compra.fecha",
            "orden_compra.estado",
            "orden_compra.notas",
            "orden_compra.total",
            "orden_compra.approved_by",
            "orden_compra.approved_by_name",
            "orden_compra.approved_at",
            "orden_compra.created_at",
            "orden_compra.updated_at",
            "orden_compra.deleted_by",
            "orden_compra.deleted_at",
            "orden_compra.deleted_reason",
         ])
         .where("orden_compra.deleted_at", "is not", null);
      let countQuery = this.db
         .selectFrom("orden_compra")
         .leftJoin("proveedor", "proveedor.id", "orden_compra.proveedor_id")
         .where("orden_compra.deleted_at", "is not", null);

      if (supplierId) {
         dataQuery = dataQuery.where(
            "orden_compra.proveedor_id",
            "=",
            supplierId
         );

         countQuery = countQuery.where(
            "orden_compra.proveedor_id",
            "=",
            supplierId
         );
      }

      if (search) {
         const match = search.match(/OC-\d{6}-(\d+)/i);
         const referencia = match ? Number(match[1]) : Number(search);

         dataQuery = dataQuery.where((eb) =>
            eb.or([
               ...(Number.isNaN(referencia)
                  ? []
                  : [eb("orden_compra.referencia", "=", referencia)]),
               eb("proveedor.nombre", "like", `%${search}%`),
               eb("proveedor.rnc", "like", `%${search}%`),
               eb("orden_compra.estado", "like", `%${search}%`),
            ])
         );

         countQuery = countQuery.where((eb) =>
            eb.or([
               ...(Number.isNaN(referencia)
                  ? []
                  : [eb("orden_compra.referencia", "=", referencia)]),
               eb("proveedor.nombre", "like", `%${search}%`),
               eb("proveedor.rnc", "like", `%${search}%`),
               eb("orden_compra.estado", "like", `%${search}%`),
            ])
         );
      }

      const totalResult = await countQuery
         .select(({ fn }) => fn.count("orden_compra.id").as("count"))
         .executeTakeFirstOrThrow();

      const total = Number(totalResult.count);

      const rows = await dataQuery
         .orderBy("orden_compra.deleted_at", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      const data = rows.map((row) =>
         PurchaseOrder.create({
            id: row.id,
            proveedor_id: row.proveedor_id,
            proveedor_nombre: row.proveedor_nombre ?? undefined,
            referencia: row.referencia,
            codigoReferencia: buildCodigoReferencia(
               row.referencia,
               new Date(row.fecha)
            ),
            fecha: new Date(row.fecha),
            estado: row.estado as EstadoOrdenCompra,
            notas: row.notas ?? null,
            total: Number(row.total),
            approved_by: row.approved_by ?? null,
            approved_by_name: row.approved_by_name ?? null,
            approved_at: row.approved_at
               ? new Date(row.approved_at)
               : null,
            items: [],
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_by: row.deleted_by ?? null,
            deleted_at: row.deleted_at
               ? new Date(row.deleted_at)
               : null,
            deleted_reason: row.deleted_reason ?? null,
         })
      );

      return {
         data,
         total,
         page,
         limit,
         totalPages: Math.ceil(total / limit),
      };
   }

   async findById(id: string): Promise<PurchaseOrder | null> {
      const row = await this.db
         .selectFrom("orden_compra")
         .leftJoin("proveedor", "proveedor.id", "orden_compra.proveedor_id")
         .select([
            "orden_compra.id",
            "orden_compra.referencia",
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
         .where("orden_compra.deleted_at", "is", null)
         .executeTakeFirst();

      if (!row) return null;

      const itemRows = await this.db
         .selectFrom("orden_compra_item")
         .leftJoin("equipo", "equipo.id", "orden_compra_item.equipo_id")
         .select([
            "orden_compra_item.id",
            "orden_compra_item.orden_compra_id",
            "orden_compra_item.equipo_id",
            "equipo.nombre as equipo_nombre",
            "orden_compra_item.descripcion",
            "orden_compra_item.cantidad",
            "orden_compra_item.precio_unitario",
            "orden_compra_item.subtotal",
            "orden_compra_item.created_at",
            "orden_compra_item.updated_at",
         ])
         .where("orden_compra_item.orden_compra_id", "=", id)
         .execute();

      const items: PurchaseOrderItemProps[] = itemRows.map((i) => ({
         id: i.id,
         orden_compra_id: i.orden_compra_id,
         equipo_id: i.equipo_id ?? null,
         equipo_nombre: i.equipo_nombre ?? null,
         descripcion: i.descripcion,
         cantidad: Number(i.cantidad),
         precio_unitario: Number(i.precio_unitario),
         subtotal: Number(i.subtotal),
         created_at: new Date(i.created_at),
         updated_at: new Date(i.updated_at),
      }));

      return PurchaseOrder.create({
         id: row.id,
         referencia: row.referencia,
         codigoReferencia: buildCodigoReferencia(row.referencia, new Date(row.fecha)),
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
         deleted_by: null,
         deleted_at: null,
         deleted_reason: null,
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
            equipo_id: item.equipo_id ?? null,
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

         return header.id;
      });

      // const items: PurchaseOrderItemProps[] = result.items.map((i) => ({
      //    id: i.id,
      //    orden_compra_id: i.orden_compra_id,
      //    descripcion: i.descripcion,
      //    cantidad: Number(i.cantidad),
      //    precio_unitario: Number(i.precio_unitario),
      //    subtotal: Number(i.subtotal),
      //    created_at: new Date(i.created_at),
      //    updated_at: new Date(i.updated_at),
      // }));

      // return PurchaseOrder.create({
      //    id: result.header.id,
      //    referencia: result.header.referencia,
      //    codigoReferencia: buildCodigoReferencia(
      //       result.header.referencia,
      //       new Date(result.header.fecha)
      //    ),
      //    proveedor_id: result.header.proveedor_id,
      //    fecha: new Date(result.header.fecha),
      //    estado: result.header.estado as EstadoOrdenCompra,
      //    notas: result.header.notas ?? null,
      //    total: Number(result.header.total),
      //    approved_by: null,
      //    approved_by_name: null,
      //    approved_at: null,
      //    items,
      //    created_at: new Date(result.header.created_at),
      //    updated_at: new Date(result.header.updated_at),
      //    deleted_by: result.header.deleted_by ?? null,
      //    deleted_at: result.header.deleted_at ?? null,
      //    deleted_reason: result.header.deleted_reason ?? null
      // });
      // Re-fetch through findById so the response carries joined equipo names
      // and the deleted_* fields, without re-mapping them here.
      const order = await this.findById(result);
      if (!order) throw new Error("Error al crear la orden de compra");
      return order;
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

   async restore(id: string): Promise<PurchaseOrder | null> {
      const row = await this.db
         .updateTable("orden_compra")
         .set({
            deleted_by: null,
            deleted_at: null,
            deleted_reason: null,
         })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;

      return this.findById(id);
   }

   async replaceItems(
      id: string,
      items: PurchaseOrderItemInput[]
   ): Promise<PurchaseOrder | null> {
      await this.db.transaction().execute(async (trx) => {
         await trx
            .deleteFrom("orden_compra_item")
            .where("orden_compra_id", "=", id)
            .execute();

         const itemsToInsert = items.map((item) => ({
            orden_compra_id: id,
            equipo_id: item.equipo_id ?? null,
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
         is_protected: r.is_protected,
      }));
   }

   async addApprover(userId: string, userName: string, grantedBy: string): Promise<void> {
      await this.db
         .insertInto("purchase_order_approvers")
         .values({ user_id: userId, user_name: userName, granted_by: grantedBy, granted_at: new Date(), is_protected: false })
         .onConflict((oc) => oc.column("user_id").doUpdateSet({ user_name: userName }))
         .execute();
   }

   async removeApprover(userId: string): Promise<void> {
      const approver = await this.db
         .selectFrom("purchase_order_approvers")
         .select("is_protected")
         .where("user_id", "=", userId)
         .executeTakeFirst();

      // 2. Si no existe, no hacemos nada (o puedes lanzar error)
      if (!approver) return;

      // 3. Si está protegido, bloqueamos la acción con un error claro
      if (approver.is_protected) {
         throw new Error("Este aprobador está protegido y no puede ser removido");
      }

      // 4. Si pasa las validaciones, lo eliminamos
      await this.db
         .deleteFrom("purchase_order_approvers")
         .where("user_id", "=", userId)
         .execute();
   }

   async delete(userId: string, id: string): Promise<boolean> {


      const result = await this.db
         .updateTable("orden_compra")
         .set({ deleted_by: userId, deleted_at: new Date() })
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();

      return Number(result.numUpdatedRows) > 0;
   }
}
