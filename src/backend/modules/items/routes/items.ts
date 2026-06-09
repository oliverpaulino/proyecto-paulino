import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyItemRepository } from "../infraestructure/item.infraestructure";
import { ItemService } from "../service/item.service";

const itemsRoute = new Hono();
const repo = new KyselyItemRepository(db);
const service = new ItemService(repo);

// GET /api/items
itemsRoute.get("/", async (c) => {
   const items = await service.getAll();
   return c.json(items);
});

// GET /api/items/:id
itemsRoute.get("/:id", async (c) => {
   const item = await service.getById(c.req.param("id"));
   if (!item) return c.json({ error: "Item no encontrado" }, 404);
   return c.json(item);
});

// POST /api/items
itemsRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const item = await service.create(body);
      return c.json(item, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/items/:id
itemsRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const item = await service.update(c.req.param("id"), body);
      if (!item) return c.json({ error: "Item no encontrado" }, 404);
      return c.json(item);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/items/:id
itemsRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Item no encontrado" }, 404);
   return c.json({ success: true });
});

export default itemsRoute;
