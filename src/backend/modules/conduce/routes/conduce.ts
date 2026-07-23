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

// GET /api/conduces?proyecto_id=&cliente_id=&tipo_conduce=&es_cobrable=&fecha_desde=&fecha_hasta=&busqueda=&page=&pageSize=
conducesRoute.get("/", async (c) => {
   try {
      const q = c.req.query();
      const filtros: ConduceFiltros = {
         proyecto_id: q.proyecto_id || undefined,
         empleado_id: q.empleado_id || undefined,
         cliente_id: q.cliente_id || undefined,
         tipo_conduce: (q.tipo_conduce as ConduceFiltros["tipo_conduce"]) || undefined,
         es_cobrable: q.es_cobrable === "true" ? true : q.es_cobrable === "false" ? false : undefined,
         fecha_desde: q.fecha_desde ? new Date(q.fecha_desde) : undefined,
         fecha_hasta: q.fecha_hasta ? new Date(q.fecha_hasta) : undefined,
         busqueda: q.busqueda || undefined,
         page: q.page ? Number(q.page) : undefined,
         pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      };

      const resultado = await service.list(filtros);
      return c.json(resultado);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener conduces" }, 500);
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
         } as any);
         return c.json(conduce, 201);
      } catch (error: any) {
         return c.json({ error: error.message }, 400);
      }
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al registrar conduce" }, 500);
   }
});

// PATCH /api/conduces/:id
// body puede incluir `proyecto_id_anterior` para recalcular ambos proyectos
// si el conduce se reasignó de un proyecto a otro (o se desasignó).
conducesRoute.patch("/:id", async (c) => {
   try {
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
conducesRoute.delete("/:id", async (c) => {
   try {
      await service.remove(c.req.param("id"));
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al eliminar conduce" }, 400);
   }
});

export default conducesRoute;