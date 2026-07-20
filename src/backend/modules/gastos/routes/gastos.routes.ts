import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyGastoRepository } from "../infraestructure/gastos.infraestructure";
import { GastoService } from "../service/gastos.service";
import { CreateGastoSchema, DeleteGastoSchema, UpdateGastoSchema } from "@/dtos/gastos.dto";
import { auth } from "@/lib/auth";

const gastosRoute = new Hono();
const repo = new KyselyGastoRepository(db);
const service = new GastoService(repo);

function extractParams(c: any) {
   return {
      page: Number(c.req.query("page")) || 1,
      limit: Number(c.req.query("limit")) || 20,
      search: c.req.query("search"),
      start: c.req.query("start") ? new Date(c.req.query("start")) : undefined,
      end: c.req.query("end") ? new Date(`${c.req.query("end")}T23:59:59.999`) : undefined,
      categoria: c.req.query("categoria"),
      grupo: c.req.query("grupo"),
      orden_compra_id: c.req.query("orden_compra_id"),
      proyecto_id: c.req.query("proyecto_id"),
      equipo_id: c.req.query("equipo_id"),
   };
}

gastosRoute.get("/", async (c) => {
   try {
      const gastos = await service.getAll(extractParams(c));
      return c.json(gastos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener gastos" }, 400);
   }
});

gastosRoute.get("/deleted", async (c) => {
   try {
      const gastos = await service.getAllDeleted(extractParams(c));
      return c.json(gastos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener gastos eliminados" }, 400);
   }
});

gastosRoute.get("/:id", async (c) => {
   const id = c.req.param("id");
   let gasto = await service.getById(id);
   if (!gasto) {
      gasto = await service.getDeletedById(id);
      if (!gasto) return c.json({ error: "Gasto no encontrado" }, 404);
   }
   return c.json(gasto);
});

gastosRoute.post("/", async (c) => {
   const body = await c.req.json();
   const parseResult = CreateGastoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const gasto = await service.create(parseResult.data);
      return c.json(gasto, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

gastosRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = UpdateGastoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const gasto = await service.update(c.req.param("id"), parseResult.data);
      if (!gasto) return c.json({ error: "Gasto no encontrado" }, 404);
      return c.json(gasto);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/purchase-orders/:id/restore
gastosRoute.patch("/:id/restore", async (c) => {
   try {
      const order = await service.restore(c.req.param("id"));
      
      if (!order) {
         return c.json({ error: "Orden no encontrada" }, 404);
      }

      return c.json(order);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400
      );
   }
});

gastosRoute.delete("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = DeleteGastoSchema.safeParse(body);
   
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
      if (!deleted) return c.json({ error: "Gasto no encontrado" }, 404);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default gastosRoute;