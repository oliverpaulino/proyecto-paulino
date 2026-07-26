import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyNominaRepository } from "../infraestructure/nomina.infraestructure";
import { NominaService } from "../service/nomina.service";

const nominaRoute = new Hono();
const repo = new KyselyNominaRepository(db);
const service = new NominaService(repo);

const fail = (c: any, err: unknown, fallback: string, status = 400) =>
   c.json({ error: err instanceof Error ? err.message : fallback }, status);

// ── Ciclos ──────────────────────────────────────────────────────────────────

nominaRoute.get("/cycles", async (c) => {
   try {
      return c.json(await service.listCycles());
   } catch (err) {
      return fail(c, err, "Error al obtener los ciclos de nómina");
   }
});

nominaRoute.post("/cycles", async (c) => {
   try {
      const body = await c.req.json();
      return c.json(await service.createCycle(body), 201);
   } catch (err) {
      return fail(c, err, "Error al crear el ciclo");
   }
});

nominaRoute.get("/cycles/:id", async (c) => {
   try {
      const ciclo = await service.getCycle(c.req.param("id"));
      if (!ciclo) return c.json({ error: "Ciclo no encontrado" }, 404);
      return c.json(ciclo);
   } catch (err) {
      return fail(c, err, "Error al obtener el ciclo");
   }
});

nominaRoute.patch("/cycles/:id", async (c) => {
   try {
      const body = await c.req.json();
      const ciclo = await service.updateCycle(c.req.param("id"), body);
      if (!ciclo) return c.json({ error: "Ciclo no encontrado" }, 404);
      return c.json(ciclo);
   } catch (err) {
      return fail(c, err, "Error al actualizar el ciclo");
   }
});

nominaRoute.delete("/cycles/:id", async (c) => {
   try {
      const ok = await service.deleteCycle(c.req.param("id"));
      if (!ok) return c.json({ error: "Ciclo no encontrado" }, 404);
      return c.json({ success: true });
   } catch (err) {
      return fail(c, err, "Error al eliminar el ciclo");
   }
});

// ── Cálculo y cierre ────────────────────────────────────────────────────────

/** Recalcula todo el ciclo. Idempotente; respeta el `seguro` ya editado. */
nominaRoute.post("/cycles/:id/calcular", async (c) => {
   try {
      return c.json(await service.calcularCiclo(c.req.param("id")));
   } catch (err) {
      return fail(c, err, "Error al calcular la nómina");
   }
});

nominaRoute.post("/cycles/:id/cerrar", async (c) => {
   try {
      const ciclo = await service.cerrarCiclo(c.req.param("id"));
      if (!ciclo) return c.json({ error: "Ciclo no encontrado" }, 404);
      return c.json(ciclo);
   } catch (err) {
      return fail(c, err, "Error al cerrar el ciclo");
   }
});

// ── Detalle por empleado ────────────────────────────────────────────────────

nominaRoute.get("/cycles/:id/empleados", async (c) => {
   try {
      return c.json(await service.listCycleEmployees(c.req.param("id")));
   } catch (err) {
      return fail(c, err, "Error al obtener la nómina del ciclo");
   }
});

/** El seguro es un campo libre que se edita a mano; recalcula el neto. */
nominaRoute.patch("/cycle-employees/:id/seguro", async (c) => {
   try {
      const { seguro } = await c.req.json();
      const row = await service.updateSeguro(c.req.param("id"), Number(seguro));
      if (!row) return c.json({ error: "Registro no encontrado" }, 404);
      return c.json(row);
   } catch (err) {
      return fail(c, err, "Error al actualizar el seguro");
   }
});

export default nominaRoute;
