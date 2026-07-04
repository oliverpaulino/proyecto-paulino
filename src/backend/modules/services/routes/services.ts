import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyServicioRepository } from "../infraestructure/service.infraestructure";
import { ServicioService } from "../service/service.service";

const servicesRoute = new Hono();
const repo = new KyselyServicioRepository(db);
const service = new ServicioService(repo);

// GET /api/services
servicesRoute.get("/", async (c) => {
   try {
      const servicios = await service.getAll();
      return c.json(servicios);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 500);
   }
});

// GET /api/services/:id
servicesRoute.get("/:id", async (c) => {
   try {
      const servicio = await service.getById(c.req.param("id"));
      if (!servicio) return c.json({ error: "Servicio no encontrado" }, 404);
      return c.json(servicio);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 500);
   }
});

// POST /api/services
servicesRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const servicio = await service.create(body);
      return c.json(servicio, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/services/:id
servicesRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const servicio = await service.update(c.req.param("id"), body);
      if (!servicio) return c.json({ error: "Servicio no encontrado" }, 404);
      return c.json(servicio);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/services/:id
servicesRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Servicio no encontrado" }, 404);
   return c.json({ success: true });
});

export default servicesRoute;
