export const runtime = "nodejs";

import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { cors } from "hono/cors";
import clientsRoute from "@/backend/modules/clients/routes/clients";
import employeesRoute from "@/backend/modules/employees/routes/employees";
import suppliersRoute from "@/backend/modules/suppliers/routes/suppliers";
import purchaseOrdersRoute from "./modules/purchase-orders/routes/purchase-orders";
import proyectosRoute from "./modules/proyectos/routes/proyectos";
import proyectoArchivosRoute from "./modules/proyecto-archivos/routes/proyecto-archivos";
import proyectoTarifasRoute from "./modules/proyectos/routes/proyecto-tarifa";
import proyectoTarifasEmpleadoRoute from "./modules/proyectos/routes/proyecto-empleado-tarifa";
import appointmentsRoute from "./modules/appointments/routes/appointments.routes";
import equiposRoute from "./modules/equipos/routes/equipos";
import categoriaEquiposRoute from "./modules/categoria-equipos/routes/categoria-equipos";
import notificationsRoute from "./modules/notifications/routes/notifications";
import { dgiiProvider } from "./providers/dgii.provider";
import medidaCobroRoute from "./modules/categoria-equipos/routes/medida-cobro";
import unitsRoute from "./modules/units/routes/units.routes";
import userEmployeeLinksRoute from "./modules/user-employee-link/routes/user-employee-link.routes";
import rolesRoute from "./modules/roles/routes/roles.routes";
import { requireResourcePermission } from "./shared/require-permission";
import conducesRoute from "./modules/conduce/routes/conduce";
import categoriaGastosRoute from "./modules/categoria-gastos/routes/categoria-gastos.routes";
import gastosRoute from "./modules/gastos/routes/gastos.routes";
import mantenimientosRoute from "./modules/mantenimientos/routes/mantenimientos.routes";
import deduccionesRoute from "./modules/deducciones/routes/deducciones.routes";
import pagosRoute from "./modules/pagos/routes/pagos.routes";
import nominaRoute from "./modules/nomina/routes/nomina.routes";
import cuentasPorPagarRoute from "./modules/cuentas-por-pagar/routes/cuentas-por-pagar.routes";
import cuentasPorCobrarRoute from "./modules/cuentas-por-cobrar/routes/cuentas-por-cobrar.routes";
import subcontratacionesRoute from "./modules/subcontrataciones/routes/subcontrataciones";
import dashboardRoute from "./modules/dashboard/routes/dashboard.routes";
import rolEmpleadoRoute from "./modules/rol-empleado/routes/rol-empleado.routes";

const app = new Hono().basePath("/api");

app.use(
   "/*",
   cors({
      origin: (origin) => {
         if (!origin) return "http://localhost:3000";

         const allowed = [
            process.env.NEXT_PUBLIC_APP_URL,
            process.env.BETTER_AUTH_URL,
            "http://localhost:3000"
         ].filter(Boolean) as string[];

         // Permite el origen si está en tus variables o es un subdominio de Vercel
         if (allowed.includes(origin) || origin.endsWith(".vercel.app")) {
            return origin;
         }
         return "http://localhost:3000"; // Fallback
      },
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
app.use("/subcontrataciones/*", requireResourcePermission("supplier"));
app.use("/purchase-orders/*", requireResourcePermission("purchase_order"));
app.use("/appointments/*", requireResourcePermission("appointment"));
app.use("/tareas/*", requireResourcePermission("task"));
app.use("/equipos/*", requireResourcePermission("machinery"));
app.use("/categoria-equipos/*", requireResourcePermission("machinery"));
app.use("/mantenimientos/*", requireResourcePermission("machinery"));
app.use("/tipo-items/*", requireResourcePermission("inventory"));
app.use("/items/*", requireResourcePermission("inventory"));
app.use("/units/*", requireResourcePermission("inventory"));
app.use("/roles/*", requireResourcePermission("user"));
app.use("/roles-empleado/*", requireResourcePermission("employee"));
app.use("/cuentas-por-cobrar/*", requireResourcePermission("account_receivable"));
app.use("/proyecto-tarifas/*", requireResourcePermission("project"));
app.use("/proyecto-empleado-tarifas/*", requireResourcePermission("project"));
// Los archivos de proyecto se sirven desde disco: nunca sin permiso ni sin
// sesión. Las rutas además validan la sesión a mano (ver módulo).
app.use("/proyectos/*/archivos", requireResourcePermission("project"));
app.use("/proyectos/*/archivos/*", requireResourcePermission("project"));
// GET /api/proyectos/archivos/:id/descargar — signed URLs de 60s.
app.use("/proyectos/archivos/*", requireResourcePermission("project"));

app.route("/clients", clientsRoute);
app.route("/employees", employeesRoute);
app.route("/suppliers", suppliersRoute);
app.route("/purchase-orders", purchaseOrdersRoute);
app.route("/proyectos", proyectoArchivosRoute);
app.route("/proyectos", proyectosRoute);
app.route("/proyecto-tarifas", proyectoTarifasRoute);
app.route("/proyecto-empleado-tarifas", proyectoTarifasEmpleadoRoute);
app.route("/appointments", appointmentsRoute);
app.route("/medida-cobros", medidaCobroRoute);
app.route("/equipos", equiposRoute);
app.route("/categoria-equipos", categoriaEquiposRoute);
app.route("/gastos", gastosRoute);
app.route("/mantenimientos", mantenimientosRoute);
app.route("/pagos", pagosRoute);
app.route("/deducciones", deduccionesRoute);
app.route("/categoria-gastos", categoriaGastosRoute);
app.route("/notifications", notificationsRoute);
app.route("/units", unitsRoute);
app.route("/user-employee-links", userEmployeeLinksRoute);
app.route("/roles", rolesRoute);
app.route("/roles-empleado", rolEmpleadoRoute);

app.route("/conduces", conducesRoute);
app.route("/nomina", nominaRoute);
app.route("/cuentas-por-pagar", cuentasPorPagarRoute);
app.route("/cuentas-por-cobrar", cuentasPorCobrarRoute);
app.route("/subcontrataciones", subcontratacionesRoute);
// El panel principal NO lleva guard por path: cada ruta declara su permiso,
// porque los widgets leen recursos distintos (ver dashboard.routes.ts).
app.route("/dashboard", dashboardRoute);

app.get("/dgii/:rnc", async (c) => {
   const rnc = c.req.param("rnc");

   try {
      const { data, status } = await dgiiProvider.consultarRNC(rnc);

      return c.json(data, status as any);
   } catch (error) {
      return c.json(
         {
            error: true,
            mensaje: "Error interno al consultar la información en la DGII."
         }, 500
      );
   }
});

export default app;