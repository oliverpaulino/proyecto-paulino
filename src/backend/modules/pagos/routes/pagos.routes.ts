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
      deduccion_empleado_id: c.req.query("deduccion_empleado_id"),
      conduce_id: c.req.query("conduce_id"),
      orden_compra_id: c.req.query("orden_compra_id"),
      proyecto_id: c.req.query("proyecto_id"),
      // Pagos vinculados a un equipo (vía gasto / deducción / orden de compra).
      equipo_id: c.req.query("equipo_id"),
      proveedor_id: c.req.query("proveedor_id"),
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

/**
 * Información polimórfica del destino de un pago (Gasto, Deducción, Proyecto,
 * Orden de Compra o Conduce): monto total, balance pendiente, cobrable, etc.
 * GET /api/pagos/destino-info?gasto_empresa_id=&proyecto_id=&...
 */
pagosRoute.get("/destino-info", async (c) => {
   try {
      const params = {
         gasto_empresa_id: c.req.query("gasto_empresa_id") ?? null,
         deduccion_empleado_id: c.req.query("deduccion_empleado_id") ?? null,
         conduce_id: c.req.query("conduce_id") ?? null,
         proyecto_id: c.req.query("proyecto_id") ?? null,
         orden_compra_id: c.req.query("orden_compra_id") ?? null,
      };

      const count = Object.values(params).filter(Boolean).length;
      if (count !== 1) {
         return c.json(
            { error: "Debe proporcionar exactamente un destino (gasto_empresa_id, deduccion_empleado_id, conduce_id, proyecto_id u orden_compra_id)." },
            400
         );
      }

      const info = await service.getInfoDestino(params);
      if (!info) return c.json({ error: "Destino no encontrado" }, 404);
      return c.json(info);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener la información del destino" }, 400);
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