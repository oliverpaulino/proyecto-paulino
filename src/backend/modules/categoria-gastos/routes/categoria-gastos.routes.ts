import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyCategoriaGastoRepository } from "../infraestructure/categoria-gastos.infraestructure";
import { CategoriaGastoService } from "../service/categoria-gastos.service";
import { CreateCategoriaGastoSchema, UpdateCategoriaGastoSchema } from "@/dtos/categoria-gasto.dto";
import { GrupoGasto } from "../domain/categoria-gastos.domain";

const categoriaGastosRoute = new Hono();
const repo = new KyselyCategoriaGastoRepository(db);
const service = new CategoriaGastoService(repo);

// GET /api/categoria-gastos
categoriaGastosRoute.get("/", async (c) => {
   const page = Number(c.req.query("page")) || 1;
   const limit = Number(c.req.query("limit")) || 20;
   const search = c.req.query("search");
   const grupo = c.req.query("grupo") as GrupoGasto | undefined;

   try {
      const categorias = await service.getAll({ page, limit, search, grupo });
      return c.json(categorias);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener categorías" }, 400);
   }
});

// GET /api/categoria-gastos/:id
categoriaGastosRoute.get("/:id", async (c) => {
   const categoria = await service.getById(c.req.param("id"));
   if (!categoria) return c.json({ error: "Categoría no encontrada" }, 404);
   return c.json(categoria);
});

// POST /api/categoria-gastos
categoriaGastosRoute.post("/", async (c) => {
   const body = await c.req.json();
   const parseResult = CreateCategoriaGastoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const categoria = await service.create(parseResult.data);
      return c.json(categoria, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/categoria-gastos/:id
categoriaGastosRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = UpdateCategoriaGastoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const categoria = await service.update(c.req.param("id"), parseResult.data);
      if (!categoria) return c.json({ error: "Categoría no encontrada" }, 404);
      return c.json(categoria);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/categoria-gastos/:id
categoriaGastosRoute.delete("/:id", async (c) => {
   try {
      const deleted = await service.delete(c.req.param("id"));
      if (!deleted) return c.json({ error: "Categoría no encontrada" }, 404);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default categoriaGastosRoute;