import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyPagoRepository } from "../infraestructure/pagos.infraestructure";
import { PagoService } from "../service/pagos.service";
import { CreatePagoSchema, DeletePagoSchema, UpdatePagoSchema } from "@/dtos/pagos.dto";
import { auth } from "@/lib/auth";

const pagosRoute = new Hono();
const repo = new KyselyPagoRepository(db);
const service = new PagoService(repo);

function extractParams(c: any) {
   return {
      page: Number(c.req.query("page")) || 1,
      limit: Number(c.req.query("limit")) || 20,
      search: c.req.query("search"),
      start: c.req.query("start") ? new Date(c.req.query("start")) : undefined,
      end: c.req.query("end") ? new Date(`${c.req.query("end")}T23:59:59.999`) : undefined,
      gasto_empresa_id: c.req.query("gasto_empresa_id"),
      costo_cliente_id: c.req.query("costo_cliente_id"),
      deduccion_empleado_id: c.req.query("deduccion_empleado_id"),
      orden_compra_id: c.req.query("orden_compra_id"),
   };
}

pagosRoute.get("/", async (c) => {
   try {
      const pagos = await service.getAll(extractParams(c));
      return c.json(pagos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener pagos" }, 400);
   }
});

pagosRoute.get("/deleted", async (c) => {
   try {
      const pagos = await service.getAllDeleted(extractParams(c));
      return c.json(pagos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener pagos anulados" }, 400);
   }
});

pagosRoute.get("/:id", async (c) => {
   const id = c.req.param("id");
   let pago = await service.getById(id);
   if (!pago) {
      pago = await service.getDeletedById(id);
      if (!pago) return c.json({ error: "Pago no encontrado" }, 404);
   }
   return c.json(pago);
});

pagosRoute.post("/", async (c) => {
   const body = await c.req.json();
   const parseResult = CreatePagoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const pago = await service.create(parseResult.data);
      return c.json(pago, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

pagosRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = UpdatePagoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const pago = await service.update(c.req.param("id"), parseResult.data);
      if (!pago) return c.json({ error: "Pago no encontrado" }, 404);
      return c.json(pago);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

pagosRoute.patch("/:id/restore", async (c) => {
   try {
      const pago = await service.restore(c.req.param("id"));
      
      if (!pago) {
         return c.json({ error: "Pago no encontrado" }, 404);
      }

      return c.json(pago);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400
      );
   }
});

pagosRoute.delete("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = DeletePagoSchema.safeParse(body);
   
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
      if (!deleted) return c.json({ error: "Pago no encontrado" }, 404);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default pagosRoute;