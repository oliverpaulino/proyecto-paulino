import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyTipoItemRepository } from "../infraestructure/tipo-item.infraestructure";
import { TipoItemService } from "../service/tipo-item.service";

const tipoItemsRoute = new Hono();
const repo = new KyselyTipoItemRepository(db);
const service = new TipoItemService(repo);

// GET /api/tipo-items
tipoItemsRoute.get("/", async (c) => {
   const tipos = await service.getAll();
   return c.json(tipos);
});

// GET /api/tipo-items/:id
tipoItemsRoute.get("/:id", async (c) => {
   const tipo = await service.getById(c.req.param("id"));
   if (!tipo) return c.json({ error: "Categoría no encontrada" }, 404);
   return c.json(tipo);
});

// POST /api/tipo-items
tipoItemsRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const tipo = await service.create(body);
      return c.json(tipo, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/tipo-items/:id
tipoItemsRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const tipo = await service.update(c.req.param("id"), body);
      if (!tipo) return c.json({ error: "Categoría no encontrada" }, 404);
      return c.json(tipo);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/tipo-items/:id  (cascades to items via FK ON DELETE CASCADE)
tipoItemsRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Categoría no encontrada" }, 404);
   return c.json({ success: true });
});

export default tipoItemsRoute;
