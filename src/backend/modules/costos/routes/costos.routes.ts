import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyCostoRepository } from "../infraestructure/costos.infraestructure";
import { CostoService } from "../service/costos.service";
import { CreateCostoSchema, DeleteCostoSchema, UpdateCostoSchema } from "@/dtos/costos.dto";
import { auth } from "@/lib/auth";

const costosRoute = new Hono();
const repo = new KyselyCostoRepository(db);
const service = new CostoService(repo);

function extractParams(c: any) {
   return {
      page: Number(c.req.query("page")) || 1,
      limit: Number(c.req.query("limit")) || 20,
      search: c.req.query("search"),
      start: c.req.query("start") ? new Date(c.req.query("start")) : undefined,
      end: c.req.query("end") ? new Date(`${c.req.query("end")}T23:59:59.999`) : undefined,
      proyecto_id: c.req.query("proyecto_id"),
      orden_compra_id: c.req.query("orden_compra_id"),
   };
}

costosRoute.get("/", async (c) => {
   try {
      const costos = await service.getAll(extractParams(c));
      return c.json(costos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener costos" }, 400);
   }
});

costosRoute.get("/deleted", async (c) => {
   try {
      const costos = await service.getAllDeleted(extractParams(c));
      return c.json(costos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener costos eliminados" }, 400);
   }
});

costosRoute.get("/:id", async (c) => {
   const id = c.req.param("id");
   let costo = await service.getById(id);
   if (!costo) {
      costo = await service.getDeletedById(id);
      if (!costo) return c.json({ error: "Costo no encontrado" }, 404);
   }
   return c.json(costo);
});

costosRoute.post("/", async (c) => {
   const body = await c.req.json();
   const parseResult = CreateCostoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const costo = await service.create(parseResult.data);
      return c.json(costo, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

costosRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = UpdateCostoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const costo = await service.update(c.req.param("id"), parseResult.data);
      if (!costo) return c.json({ error: "Costo no encontrado" }, 404);
      return c.json(costo);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

costosRoute.patch("/:id/restore", async (c) => {
   try {
      const costo = await service.restore(c.req.param("id"));
      
      if (!costo) {
         return c.json({ error: "Costo no encontrado" }, 404);
      }

      return c.json(costo);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400
      );
   }
});

costosRoute.delete("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = DeleteCostoSchema.safeParse(body);
   
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
      if (!deleted) return c.json({ error: "Costo no encontrado" }, 404);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default costosRoute;