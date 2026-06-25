import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import db from "@/backend/database";
import { auth } from "@/lib/auth";
import { notificationEmitter } from "@/backend/shared/notification-emitter";
import { KyselyNotificationRepository } from "../infrastructure/notification.infrastructure";
import { NotificationService } from "../service/notification.service";

const notificationsRoute = new Hono();
const repo = new KyselyNotificationRepository(db);
export const notificationService = new NotificationService(repo);

// GET /api/notifications - all for current user
notificationsRoute.get("/", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ error: "No autenticado" }, 401);

   const notifications = await notificationService.getForUser(session.user.id);
   return c.json(notifications);
});

// GET /api/notifications/unread-count
notificationsRoute.get("/unread-count", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ count: 0 });

   const count = await notificationService.getUnreadCount(session.user.id);
   return c.json({ count });
});

// PATCH /api/notifications/read-all - mark all as read (must be before /:id/read)
notificationsRoute.patch("/read-all", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ error: "No autenticado" }, 401);

   await notificationService.markAllAsRead(session.user.id);
   return c.json({ success: true });
});

// GET /api/notifications/stream - SSE for real-time unread count updates
notificationsRoute.get("/stream", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ error: "No autenticado" }, 401);

   const userId = session.user.id;

   return streamSSE(c, async (stream) => {
      // Send current count immediately on connect
      const count = await notificationService.getUnreadCount(userId);
      await stream.writeSSE({ data: JSON.stringify({ count }) });

      let closed = false;

      const onNotif = async ({ userId: uid }: { userId: string }) => {
         if (uid !== userId || closed) return;
         try {
            const newCount = await notificationService.getUnreadCount(uid);
            await stream.writeSSE({ data: JSON.stringify({ count: newCount }) });
         } catch {
            closed = true;
         }
      };

      notificationEmitter.on("new_notification", onNotif);
      stream.onAbort(() => {
         closed = true;
         notificationEmitter.off("new_notification", onNotif);
      });

      // Keep-alive every 25s to prevent proxy timeouts
      while (!closed) {
         await stream.sleep(25_000);
         if (closed) break;
         try {
            await stream.writeSSE({ data: "" });
         } catch {
            closed = true;
         }
      }

      notificationEmitter.off("new_notification", onNotif);
   });
});

// PATCH /api/notifications/:id/read - mark one as read
notificationsRoute.patch("/:id/read", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ error: "No autenticado" }, 401);

   await notificationService.markAsRead(c.req.param("id"), session.user.id);
   return c.json({ success: true });
});

export default notificationsRoute;
