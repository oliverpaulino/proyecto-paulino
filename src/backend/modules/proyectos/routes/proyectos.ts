import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyProyectoRepository } from "../infraestructure/proyecto.infraestructure";
import { ProyectoService } from "../service/proyecto.service";
import type { TipoProyecto } from "../domain/proyecto.domain";
import { CreateProyectoExpressDTOSchema } from "@/dtos/proyecto.dto";
import { auth } from "@/lib/auth";
import { KyselyConduceRepository } from "../../conduce/infraestructure/conduce.infraestructure";

const proyectosRoute = new Hono();
const repo = new KyselyProyectoRepository(db);
const conduceRepo = new KyselyConduceRepository(db); // ← NUEVO: ProyectoService ahora lo necesita para combinar conduces en getById()/getLiquidacion()
const service = new ProyectoService(repo, conduceRepo);

// GET /api/proyectos?tipo=EXPRESS|NORMAL|GRANDE
proyectosRoute.get("/", async (c) => {
   try {
      const tipo = c.req.query("tipo") as TipoProyecto | undefined;
      const proyectos = await service.getAll(tipo);
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

// POST /api/proyectos/express
proyectosRoute.post("/express", async (c) => {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const rawBody = await c.req.json();
      const validation = CreateProyectoExpressDTOSchema.safeParse(rawBody);

      if (!validation.success) {
         return c.json(
            { error: "Datos incompletos o incorrectos", detalles: validation.error.format() },
            400
         );
      }

      const body = validation.data;

      try {
         const proyecto = await service.createExpress({
            ...body,
            servicio_id: body.servicio_id ?? null,
            fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : new Date(),
            cargos_cobrables: body.cargos_cobrables ?? [],
            gastos_internos: body.gastos_internos ?? [],
         });
         return c.json(proyecto, 201);
      } catch (error: any) {
         return c.json({ error: error.message }, 400);
      }
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al registrar proyecto express" },
         500
      );
   }
});

export default proyectosRoute;