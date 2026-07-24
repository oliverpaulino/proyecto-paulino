import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyProyectoTarifaRepository } from "../infraestructure/proyecto-tarifa.infraestructure";
import { ProyectoTarifaService } from "../service/proyecto-tarifa.service";
import { UpsertProyectoTarifaDTOSchema } from "@/dtos/proyecto-tarifa.dto";

const proyectoTarifasRoute = new Hono();
const repo = new KyselyProyectoTarifaRepository(db);
const service = new ProyectoTarifaService(repo);

// GET /api/proyecto-tarifas?proyecto_id=xxx
proyectoTarifasRoute.get("/", async (c) => {
   try {
      const proyectoId = c.req.query("proyecto_id");
      if (!proyectoId) return c.json({ error: "proyecto_id es requerido" }, 400);

      const tarifas = await service.getByProyecto(proyectoId);
      return c.json(tarifas);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener tarifas" }, 500);
   }
});

// POST /api/proyecto-tarifas  (upsert: por proyecto+categoría o proyecto+tipo_carga)
proyectoTarifasRoute.post("/", async (c) => {
   try {
      const rawBody = await c.req.json();
      const validation = UpsertProyectoTarifaDTOSchema.safeParse(rawBody);
      if (!validation.success) {
         return c.json({ error: "Datos incompletos o incorrectos", detalles: validation.error.format() }, 400);
      }

      const tarifa = await service.upsert(validation.data);
      return c.json(tarifa, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al guardar la tarifa" }, 400);
   }
});

// DELETE /api/proyecto-tarifas/:id
proyectoTarifasRoute.delete("/:id", async (c) => {
   try {
      await service.remove(c.req.param("id"));
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al eliminar la tarifa" }, 400);
   }
});

export default proyectoTarifasRoute;