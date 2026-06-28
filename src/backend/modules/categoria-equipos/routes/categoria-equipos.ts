import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyCategoriaEquipoRepository } from "../infraestructure/categoria-equipo.infraestructure";
import { CategoriaEquipoService } from "../service/categoria-equipo.service";

const categoriaEquiposRoute = new Hono();
const repo = new KyselyCategoriaEquipoRepository(db);
const service = new CategoriaEquipoService(repo);

// GET /api/categoria-equipos
categoriaEquiposRoute.get("/", async (c) => {
   const categorias = await service.getAll();
   return c.json(categorias);
});

// GET /api/categoria-equipos/:id
categoriaEquiposRoute.get("/:id", async (c) => {
   const categoria = await service.getById(c.req.param("id"));
   if (!categoria) return c.json({ error: "Categoría no encontrada" }, 404);
   return c.json(categoria);
});

// POST /api/categoria-equipos
categoriaEquiposRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const categoria = await service.create(body);
      return c.json(categoria, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/categoria-equipos/:id
categoriaEquiposRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const categoria = await service.update(c.req.param("id"), body);
      if (!categoria) return c.json({ error: "Categoría no encontrada" }, 404);
      return c.json(categoria);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/categoria-equipos/:id
categoriaEquiposRoute.delete("/:id", async (c) => {
   try {
      const deleted = await service.delete(c.req.param("id"));
      if (!deleted) return c.json({ error: "Categoría no encontrada" }, 404);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default categoriaEquiposRoute;
