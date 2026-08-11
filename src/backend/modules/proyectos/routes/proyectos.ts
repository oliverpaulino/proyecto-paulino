import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyProyectoRepository } from "../infraestructure/proyecto.infraestructure";
import { ProyectoService } from "../service/proyecto.service";
import { auth } from "@/lib/auth";
import { KyselyConduceRepository } from "../../conduce/infraestructure/conduce.infraestructure";
import { CreateProyectoDTOSchema } from "@/dtos/proyecto.dto";

const proyectosRoute = new Hono();
const repo = new KyselyProyectoRepository(db);
const conduceRepo = new KyselyConduceRepository(db); // ← NUEVO: ProyectoService ahora lo necesita para combinar conduces en getById()/getLiquidacion()
const service = new ProyectoService(repo, conduceRepo);

// GET /api/proyectos?search=...&page=1&limit=10
proyectosRoute.get("/", async (c) => {
   try {
      const searchQuery = c.req.query("search") || "";
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "10");
      const pagination = { page, limit };
      const proyectos = await service.getAll(searchQuery, pagination);
      return c.json(proyectos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener proyectos" }, 500);
   }
});

// GET /api/proyectos/:id
proyectosRoute.get("/:id", async (c) => {
   try {
      const proyecto = await service.getById(c.req.param("id"));
      if (!proyecto) return c.json({ error: "Proyecto no encontrado" }, 404);
      return c.json(proyecto);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error" }, 500);
   }
});

// GET /api/proyectos/cliente/:clientid
proyectosRoute.get("/cliente/:clientid", async (c) => {
   try {
      const clientId = c.req.param("clientid");
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "10");
      const searchQuery = c.req.query("search") || "";
      const proyectos = await service.getByClientId(clientId, searchQuery, { page, limit }); // Obtener todos los proyectos
      return c.json(proyectos);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error" }, 500);
   }
});

// GET /api/proyectos/:id/liquidacion — datos consolidados para el PDF (Facade)
proyectosRoute.get("/:id/liquidacion", async (c) => {
   try {
      const liq = await service.getLiquidacion(c.req.param("id"));
      if (!liq) return c.json({ error: "Liquidación no disponible para este proyecto" }, 404);
      return c.json(liq);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error" }, 500);
   }
});


// PATCH /api/proyectos/:id — actualizar proyecto (tarifa_servicio, etc.)
proyectosRoute.patch("/:id", async (c) => {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const body = await c.req.json();
      const proyecto = await service.update(c.req.param("id"), {
         ...body,
         // Quién hizo el cambio de estado: se guarda en el historial. La sesión
         // vive en la ruta, el repo no la conoce.
         changed_by: session.user.id,
         changed_by_name: session.user.name,
      });
      if (!proyecto) return c.json({ error: "Proyecto no encontrado" }, 404);
      return c.json(proyecto);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al actualizar proyecto" }, 400);
   }
});

// PATCH /api/proyectos/detalle/cobrable — toggle es_cobrable en lote
proyectosRoute.patch("/detalle/cobrable", async (c) => {
   try {
      const body = await c.req.json();
      const { ids, es_cobrable } = body as { ids: string[]; es_cobrable: boolean };

      if (!Array.isArray(ids) || ids.length === 0) {
         return c.json({ error: "Se requiere al menos un ID" }, 400);
      }
      if (typeof es_cobrable !== "boolean") {
         return c.json({ error: "es_cobrable debe ser boolean" }, 400);
      }

      await service.toggleDetalleCobrable(ids, es_cobrable);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al actualizar detalle" }, 500);
   }
});

// POST /api/proyectos
proyectosRoute.post("/", async (c) => {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const rawBody = await c.req.json();
      const validation = CreateProyectoDTOSchema.safeParse(rawBody);

      if (!validation.success) {
         return c.json(
            { error: "Datos incompletos o incorrectos", detalles: validation.error.format() },
            400
         );
      }

      const body = validation.data;

      try {
         const proyecto = await service.create({
            ...body,
            fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : new Date(),
            fecha_fin: body.fecha_fin ? new Date(body.fecha_fin) : undefined,
            cargos_cobrables: body.cargos_cobrables ?? [],
            gastos_internos: body.gastos_internos ?? [],
         });
         return c.json(proyecto, 201);
      } catch (error: any) {
         return c.json({ error: error.message }, 400);
      }
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al registrar proyecto" },
         500
      );
   }
});

export default proyectosRoute;