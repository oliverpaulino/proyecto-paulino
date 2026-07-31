import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyProyectoEmpleadoTarifaRepository } from "../infraestructure/proyecto-empleado-tarifa.infraestructure";
import { ProyectoEmpleadoTarifaService } from "../service/proyecto-empleado-tarifa.service";
import { UpsertProyectoEmpleadoTarifaDTOSchema } from "@/dtos/proyecto-empleado-tarifa.dto";

const proyectoTarifasEmpleadoRoute = new Hono();
const repo = new KyselyProyectoEmpleadoTarifaRepository(db);
const service = new ProyectoEmpleadoTarifaService(repo);

// GET /api/proyecto-empleado-tarifas?proyecto_id=xxx
proyectoTarifasEmpleadoRoute.get("/", async (c) => {
   try {
      const proyectoId = c.req.query("proyecto_id");
      if (!proyectoId) return c.json({ error: "proyecto_id es requerido" }, 400);

      const tarifas = await service.getByProyecto(proyectoId);
      return c.json(tarifas);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener tarifas" }, 500);
   }
});

// GET /api/proyecto-empleado-tarifas/operadores?proyecto_id=xxx&search=yyy&page=1&limit=20
proyectoTarifasEmpleadoRoute.get("/operadores", async (c) => {
   try {
      const proyectoId = c.req.query("proyecto_id");
      if (!proyectoId) return c.json({ error: "proyecto_id es requerido" }, 400);

      const search = c.req.query("search") || "";
      const page = parseInt(c.req.query("page") || "1", 10);
      const limit = parseInt(c.req.query("limit") || "20", 10);

      const result = await service.getOperadoresConTarifas(proyectoId, search, page, limit);
      return c.json(result);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener operadores" }, 500);
   }
});

// POST /api/proyecto-empleado-tarifas (upsert single)
proyectoTarifasEmpleadoRoute.post("/", async (c) => {
   try {
      const rawBody = await c.req.json();
      const validation = UpsertProyectoEmpleadoTarifaDTOSchema.safeParse(rawBody);
      if (!validation.success) {
         return c.json({ error: "Datos incompletos o incorrectos", detalles: validation.error.format() }, 400);
      }

      const tarifa = await service.upsert(validation.data);
      return c.json(tarifa, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al guardar la tarifa" }, 400);
   }
});

// POST /api/proyecto-empleado-tarifas/bulk
proyectoTarifasEmpleadoRoute.post("/bulk", async (c) => {
   try {
      const rawBody = await c.req.json();
      const { proyecto_id, tarifas } = rawBody as { proyecto_id: string; tarifas: Array<{ empleado_id: string; categoria_equipo_tarifa_id: string; monto_pago: number }> };

      if (!proyecto_id) return c.json({ error: "proyecto_id es requerido" }, 400);
      if (!Array.isArray(tarifas)) return c.json({ error: "tarifas debe ser un array" }, 400);

      await service.bulkUpsert(proyecto_id, tarifas);
      return c.json({ success: true }, 200);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al guardar tarifas" }, 400);
   }
});

// DELETE /api/proyecto-empleado-tarifas/:id
proyectoTarifasEmpleadoRoute.delete("/:id", async (c) => {
   try {
      await service.remove(c.req.param("id"));
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al eliminar la tarifa" }, 400);
   }
});

export default proyectoTarifasEmpleadoRoute;
