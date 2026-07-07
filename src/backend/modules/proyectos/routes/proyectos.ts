import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyProyectoRepository } from "../infraestructure/proyecto.infraestructure";
import { ProyectoService } from "../service/proyecto.service";
import type { TipoProyecto, CreateProyectoExpressDTO } from "../domain/proyecto.domain";
import { CreateProyectoExpressDTOSchema } from "@/dtos/proyecto.dto";
import { auth } from "@/lib/auth";

const proyectosRoute = new Hono();
const repo = new KyselyProyectoRepository(db);
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
      // 1. Verificamos sesión
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      // 2. Obtenemos el body crudo que mandó el Frontend
      const rawBody = await c.req.json();

      // 3. VALIDACIÓN NORMAL Y MANUAL CON ZOD
      const validation = CreateProyectoExpressDTOSchema.safeParse(rawBody);

      // 4. Si la validación falla, controlamos el error manualmente
      if (!validation.success) {
         return c.json(
            {
               error: "Datos incompletos o incorrectos",
               // Esto te devuelve un objeto exacto de qué campo falló (útil para debugear)
               detalles: validation.error.format()
            },
            400
         );
      }

      // 5. Si todo está bien, extraemos los datos ya validados y tipados
      const body = validation.data;

      // 6. Ejecutamos la lógica de negocio
      const proyecto = ProyectoService.createExpress({
         ...body,
         fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : new Date(),
         cargos_cobrables: body.cargos_cobrables ?? [],
         gastos_internos: body.gastos_internos ?? [],
      }, session.user.id);

      return c.json(proyecto, 201);

   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al registrar proyecto express" },
         500
      );
   }
});

export default proyectosRoute;
