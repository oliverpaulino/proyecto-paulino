import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyProyectoRepository } from "../infraestructure/proyecto.infraestructure";
import { ProyectoService } from "../service/proyecto.service";
import type { TipoProyecto, CreateProyectoExpressDTO } from "../domain/proyecto.domain";

const proyectosRoute = new Hono();
const repo    = new KyselyProyectoRepository(db);
const service = new ProyectoService(repo);

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

// POST /api/proyectos/express — transacción atómica Express
proyectosRoute.post("/express", async (c) => {
   try {
      const body = await c.req.json() as CreateProyectoExpressDTO & { fecha_inicio?: string };

      const proyecto = await service.createExpress({
         ...body,
         fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : new Date(),
         cargos_cobrables: body.cargos_cobrables ?? [],
         gastos_internos:  body.gastos_internos  ?? [],
      });

      return c.json(proyecto, 201);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al registrar proyecto express" },
         400
      );
   }
});

export default proyectosRoute;
