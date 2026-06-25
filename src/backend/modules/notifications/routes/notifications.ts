import { Hono } from "hono";
import db from "@/backend/database";
import { auth } from "@/lib/auth";
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

// PATCH /api/notifications/:id/read - mark one as read
notificationsRoute.patch("/:id/read", async (c) => {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return c.json({ error: "No autenticado" }, 401);

   await notificationService.markAsRead(c.req.param("id"), session.user.id);
   return c.json({ success: true });
});

export default notificationsRoute;
