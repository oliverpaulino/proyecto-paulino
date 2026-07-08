import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyMedidaCobroRepository } from "../infraestructure/medida-cobro.infraestructure";
import { MedidaCobroService } from "../service/medida-cobro.service";

const medidaCobroRoute = new Hono();
const repo = new KyselyMedidaCobroRepository(db);
const service = new MedidaCobroService(repo);

// GET /api/medida-cobro
medidaCobroRoute.get("/", async (c) => {
   const categorias = await service.getAll();
   return c.json(categorias);
});

// GET /api/medida-cobro/:id
medidaCobroRoute.get("/:id", async (c) => {
   const categoria = await service.getById(c.req.param("id"));
   if (!categoria) return c.json({ error: "Categoría no encontrada" }, 404);
   return c.json(categoria);
});

// POST /api/medida-cobro
medidaCobroRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const categoria = await service.create(body);
      return c.json(categoria, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/medida-cobro/:id
medidaCobroRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const categoria = await service.update(c.req.param("id"), body);
      if (!categoria) return c.json({ error: "Categoría no encontrada" }, 404);
      return c.json(categoria);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/medida-cobro/:id
medidaCobroRoute.delete("/:id", async (c) => {
   try {
      const deleted = await service.delete(c.req.param("id"));
      if (!deleted) return c.json({ error: "Categoría no encontrada" }, 404);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default medidaCobroRoute;
