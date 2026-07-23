export const runtime = "nodejs";

import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { cors } from "hono/cors";
import clientsRoute from "@/backend/modules/clients/routes/clients";
import employeesRoute from "@/backend/modules/employees/routes/employees";
import suppliersRoute from "@/backend/modules/suppliers/routes/suppliers";
import purchaseOrdersRoute from "./modules/purchase-orders/routes/purchase-orders";
import appointmentsRoute from "./modules/appointments/routes/appointments.routes";
import servicesRoute from "@/backend/modules/services/routes/services";
import tareasRoute from "@/backend/modules/tareas/routes/tareas";
import equiposRoute from "./modules/equipos/routes/equipos";
import categoriaEquiposRoute from "./modules/categoria-equipos/routes/categoria-equipos";
import tipoItemsRoute from "./modules/tipo-items/routes/tipo-items";
import itemsRoute from "./modules/items/routes/items";
import notificationsRoute from "./modules/notifications/routes/notifications";
import unitsRoute from "./modules/units/routes/units.routes";
import userEmployeeLinksRoute from "./modules/user-employee-link/routes/user-employee-link.routes";
import rolesRoute from "./modules/roles/routes/roles.routes";
import { requireResourcePermission } from "./shared/require-permission";

const app = new Hono().basePath("/api");

app.use(
   "/*",
   cors({
      origin: ["http://localhost:3000", "https://example.org"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
   })
);

app.get("/hello", (c) => {
   return c.json({ message: "Hello from Hono!" });
});

app.all("/auth/*", (c) => auth.handler(c.req.raw));

// Server-side permission enforcement. Applied as path middleware rather than
// inside each module so a new route cannot ship unguarded by omission. The
// resource is the physical statement key from `src/lib/permission.ts`; the HTTP
// verb selects the action (GET -> read, POST -> create, ...).
app.use("/clients/*", requireResourcePermission("client"));
app.use("/employees/*", requireResourcePermission("employee"));
app.use("/suppliers/*", requireResourcePermission("supplier"));
app.use("/purchase-orders/*", requireResourcePermission("purchase_order"));
app.use("/appointments/*", requireResourcePermission("appointment"));
app.use("/services/*", requireResourcePermission("service"));
app.use("/tareas/*", requireResourcePermission("task"));
app.use("/equipos/*", requireResourcePermission("machinery"));
app.use("/categoria-equipos/*", requireResourcePermission("machinery"));
app.use("/tipo-items/*", requireResourcePermission("inventory"));
app.use("/items/*", requireResourcePermission("inventory"));
app.use("/units/*", requireResourcePermission("inventory"));
app.use("/roles/*", requireResourcePermission("user"));

app.route("/clients", clientsRoute);
app.route("/employees", employeesRoute);
app.route("/suppliers", suppliersRoute);
app.route("/purchase-orders", purchaseOrdersRoute);
app.route("/appointments", appointmentsRoute);
app.route("/services", servicesRoute);
app.route("/tareas", tareasRoute);
app.route("/equipos", equiposRoute);
app.route("/categoria-equipos", categoriaEquiposRoute);
app.route("/tipo-items", tipoItemsRoute);
app.route("/items", itemsRoute);
app.route("/notifications", notificationsRoute);
app.route("/units", unitsRoute);
app.route("/user-employee-links", userEmployeeLinksRoute);
app.route("/roles", rolesRoute);

export default app;