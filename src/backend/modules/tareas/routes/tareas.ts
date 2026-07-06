import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyTareaRepository } from "../infraestructure/tareas.infraestructure";
import { TareaService } from "../service/tareas.service";

const tareasRoute = new Hono();
const repo = new KyselyTareaRepository(db);
const service = new TareaService(repo);

// GET /api/tareas/proyectos  → minimal list of proyectos for the filter / form
tareasRoute.get("/proyectos", async (c) => {
   try {
      const proyectos = await service.getProyectos();
      return c.json(proyectos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 500);
   }
});

// GET /api/tareas?proyecto_id=...  (proyecto_id optional → all tareas)
tareasRoute.get("/", async (c) => {
   const proyectoId = c.req.query("proyecto_id") || undefined;
   const tareas = await service.getAll(proyectoId);
   return c.json(tareas);
});

// GET /api/tareas/:id
tareasRoute.get("/:id", async (c) => {
   const tarea = await service.getById(c.req.param("id"));
   if (!tarea) return c.json({ error: "Tarea no encontrada" }, 404);
   return c.json(tarea);
});

// POST /api/tareas
tareasRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const tarea = await service.create(body);
      return c.json(tarea, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/tareas/:id
tareasRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const tarea = await service.update(c.req.param("id"), body);
      if (!tarea) return c.json({ error: "Tarea no encontrada" }, 404);
      return c.json(tarea);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/tareas/:id
tareasRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Tarea no encontrada" }, 404);
   return c.json({ success: true });
});

export default tareasRoute;
