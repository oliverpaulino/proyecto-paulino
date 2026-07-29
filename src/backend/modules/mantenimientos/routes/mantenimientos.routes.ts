import { Hono } from "hono";
import db from "@/backend/database";
import { auth } from "@/lib/auth";
import { KyselyMantenimientoRepository } from "../infraestructure/mantenimiento.infraestructure";
import { MantenimientoService } from "../service/mantenimiento.service";
import type { EstadoMantenimiento, TipoMantenimiento } from "../domain/mantenimiento.domain";

const mantenimientosRoute = new Hono();
const repo = new KyselyMantenimientoRepository(db);
const service = new MantenimientoService(repo);

async function getUser(c: any) {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   return {
      id: session?.user?.id ?? null,
      name: session?.user?.name ?? null,
   };
}

// GET /api/mantenimientos
mantenimientosRoute.get("/", async (c) => {
   const page = parseInt(c.req.query("page") || "1", 10);
   const limit = parseInt(c.req.query("limit") || "50", 10);
   const search = c.req.query("search") || "";
   const equipo_id = c.req.query("equipo_id") || undefined;
   const estado = (c.req.query("estado") || undefined) as EstadoMantenimiento | undefined;
   const tipo = (c.req.query("tipo") || undefined) as TipoMantenimiento | undefined;
   const startRaw = c.req.query("start");
   const endRaw = c.req.query("end");

   const mantenimientos = await service.getAll({
      page,
      limit,
      search,
      equipo_id,
      estado,
      tipo,
      start: startRaw ? new Date(startRaw) : undefined,
      end: endRaw ? new Date(endRaw) : undefined,
   });
   return c.json(mantenimientos);
});

// GET /api/mantenimientos/:id
mantenimientosRoute.get("/:id", async (c) => {
   const mantenimiento = await service.getById(c.req.param("id"));
   if (!mantenimiento) return c.json({ error: "Mantenimiento no encontrado" }, 404);
   return c.json(mantenimiento);
});

// POST /api/mantenimientos
mantenimientosRoute.post("/", async (c) => {
   let body: any;
   try {
      body = await c.req.json();
   } catch {
      return c.json({ error: "Cuerpo de solicitud inválido" }, 400);
   }

   const user = await getUser(c);

   try {
      const mantenimiento = await service.create({
         ...body,
         created_by: user.id,
         created_by_name: user.name,
      });
      return c.json(mantenimiento, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/mantenimientos/:id
mantenimientosRoute.patch("/:id", async (c) => {
   let body: any;
   try {
      body = await c.req.json();
   } catch {
      return c.json({ error: "Cuerpo de solicitud inválido" }, 400);
   }

   try {
      const mantenimiento = await service.update(c.req.param("id"), body);
      if (!mantenimiento) return c.json({ error: "Mantenimiento no encontrado" }, 404);
      return c.json(mantenimiento);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// POST /api/mantenimientos/:id/cerrar — cierra el registro y crea/enlaza el gasto
mantenimientosRoute.post("/:id/cerrar", async (c) => {
   let body: any;
   try {
      body = await c.req.json();
   } catch {
      return c.json({ error: "Cuerpo de solicitud inválido" }, 400);
   }

   const user = await getUser(c);

   try {
      const mantenimiento = await service.close(c.req.param("id"), {
         ...body,
         closed_by: user.id,
         closed_by_name: user.name,
      });
      if (!mantenimiento) return c.json({ error: "Mantenimiento no encontrado" }, 404);
      return c.json(mantenimiento);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/mantenimientos/:id
mantenimientosRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Mantenimiento no encontrado" }, 404);
   return c.json({ success: true });
});

export default mantenimientosRoute;
