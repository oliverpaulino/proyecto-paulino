import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyEquipoRepository } from "../infraestructure/equipo.infraestructure";
import { EquipoService } from "../service/equipo.service";

const equiposRoute = new Hono();
const repo = new KyselyEquipoRepository(db);
const service = new EquipoService(repo);

// GET /api/equipos
equiposRoute.get("/", async (c) => {
   const equipos = await service.getAll();
   return c.json(equipos);
});

// GET /api/equipos/:id
equiposRoute.get("/:id", async (c) => {
   const equipo = await service.getById(c.req.param("id"));
   if (!equipo) return c.json({ error: "Equipo no encontrado" }, 404);
   return c.json(equipo);
});

// POST /api/equipos
equiposRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const equipo = await service.create(body);
      return c.json(equipo, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/equipos/:id
equiposRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const equipo = await service.update(c.req.param("id"), body);
      if (!equipo) return c.json({ error: "Equipo no encontrado" }, 404);
      return c.json(equipo);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/equipos/:id
equiposRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Equipo no encontrado" }, 404);
   return c.json({ success: true });
});

export default equiposRoute;
