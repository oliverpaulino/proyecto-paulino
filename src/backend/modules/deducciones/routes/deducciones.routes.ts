import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyDeduccionRepository } from "../infraestructure/deducciones.infraestructure";
import { DeduccionService } from "../service/deducciones.service";
import { CreateDeduccionSchema, DeleteDeduccionSchema, UpdateDeduccionSchema } from "@/dtos/deducciones.dto";
import { auth } from "@/lib/auth";

const deduccionesRoute = new Hono();
const repo = new KyselyDeduccionRepository(db);
const service = new DeduccionService(repo);

function extractParams(c: any) {
   return {
      page: Number(c.req.query("page")) || 1,
      limit: Number(c.req.query("limit")) || 20,
      search: c.req.query("search"),
      start: c.req.query("start") ? new Date(c.req.query("start")) : undefined,
      end: c.req.query("end") ? new Date(`${c.req.query("end")}T23:59:59.999`) : undefined,
      empleado_id: c.req.query("empleado_id"),
      equipo_id: c.req.query("equipo_id"),
   };
}

deduccionesRoute.get("/", async (c) => {
   try {
      const deducciones = await service.getAll(extractParams(c));
      return c.json(deducciones);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener deducciones" }, 400);
   }
});

deduccionesRoute.get("/deleted", async (c) => {
   try {
      const deducciones = await service.getAllDeleted(extractParams(c));
      return c.json(deducciones);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener deducciones anuladas" }, 400);
   }
});

deduccionesRoute.get("/:id", async (c) => {
   const id = c.req.param("id");
   let deduccion = await service.getById(id);
   if (!deduccion) {
      deduccion = await service.getDeletedById(id);
      if (!deduccion) return c.json({ error: "Deducción no encontrada" }, 404);
   }
   return c.json(deduccion);
});

deduccionesRoute.post("/", async (c) => {
   const body = await c.req.json();
   const parseResult = CreateDeduccionSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const deduccion = await service.create(parseResult.data);
      return c.json(deduccion, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

deduccionesRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = UpdateDeduccionSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const deduccion = await service.update(c.req.param("id"), parseResult.data);
      if (!deduccion) return c.json({ error: "Deducción no encontrada" }, 404);
      return c.json(deduccion);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

deduccionesRoute.patch("/:id/restore", async (c) => {
   try {
      const deduccion = await service.restore(c.req.param("id"));
      
      if (!deduccion) {
         return c.json({ error: "Deducción no encontrada" }, 404);
      }

      return c.json(deduccion);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400
      );
   }
});

deduccionesRoute.delete("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = DeleteDeduccionSchema.safeParse(body);
   
   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      const payload = {
         ...parseResult.data,
         deleted_by: session?.user?.id,
      };

      const deleted = await service.delete(c.req.param("id"), payload);
      if (!deleted) return c.json({ error: "Deducción no encontrada" }, 404);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default deduccionesRoute;