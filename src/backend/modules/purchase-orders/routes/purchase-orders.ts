import { Hono } from "hono";
import db from "@/backend/database";
import { auth } from "@/lib/auth";
import { KyselyPurchaseOrderRepository } from "../infraestructure/purchase-order.infraestructure";
import { PurchaseOrderService } from "../service/purchase-order.service";
import { KyselyNotificationRepository } from "../../notifications/infrastructure/notification.infrastructure";
import { NotificationService } from "../../notifications/service/notification.service";
import type { EstadoOrdenCompra } from "../domain/purchase-order.domain";

const purchaseOrdersRoute = new Hono();
const repo = new KyselyPurchaseOrderRepository(db);
const service = new PurchaseOrderService(repo);
const notifRepo = new KyselyNotificationRepository(db);
const notifService = new NotificationService(notifRepo);

// GET /api/purchase-orders
purchaseOrdersRoute.get("/", async (c) => {
   try {
      const orders = await service.getAll();
      return c.json(orders);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al obtener órdenes" },
         500
      );
   }
});

// GET /api/purchase-orders/deleted
purchaseOrdersRoute.get("/deleted", async (c) => {
   try {
      const orders = await service.getAllDeleted();
      return c.json(orders);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al obtener órdenes eliminadas" },
         500
      );
   }
});

// POST /api/purchase-orders
purchaseOrdersRoute.post("/", async (c) => {
   try {
      const body = await c.req.json();
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
// GET /api/purchase-orders/approvers — list approvers (admin only)
purchaseOrdersRoute.get("/approvers", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ error: "No autenticado" }, 401);
   const role = (session.user as { role?: string }).role;
   if (role !== "administrador") return c.json({ error: "Acceso denegado" }, 403);

   const approvers = await service.listApprovers();
   return c.json(approvers);
});

// POST /api/purchase-orders/approvers — add approver (admin only)
purchaseOrdersRoute.post("/approvers", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ error: "No autenticado" }, 401);
   const role = (session.user as { role?: string }).role;
   if (role !== "administrador") return c.json({ error: "Acceso denegado" }, 403);

   const body = await c.req.json() as { user_id: string; user_name: string };
   if (!body.user_id || !body.user_name) {
      return c.json({ error: "user_id y user_name son requeridos" }, 400);
   }

   await service.addApprover(body.user_id, body.user_name, session.user.id);
   return c.json({ success: true }, 201);
});

// DELETE /api/purchase-orders/approvers/:userId — remove approver (admin only)
purchaseOrdersRoute.delete("/approvers/:userId", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ error: "No autenticado" }, 401);
   const role = (session.user as { role?: string }).role;
   if (role !== "administrador") return c.json({ error: "Acceso denegado" }, 403);

   await service.removeApprover(c.req.param("userId"));
   return c.json({ success: true });
});

// GET /api/purchase-orders/approvers/me — check if current user can approve
purchaseOrdersRoute.get("/approvers/me", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ isApprover: false });

   const isApprover = await service.isApprover(session.user.id);
   return c.json({ isApprover });
});

// GET /api/purchase-orders/:id
purchaseOrdersRoute.get("/:id", async (c) => {
   try {
      const order = await service.getById(c.req.param("id"));
      if (!order) return c.json({ error: "Orden no encontrada" }, 404);
      return c.json(order);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al obtener la orden" },
         500
      );
   }
});



// PATCH /api/purchase-orders/:id/status
purchaseOrdersRoute.patch("/:id/status", async (c) => {
   let body: { estado?: string };
   try {
      body = await c.req.json();
   } catch {
      return c.json({ error: "Cuerpo de solicitud inválido" }, 400);
   }
   const nuevoEstado = body.estado as EstadoOrdenCompra;

   try {
      // Approve requires the user to be in the approvers whitelist
      if (nuevoEstado === "APROBADA") {
         const session = await auth.api.getSession({ headers: c.req.raw.headers });
         if (!session?.user) return c.json({ error: "No autenticado" }, 401);

         const isApprover = await service.isApprover(session.user.id);
         if (!isApprover) {
            return c.json(
               { error: "No tienes permiso para aprobar órdenes de compra. Contacta a un administrador." },
               403
            );
         }

         const order = await service.changeStatus(
            c.req.param("id"),
            nuevoEstado,
            session.user.id,
            session.user.name ?? undefined
         );
         if (!order) return c.json({ error: "Orden no encontrada" }, 404);

         // Dismiss pending review notifications for all approvers since it's now approved
         try {
            await notifService.markReadByReference(order.id, "purchase_order");
         } catch {
            // Non-critical — don't block the response
         }

         return c.json(order);
      }

      const order = await service.changeStatus(c.req.param("id"), nuevoEstado);
      if (!order) return c.json({ error: "Orden no encontrada" }, 404);

      // Notify approvers when order is sent to review
      if (nuevoEstado === "PENDIENTE") {
         try {
            const approvers = await service.listApprovers();
            if (approvers.length > 0) {
               await notifService.notifyMany(
                  approvers.map((a) => ({
                     user_id: a.user_id,
                     title: "Orden de compra pendiente de aprobación",
                     message: `La orden #${order.id.slice(0, 8)} ha sido enviada a revisión y requiere tu aprobación.`,
                     type: "PURCHASE_ORDER_REVIEW",
                     reference_id: order.id,
                     reference_type: "purchase_order",
                  }))
               );
            }
         } catch {
            // Don't fail the status change if notifications fail
         }
      }

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
   try {
      const body = await c.req.json();
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
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);
      const deleted = await service.delete(session.user.id, c.req.param("id"));
      if (!deleted) return c.json({ error: "Orden no encontrada" }, 404);

      const order = await service.getById(c.req.param("id"));
      try {
         const approvers = await service.listApprovers();
         if (approvers.length > 0) {
            await notifService.notifyMany(
               approvers.map((a) => ({
                  user_id: a.user_id,
                  title: "Orden de compra Ha sido Eliminada",
                  message: `La orden #${order?.id.slice(0, 8)} ha sido eliminada.`,
                  type: "PURCHASE_ORDER_DELETED",
                  reference_id: order?.id,
                  reference_type: "purchase_order",
               }))
            );
         }
      } catch {
         // Don't fail the status change if notifications fail
      }
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al eliminar" },
         500
      );
   }
});

export default purchaseOrdersRoute;
