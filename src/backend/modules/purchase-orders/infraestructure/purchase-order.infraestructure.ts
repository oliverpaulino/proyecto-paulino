import { Kysely, sql } from "kysely";
import { DB } from "@/backend/database";
import {
   ApproverRecord,
   CreatePurchaseOrderDTO,
   EstadoOrdenCompra,
   estadoPagoOrden,
   IPurchaseOrderRepository,
   PurchaseOrder,
   PurchaseOrderFilters,
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

/**
 * Suma de lo pagado directamente a una orden de compra. Gastos y órdenes de
 * compra se manejan como obligaciones separadas: pagar el gasto vinculado a la
 * OC NO paga la OC. Así se evita el doble conteo / sobrepago cuando la OC se
 * paga directo y además se paga el gasto que la referencia. Los pagos
 * anulados (`deleted_at`) no cuentan — si se anula un pago, el saldo vuelve a
 * estar vivo. El estado_pago se deriva luego con `estadoPagoOrden`.
 */
const pagadoDeOrden = sql<number>`coalesce((
   select sum(p.monto_pagado)
   from pago p
   where p.orden_compra_id = orden_compra.id
     and p.deleted_at is null
), 0)`;

export class KyselyPurchaseOrderRepository implements IPurchaseOrderRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(params: PurchaseOrderFilters): Promise<{
      data: PurchaseOrder[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
   }> {
      const { supplierId = "", search = "", page = 1, limit = 10, estado, estadoPago, equipoId } = params;

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

      if (estado) {
         baseQuery = baseQuery.where("orden_compra.estado", "=", estado);
      }

      if (equipoId) {
         baseQuery = baseQuery.where((eb) =>
            eb.exists(
               eb
                  .selectFrom("orden_compra_item as oci_f")
                  .select("oci_f.id")
                  .whereRef("oci_f.orden_compra_id", "=", "orden_compra.id")
                  .where("oci_f.equipo_id", "=", equipoId)
            )
         );
      }

      if (estadoPago) {
         baseQuery = baseQuery.where((eb) => {
            if (estadoPago === "PENDIENTE") {
               return eb(pagadoDeOrden, "<=", 0.01);
            }
            if (estadoPago === "PAGADO") {
               return eb(pagadoDeOrden, ">=", sql<number>`orden_compra.total - 0.01`);
            }
            return eb.and([
               eb(pagadoDeOrden, ">", 0.01),
               eb(pagadoDeOrden, "<", sql<number>`orden_compra.total - 0.01`),
            ]);
         });
      }

      if (search) {
         const cleanSearch = search.trim();

         // Si el usuario solo escribió "oc" u "oc-", ignoramos la búsqueda
         // porque todas las órdenes son OC y no aporta al filtro.
         if (cleanSearch.toLowerCase() === "oc" || cleanSearch.toLowerCase() === "oc-") {
            // No hacemos nada, la consulta base ya trae todas las órdenes
         } else {
            const match = cleanSearch.match(/OC-\d{6}-(\d+)/i);
            const numeroReferencia = match ? parseInt(match[1], 10) : parseInt(cleanSearch, 10);
            const esNumeroValido = !Number.isNaN(numeroReferencia);

            baseQuery = baseQuery.where((eb) =>
               eb.or([
                  ...(esNumeroValido ? [eb("orden_compra.referencia", "=", numeroReferencia)] : []),
                  eb("proveedor.nombre", "ilike", `%${cleanSearch}%`),
                  eb("proveedor.rnc", "ilike", `%${cleanSearch}%`),
                  eb(sql<string>`cast(orden_compra.referencia as text)`, "ilike", `%${cleanSearch}%`),
                  eb("orden_compra.estado", "ilike", `%${cleanSearch}%`),
               ])
            );
         }
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
            pagadoDeOrden.as("pagado"),
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
            estado_pago: estadoPagoOrden(Number(row.total), Number(row.pagado)),
            notas: row.notas ?? null,
            total: Number(row.total),
            pagado: Number(row.pagado),
            pendiente: Math.max(0, Number(row.total) - Number(row.pagado)),
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

   async findAllDeleted(params: PurchaseOrderFilters): Promise<{
      data: PurchaseOrder[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
   }> {
      const { supplierId = "", search = "", page = 1, limit = 10, estado, estadoPago, equipoId } = params;
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
            pagadoDeOrden.as("pagado"),
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

      if (estado) {
         dataQuery = dataQuery.where("orden_compra.estado", "=", estado);
         countQuery = countQuery.where("orden_compra.estado", "=", estado);
      }

      if (equipoId) {
         dataQuery = dataQuery.where((eb) =>
            eb.exists(
               eb
                  .selectFrom("orden_compra_item as oci_f")
                  .select("oci_f.id")
                  .whereRef("oci_f.orden_compra_id", "=", "orden_compra.id")
                  .where("oci_f.equipo_id", "=", equipoId)
            )
         );
         countQuery = countQuery.where((eb) =>
            eb.exists(
               eb
                  .selectFrom("orden_compra_item as oci_f")
                  .select("oci_f.id")
                  .whereRef("oci_f.orden_compra_id", "=", "orden_compra.id")
                  .where("oci_f.equipo_id", "=", equipoId)
            )
         );
      }

      if (estadoPago) {
         dataQuery = dataQuery.where((eb) => {
            if (estadoPago === "PENDIENTE") {
               return eb(pagadoDeOrden, "<=", 0.01);
            }
            if (estadoPago === "PAGADO") {
               return eb(pagadoDeOrden, ">=", sql<number>`orden_compra.total - 0.01`);
            }
            return eb.and([
               eb(pagadoDeOrden, ">", 0.01),
               eb(pagadoDeOrden, "<", sql<number>`orden_compra.total - 0.01`),
            ]);
         });
         countQuery = countQuery.where((eb) => {
            if (estadoPago === "PENDIENTE") {
               return eb(pagadoDeOrden, "<=", 0.01);
            }
            if (estadoPago === "PAGADO") {
               return eb(pagadoDeOrden, ">=", sql<number>`orden_compra.total - 0.01`);
            }
            return eb.and([
               eb(pagadoDeOrden, ">", 0.01),
               eb(pagadoDeOrden, "<", sql<number>`orden_compra.total - 0.01`),
            ]);
         });
      }

      if (search) {
         const cleanSearch = search.trim();

         // Si el usuario solo escribió "oc" u "oc-", ignoramos la búsqueda
         if (cleanSearch.toLowerCase() === "oc" || cleanSearch.toLowerCase() === "oc-") {
            // No hacemos nada, la consulta base ya trae todas las órdenes
         } else {
            const match = cleanSearch.match(/OC-\d{6}-(\d+)/i);
            const numeroReferencia = match ? parseInt(match[1], 10) : parseInt(cleanSearch, 10);
            const esNumeroValido = !Number.isNaN(numeroReferencia);

            // Aplicamos a la consulta de DATOS
            dataQuery = dataQuery.where((eb) =>
               eb.or([
                  ...(esNumeroValido ? [eb("orden_compra.referencia", "=", numeroReferencia)] : []),
                  eb("proveedor.nombre", "ilike", `%${cleanSearch}%`),
                  eb("proveedor.rnc", "ilike", `%${cleanSearch}%`),
                  eb(sql<string>`cast(orden_compra.referencia as text)`, "ilike", `%${cleanSearch}%`),
                  eb("orden_compra.estado", "ilike", `%${cleanSearch}%`),
               ])
            );

            // Aplicamos exactamente lo mismo a la consulta de CONTEO (TotalPages)
            countQuery = countQuery.where((eb) =>
               eb.or([
                  ...(esNumeroValido ? [eb("orden_compra.referencia", "=", numeroReferencia)] : []),
                  eb("proveedor.nombre", "ilike", `%${cleanSearch}%`),
                  eb("proveedor.rnc", "ilike", `%${cleanSearch}%`),
                  eb(sql<string>`cast(orden_compra.referencia as text)`, "ilike", `%${cleanSearch}%`),
                  eb("orden_compra.estado", "ilike", `%${cleanSearch}%`),
               ])
            );
         }
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
            estado_pago: estadoPagoOrden(Number(row.total), Number(row.pagado)),
            notas: row.notas ?? null,
            total: Number(row.total),
            pagado: Number(row.pagado),
            pendiente: Math.max(0, Number(row.total) - Number(row.pagado)),
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
            pagadoDeOrden.as("pagado"),
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
         estado_pago: estadoPagoOrden(Number(row.total), Number(row.pagado)),
         notas: row.notas ?? null,
         total: Number(row.total),
         pagado: Number(row.pagado),
         pendiente: Math.max(0, Number(row.total) - Number(row.pagado)),
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

   async findDeletedById(id: string): Promise<PurchaseOrder | null> {
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
            pagadoDeOrden.as("pagado"),
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
         .where("orden_compra.id", "=", id)
         .where("orden_compra.deleted_at", "is not", null)
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
         estado_pago: estadoPagoOrden(Number(row.total), Number(row.pagado)),
         notas: row.notas ?? null,
         total: Number(row.total),
         pagado: Number(row.pagado),
         pendiente: Math.max(0, Number(row.total) - Number(row.pagado)),
         approved_by: row.approved_by ?? null,
         approved_by_name: row.approved_by_name ?? null,
         approved_at: row.approved_at ? new Date(row.approved_at) : null,
         items,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
         deleted_by: row.deleted_by ?? null,
         deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
         deleted_reason: row.deleted_reason ?? null,
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

   async delete(userId: string, id: string, deleted_reason?: string | null): Promise<boolean> {
      const result = await this.db
         .updateTable("orden_compra")
         .set({
            deleted_by: userId,
            deleted_at: new Date(),
            deleted_reason: deleted_reason ?? null,
         })
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();

      return Number(result.numUpdatedRows) > 0;
   }
}
