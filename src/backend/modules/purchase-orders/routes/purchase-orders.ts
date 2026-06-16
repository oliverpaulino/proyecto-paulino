import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyPurchaseOrderRepository } from "../infraestructure/purchase-order.infraestructure";
import { PurchaseOrderService } from "../service/purchase-order.service";
import type { EstadoOrdenCompra } from "../domain/purchase-order.domain";

const purchaseOrdersRoute = new Hono();
const repo = new KyselyPurchaseOrderRepository(db);
const service = new PurchaseOrderService(repo);

// GET /api/purchase-orders
purchaseOrdersRoute.get("/", async (c) => {
   const orders = await service.getAll();
   return c.json(orders);
});

// GET /api/purchase-orders/:id
purchaseOrdersRoute.get("/:id", async (c) => {
   const order = await service.getById(c.req.param("id"));
   if (!order) return c.json({ error: "Orden no encontrada" }, 404);
   return c.json(order);
});

// POST /api/purchase-orders
purchaseOrdersRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const order = await service.create({
         ...body,
         fecha: body.fecha ? new Date(body.fecha) : new Date(),
      });
      return c.json(order, 201);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400
      );
   }
});

// PATCH /api/purchase-orders/:id/status
purchaseOrdersRoute.patch("/:id/status", async (c) => {
   const body = await c.req.json();
   try {
      const order = await service.changeStatus(
         c.req.param("id"),
         body.estado as EstadoOrdenCompra
      );
      if (!order) return c.json({ error: "Orden no encontrada" }, 404);
      return c.json(order);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400
      );
   }
});

// PATCH /api/purchase-orders/:id
purchaseOrdersRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const order = await service.update(c.req.param("id"), {
         ...body,
         fecha: body.fecha ? new Date(body.fecha) : undefined,
      });
      if (!order) return c.json({ error: "Orden no encontrada" }, 404);
      return c.json(order);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400
      );
   }
});

// DELETE /api/purchase-orders/:id
purchaseOrdersRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Orden no encontrada" }, 404);
   return c.json({ success: true });
});

export default purchaseOrdersRoute;
