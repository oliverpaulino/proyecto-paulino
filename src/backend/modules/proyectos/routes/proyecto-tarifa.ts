import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyProyectoTarifaRepository } from "../infraestructure/proyecto-tarifa.infraestructure";
import { ProyectoTarifaService } from "../service/proyecto-tarifa.service";
import { UpsertProyectoTarifaDTOSchema } from "@/dtos/proyecto-tarifa.dto";
import { auth } from "@/lib/auth";
import { assertProyectoEditable } from "../guards/proyecto-editable.guard";

const proyectoTarifasRoute = new Hono();
const repo = new KyselyProyectoTarifaRepository(db);
const service = new ProyectoTarifaService(repo);

// Los writes (upsert/bulk/delete) quedan bloqueados si el proyecto está
// COMPLETADO. El GET no — solo se está leyendo.
async function sessionOK(c: { req: { raw: Request } }): Promise<boolean> {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   if (!session?.user) return false;
   return true;
}

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

// GET /api/proyecto-tarifas/todas?proyecto_id=xxx&search=yyy&page=1&limit=20
proyectoTarifasRoute.get("/todas", async (c) => {
   try {
      const proyectoId = c.req.query("proyecto_id");
      if (!proyectoId) return c.json({ error: "proyecto_id es requerido" }, 400);

      const search = c.req.query("search") || "";
      const page = parseInt(c.req.query("page") || "1", 10);
      const limit = parseInt(c.req.query("limit") || "20", 10);

      const result = await service.getAllConGlobales(proyectoId, search, page, limit);
      return c.json(result);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener tarifas" }, 500);
   }
});

// POST /api/proyecto-tarifas  (upsert single)
proyectoTarifasRoute.post("/", async (c) => {
   try {
      if (!(await sessionOK(c))) return c.json({ error: "No autenticado" }, 401);

      const rawBody = await c.req.json();
      const validation = UpsertProyectoTarifaDTOSchema.safeParse(rawBody);
      if (!validation.success) {
         return c.json({ error: "Datos incompletos o incorrectos", detalles: validation.error.format() }, 400);
      }

      await assertProyectoEditable(validation.data.proyecto_id);

      const tarifa = await service.upsert(validation.data);
      return c.json(tarifa, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al guardar la tarifa" }, 400);
   }
});

// POST /api/proyecto-tarifas/bulk
proyectoTarifasRoute.post("/bulk", async (c) => {
   try {
      if (!(await sessionOK(c))) return c.json({ error: "No autenticado" }, 401);

      const rawBody = await c.req.json();
      const { proyecto_id, tarifas } = rawBody as { proyecto_id: string; tarifas: Array<{ categoria_equipo_tarifa_id: string; precio_unitario: number }> };

      if (!proyecto_id) return c.json({ error: "proyecto_id es requerido" }, 400);
      if (!Array.isArray(tarifas)) return c.json({ error: "tarifas debe ser un array" }, 400);

      await assertProyectoEditable(proyecto_id);

      await service.bulkUpsert(proyecto_id, tarifas);
      return c.json({ success: true }, 200);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al guardar tarifas" }, 400);
   }
});

// DELETE /api/proyecto-tarifas/:id
proyectoTarifasRoute.delete("/:id", async (c) => {
   try {
      if (!(await sessionOK(c))) return c.json({ error: "No autenticado" }, 401);

      const tarifa = await service.getById(c.req.param("id"));
      if (!tarifa) return c.json({ error: "Tarifa no encontrada" }, 404);
      await assertProyectoEditable(tarifa.proyecto_id);

      await service.remove(c.req.param("id"));
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al eliminar la tarifa" }, 400);
   }
});

export default proyectoTarifasRoute;
