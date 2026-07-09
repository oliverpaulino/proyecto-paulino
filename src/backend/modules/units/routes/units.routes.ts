import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyUnitRepository } from "../infraestructure/units.infraestructure";
import { UnitService } from "../service/units.service";
import { TipoUnidad } from "../domain/units.domain";

const unitsRoute = new Hono();
const repo = new KyselyUnitRepository(db);
const service = new UnitService(repo);

// GET /api/units
unitsRoute.get("/", async (c) => {
   const units = await service.getAll();
   return c.json(units);
});

// GET /api/units/convertir/:origenId/:destinoId?valor=10
unitsRoute.get("/convertir/:origenId/:destinoId", async (c) => {
   const origenId = c.req.param("origenId");
   const destinoId = c.req.param("destinoId");
   const valorStr = c.req.query("valor");

   // Validamos que el valor exista y sea un número válido
   if (!valorStr || isNaN(Number(valorStr))) {
      return c.json({ error: "El parámetro 'valor' es requerido en la query y debe ser numérico" }, 400);
   }

   const valor = Number(valorStr);

   try {
      const result = await service.convertir(valor, origenId, destinoId);
      return c.json(result);
   } catch (err: unknown) {
      // Manejamos los errores de regla de negocio que lanzaste en tu servicio
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido al convertir" }, 400);
   }
});

// GET /api/units/:id
unitsRoute.get("/:id", async (c) => {
   const unit = await service.getById(c.req.param("id"));
   if (!unit) return c.json({ error: "Unidad no encontrada" }, 404);
   return c.json(unit);
});

// GET /api/units/tipo/:tipoUnidad
unitsRoute.get("/tipo/:tipoUnidad", async (c) => {
   const tipo = c.req.param("tipoUnidad") as TipoUnidad;
   const units = await service.getByTipoUnidad(tipo);
   return c.json(units);
});

// POST /api/units
unitsRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const unit = await service.create(body);
      return c.json(unit, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/units/:id
unitsRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   const id = c.req.param("id");
   
   try {
      const unit = await service.update(id, body);
      if (!unit) return c.json({ error: "Unidad no encontrada" }, 404);
      return c.json(unit);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/units/:id
unitsRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Unidad no encontrada" }, 404);
   return c.json({ success: true });
});

export default unitsRoute;