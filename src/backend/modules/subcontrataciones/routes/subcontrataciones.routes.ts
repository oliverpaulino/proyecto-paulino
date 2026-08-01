import { Hono } from "hono";
import db from "@/backend/database";
import { KyselySubcontratacionRepository } from "../infraestructure/subcontratacion.infraestructure";
import { SubcontratacionService } from "../service/subcontratacion.service";
import {
   CreateSubcontratacionSchema,
   UpdateSubcontratacionSchema,
   CambiarEstadoSchema,
   CrearPagoSchema,
   CrearApunteSchema,
   DeleteSubcontratacionSchema,
   EstadoTrabajo,
   EstadoPago,
} from "@/dtos/subcontratacion.dto";
import { auth } from "@/lib/auth";

const subcontratacionesRoute = new Hono();
const repo = new KyselySubcontratacionRepository(db);
const service = new SubcontratacionService(repo, db);

async function sessionUser(c: any) {
   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   return {
      created_by: session?.user?.id ?? null,
      created_by_name: session?.user?.name ?? null,
   };
}

subcontratacionesRoute.get("/", async (c) => {
   try {
      const q = c.req.query.bind(c.req);
      const estadoTrabajo = q("estado_trabajo");
      const estadoPago = q("estado_pago");

      const resultado = await service.listar({
         proveedor_id: q("proveedor_id") || undefined,
         proyecto_id: q("proyecto_id") || undefined,
         estado_trabajo:
            estadoTrabajo === "PENDIENTE" || estadoTrabajo === "EN_PROGRESO" ||
            estadoTrabajo === "TERMINADA" || estadoTrabajo === "CANCELADA"
               ? (estadoTrabajo as EstadoTrabajo)
               : undefined,
         estado_pago:
            estadoPago === "PENDIENTE" || estadoPago === "PARCIAL" || estadoPago === "PAGADO"
               ? (estadoPago as EstadoPago)
               : undefined,
         incluir_pagadas: q("incluir_pagadas") === "true",
         fecha_desde: q("fecha_desde") ? new Date(q("fecha_desde")!) : undefined,
         fecha_hasta: q("fecha_hasta") ? new Date(q("fecha_hasta")!) : undefined,
         busqueda: q("busqueda") || undefined,
         page: Number(q("page")) || 1,
         pageSize: Number(q("pageSize")) || 25,
      });

      return c.json(resultado);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al obtener las subcontrataciones" },
         400
      );
   }
});

subcontratacionesRoute.get("/:id", async (c) => {
   try {
      const sub = await service.getById(c.req.param("id"));
      if (!sub) return c.json({ error: "Subcontratación no encontrada" }, 404);
      return c.json(sub);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.post("/", async (c) => {
   const body = await c.req.json();
   const parseResult = CreateSubcontratacionSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const user = await sessionUser(c);
      const sub = await service.create(parseResult.data, user);
      return c.json(sub, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = UpdateSubcontratacionSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const sub = await service.update(c.req.param("id"), parseResult.data);
      if (!sub) return c.json({ error: "Subcontratación no encontrada" }, 404);
      return c.json(sub);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.patch("/:id/estado", async (c) => {
   const body = await c.req.json();
   const parseResult = CambiarEstadoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const sub = await service.cambiarEstado(c.req.param("id"), parseResult.data.estado);
      if (!sub) return c.json({ error: "Subcontratación no encontrada" }, 404);
      return c.json(sub);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.patch("/:id/pagar", async (c) => {
   const body = await c.req.json();
   const parseResult = CrearPagoSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const sub = await service.pagar(c.req.param("id"), parseResult.data);
      if (!sub) return c.json({ error: "Subcontratación no encontrada" }, 404);
      return c.json(sub);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.get("/:id/pagos", async (c) => {
   try {
      const pagos = await service.listarPagos(c.req.param("id"));
      return c.json(pagos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.get("/:id/apuntes", async (c) => {
   try {
      const apuntes = await service.listarApuntes(c.req.param("id"));
      return c.json(apuntes);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.post("/:id/apuntes", async (c) => {
   const body = await c.req.json();
   const parseResult = CrearApunteSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const user = await sessionUser(c);
      const apunte = await service.crearApunte(c.req.param("id"), parseResult.data, user);
      return c.json(apunte, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.delete("/:id", async (c) => {
   const body = await c.req.json();
   const parseResult = DeleteSubcontratacionSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const user = await sessionUser(c);
      const deleted = await service.delete(c.req.param("id"), {
         ...parseResult.data,
         deleted_by: parseResult.data.deleted_by ?? user.created_by,
      });
      if (!deleted) return c.json({ error: "Subcontratación no encontrada" }, 404);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

subcontratacionesRoute.patch("/:id/restore", async (c) => {
   try {
      const sub = await service.restore(c.req.param("id"));
      if (!sub) return c.json({ error: "Subcontratación no encontrada" }, 404);
      return c.json(sub);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default subcontratacionesRoute;
