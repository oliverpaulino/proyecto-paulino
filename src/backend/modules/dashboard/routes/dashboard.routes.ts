import { Hono, type MiddlewareHandler } from "hono";
import db from "@/backend/database";
import { KyselyDashboardRepository } from "../infraestructure/dashboard.infraestructure";
import { DashboardService } from "../service/dashboard.service";
import { requirePermission } from "@/backend/shared/require-permission";
import { roleCan } from "@/lib/permissions/resolve";
import { auth } from "@/lib/auth";

/**
 * Panel principal.
 *
 * A diferencia de los demás módulos, este NO se puede proteger con un
 * `app.use("/dashboard/*", requireResourcePermission(...))`: cada widget lee un
 * recurso distinto (nómina, equipos, finanzas…) y un guard único por path
 * tendría que ser el permiso más permisivo de todos, que es justo lo que no se
 * quiere. Por eso cada ruta declara el suyo.
 *
 * `PermissionGuard` en el cliente solo esconde tarjetas; esto es lo que de
 * verdad niega el dato.
 */
const dashboardRoute = new Hono();
const repo = new KyselyDashboardRepository(db);
const service = new DashboardService(repo);

const leerFinanzas: MiddlewareHandler = requirePermission(
   "account_receivable", "read", "list", "manage",
);
const leerGastos: MiddlewareHandler = requirePermission(
   "expense", "read", "register", "manage",
);
const leerNomina: MiddlewareHandler = requirePermission("payroll", "read", "list", "consult");
const leerProyectos: MiddlewareHandler = requirePermission("project", "read", "list");
const leerEquipos: MiddlewareHandler = requirePermission("machinery", "read", "consult");
const leerEmpleados: MiddlewareHandler = requirePermission("employee", "read", "list", "search");
const leerCompras: MiddlewareHandler = requirePermission("purchase_order", "read", "list");
const leerCitas: MiddlewareHandler = requirePermission(
   "appointment", "read", "consult", "schedule", "plan",
);

const numero = (v: string | undefined): number | undefined =>
   v === undefined ? undefined : Number(v);

// ── Finanzas ──────────────────────────────────────────────────────────────
dashboardRoute.get("/facturacion-semanal", leerFinanzas, async (c) => {
   try {
      return c.json(await service.facturacionSemanal());
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener la facturación semanal") }, 400);
   }
});

dashboardRoute.get("/flujo-mensual", leerGastos, async (c) => {
   try {
      return c.json(await service.flujoMensual(numero(c.req.query("meses"))));
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener el flujo mensual") }, 400);
   }
});

// ── Nómina ────────────────────────────────────────────────────────────────
dashboardRoute.get("/nomina/ciclos-abiertos", leerNomina, async (c) => {
   try {
      return c.json(await service.ciclosNominaAbiertos());
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener los ciclos de nómina") }, 400);
   }
});

dashboardRoute.get("/nomina/deducciones-pendientes", leerNomina, async (c) => {
   try {
      return c.json(await service.deduccionesPendientes(numero(c.req.query("limite"))));
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener las deducciones") }, 400);
   }
});

// ── Proyectos ─────────────────────────────────────────────────────────────
/**
 * Una sola ruta sirve a los DOS widgets de proyectos. Los montos se incluyen
 * solo si el rol además puede leer finanzas: un `coordinador` tiene `project`
 * completo pero ningún recurso financiero, y ver la rentabilidad sería una
 * fuga de margen. Se decide acá, no en el cliente.
 */
dashboardRoute.get("/proyectos-activos", leerProyectos, async (c) => {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      const rol = (session?.user as { role?: string | null } | undefined)?.role ?? null;

      const incluirMontos = rol
         ? (
            await Promise.all([
               roleCan(rol, "account_receivable", "read"),
               roleCan(rol, "expense", "read"),
               roleCan(rol, "invoice", "read"),
            ])
         ).some(Boolean)
         : false;

      return c.json(
         await service.proyectosActivos({
            limite: numero(c.req.query("limite")),
            incluirMontos,
         }),
      );
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener los proyectos activos") }, 400);
   }
});

dashboardRoute.get("/conduces-sin-firmar", leerProyectos, async (c) => {
   try {
      return c.json(await service.conducesSinFirmar(numero(c.req.query("limite"))));
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener los conduces sin firmar") }, 400);
   }
});

// ── Equipos ───────────────────────────────────────────────────────────────
dashboardRoute.get("/flota", leerEquipos, async (c) => {
   try {
      return c.json(await service.flotaResumen());
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener el estado de la flota") }, 400);
   }
});

dashboardRoute.get("/alertas-equipos", leerEquipos, async (c) => {
   try {
      const q = c.req.query.bind(c.req);
      // Umbrales sobreescribibles: son política de taller y cambian por flota.
      // Lo que no se manda cae al default del dominio.
      const umbrales = limpiar({
         preventivo_ambar_dias: numero(q("preventivo_ambar_dias")),
         preventivo_rojo_dias: numero(q("preventivo_rojo_dias")),
         mantenimiento_abierto_ambar_dias: numero(q("mantenimiento_abierto_ambar_dias")),
         mantenimiento_abierto_rojo_dias: numero(q("mantenimiento_abierto_rojo_dias")),
         correctivos_ventana_dias: numero(q("correctivos_ventana_dias")),
         correctivos_umbral: numero(q("correctivos_umbral")),
      });

      return c.json(
         await service.alertasEquipos({ limite: numero(q("limite")), umbrales }),
      );
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener las alertas de equipos") }, 400);
   }
});

// ── Otros ─────────────────────────────────────────────────────────────────
dashboardRoute.get("/licencias-por-vencer", leerEmpleados, async (c) => {
   try {
      return c.json(
         await service.licenciasPorVencer(
            numero(c.req.query("dias")),
            numero(c.req.query("limite")),
         ),
      );
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener las licencias") }, 400);
   }
});

dashboardRoute.get("/ordenes-pendientes", leerCompras, async (c) => {
   try {
      return c.json(await service.ordenesCompraPendientes(numero(c.req.query("limite"))));
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener las órdenes pendientes") }, 400);
   }
});

dashboardRoute.get("/citas-proximas", leerCitas, async (c) => {
   try {
      return c.json(
         await service.citasProximas(numero(c.req.query("dias")), numero(c.req.query("limite"))),
      );
   } catch (err: unknown) {
      return c.json({ error: msg(err, "Error al obtener las citas") }, 400);
   }
});

function msg(err: unknown, porDefecto: string): string {
   return err instanceof Error ? err.message : porDefecto;
}

/** Quita las claves sin valor para que no pisen los defaults con `undefined`. */
function limpiar<T extends object>(obj: T): Partial<T> {
   return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined && Number.isFinite(v)),
   ) as Partial<T>;
}

export default dashboardRoute;
