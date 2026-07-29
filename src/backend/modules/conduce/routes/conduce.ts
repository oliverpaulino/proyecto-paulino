import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyConduceRepository } from "../infraestructure/conduce.infraestructure";
import { ConduceService } from "../service/conduce.service";
import { CreateConduceDTOSchema } from "@/dtos/conduce.dto";
import { auth } from "@/lib/auth";
import type { ConduceFiltros } from "../domain/conduce.domain";
import { KyselyProyectoRepository } from "../../proyectos/infraestructure/proyecto.infraestructure";

const conducesRoute = new Hono();
const repo = new KyselyConduceRepository(db);
const proyectoRepo = new KyselyProyectoRepository(db);
const service = new ConduceService(repo, proyectoRepo);

// GET /api/conduces?proyecto_id=&cliente_id=&equipo_id=&tipo_conduce=&es_cobrable=&fecha_desde=&fecha_hasta=&busqueda=&eliminado=&page=&pageSize=
conducesRoute.get("/", async (c) => {
   try {
      const q = c.req.query();
      const filtros: ConduceFiltros = {
         proyecto_id: q.proyecto_id || undefined,
         empleado_id: q.empleado_id || undefined,
         equipo_id: q.equipo_id || undefined,
         cliente_id: q.cliente_id || undefined,
         tipo_conduce: (q.tipo_conduce as ConduceFiltros["tipo_conduce"]) || undefined,
         es_cobrable: q.es_cobrable === "true" ? true : q.es_cobrable === "false" ? false : undefined,
         // Se dejan como texto "YYYY-MM-DD" tal cual llegan del <input type="date">
         // — NO se convierten con `new Date()` aquí. Ver conduce.infraestructure.ts
         // para el porqué (evita el corrimiento de un día por timezone).
         fecha_desde: q.fecha_desde || undefined,
         fecha_hasta: q.fecha_hasta || undefined,
         busqueda: q.busqueda || undefined,
         eliminado: q.eliminado === "true" ? true : undefined,
         page: q.page ? Number(q.page) : undefined,
         pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      };

      const resultado = await service.list(filtros);
      return c.json(resultado);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener conduces" }, 500);
   }
});

// GET /api/conduces/categorias?proyecto_id= — categorías con conteo (ligero, sin detalles)
conducesRoute.get("/categorias", async (c) => {
   try {
      const proyectoId = c.req.query("proyecto_id");
      if (!proyectoId) return c.json({ error: "proyecto_id es requerido" }, 400);
      const categorias = await service.getCategoriasByProyecto(proyectoId);
      return c.json(categorias);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener categorías" }, 500);
   }
});

// GET /api/conduces/:id
conducesRoute.get("/:id", async (c) => {
   try {
      const conduce = await repo.findById(c.req.param("id"));
      if (!conduce) return c.json({ error: "Conduce no encontrado" }, 404);
      return c.json(conduce);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error" }, 500);
   }
});

// POST /api/conduces
conducesRoute.post("/", async (c) => {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const rawBody = await c.req.json();
      const validation = CreateConduceDTOSchema.safeParse(rawBody);
      if (!validation.success) {
         return c.json(
            { error: "Datos incompletos o incorrectos", detalles: validation.error.format() },
            400
         );
      }

      const body = validation.data;

      try {
         const conduce = await service.create({
            ...body,
            fecha: new Date(body.fecha),
            // Antes se pedía la sesión solo para el chequeo de auth y nunca
            // se guardaba quién creó el registro.
            created_by: session.user.id,
            created_by_name: session.user.name,
         } as any);
         return c.json(conduce, 201);
      } catch (error: any) {
         return c.json({ error: error.message }, 400);
      }
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al registrar conduce" }, 500);
   }
});

// PATCH /api/conduces/bulk-cobrable — toggle es_cobrable en lote
// DEBE ir ANTES de /:id para que Hono no lo capture como parámetro.
conducesRoute.patch("/bulk-cobrable", async (c) => {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const body = await c.req.json();
      const { ids, es_cobrable } = body as { ids: string[]; es_cobrable: boolean };

      if (!Array.isArray(ids) || ids.length === 0) {
         return c.json({ error: "Se requiere al menos un ID" }, 400);
      }
      if (typeof es_cobrable !== "boolean") {
         return c.json({ error: "es_cobrable debe ser boolean" }, 400);
      }

      await service.bulkToggleCobrable(ids, es_cobrable);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al actualizar conduces" }, 500);
   }
});

// PATCH /api/conduces/:id
// body puede incluir `proyecto_id_anterior` para recalcular ambos proyectos
// si el conduce se reasignó de un proyecto a otro (o se desasignó).
conducesRoute.patch("/:id", async (c) => {
   try {
      // Antes este endpoint no exigía sesión — cualquiera podía editar un
      // conduce sin autenticarse.
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const rawBody = await c.req.json();
      const { proyecto_id_anterior, fecha, ...rest } = rawBody;

      const conduce = await service.update(
         c.req.param("id"),
         { ...rest, ...(fecha ? { fecha: new Date(fecha) } : {}) },
         proyecto_id_anterior ?? null
      );
      return c.json(conduce);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al actualizar conduce" }, 400);
   }
});

// DELETE /api/conduces/:id
// Eliminación LÓGICA — el registro se conserva, se marca deleted_at/deleted_by
// y desaparece de los listados normales. body opcional: { reason }
conducesRoute.delete("/:id", async (c) => {
   try {
      // Antes este endpoint tampoco exigía sesión.
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      let reason: string | null = null;
      try {
         const body = await c.req.json();
         reason = body?.reason ?? null;
      } catch {
         // sin body → eliminación sin motivo, no es un error
      }

      await service.remove(c.req.param("id"), {
         deletedBy: session.user.id,
         deletedByName: session.user.name,
         reason,
      });
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al eliminar conduce" }, 400);
   }
});

// POST /api/conduces/:id/restore
// Revierte una eliminación lógica — pensado para el futuro apartado de
// "conduces eliminados".
conducesRoute.post("/:id/restore", async (c) => {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const conduce = await service.restore(c.req.param("id"));
      return c.json(conduce);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al restaurar conduce" }, 400);
   }
});

export default conducesRoute;