export const runtime = "nodejs";

import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { cors } from "hono/cors";
import clientsRoute from "@/backend/modules/clients/routes/clients";
import employeesRoute from "@/backend/modules/employees/routes/employees";
import suppliersRoute from "@/backend/modules/suppliers/routes/suppliers";
import purchaseOrdersRoute from "./modules/purchase-orders/routes/purchase-orders";
import proyectosRoute from "./modules/proyectos/routes/proyectos";

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

app.route("/clients", clientsRoute);
app.route("/employees", employeesRoute);
app.route("/suppliers", suppliersRoute);
app.route("/purchase-orders", purchaseOrdersRoute);
app.route("/proyectos", proyectosRoute);

export default app;