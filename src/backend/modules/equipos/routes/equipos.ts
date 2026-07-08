import { Hono } from "hono";
import db from "@/backend/database";
import { auth } from "@/lib/auth";
import { KyselyEquipoRepository } from "../infraestructure/equipo.infraestructure";
import { EquipoService } from "../service/equipo.service";
import { EmployeeService } from "../../employees/service/employees.service";
import { KyselyEmployeeRepository } from "../../employees/infraestructure/employees.infraestructure";

const equiposRoute = new Hono();
const repo = new KyselyEquipoRepository(db);
const employeeRepo = new KyselyEmployeeRepository(db);
const service = new EquipoService(repo, employeeRepo);

// GET /api/equipos
equiposRoute.get("/", async (c) => {
   const page = parseInt(c.req.query("page") || "1", 10);
   const limit = parseInt(c.req.query("limit") || "10", 10);
   const search = c.req.query("search") || "";
   const equipos = await service.getAll({ page, limit, search });
   return c.json(equipos);
});

// GET /api/equipos/:id
equiposRoute.get("/:id", async (c) => {
   const equipo = await service.getById(c.req.param("id"));
   if (!equipo) return c.json({ error: "Equipo no encontrado" }, 404);
   return c.json(equipo);
});

// GET /api/equipos/:id/historial — state-change audit log
equiposRoute.get("/:id/historial", async (c) => {
   const historial = await service.getHistorial(c.req.param("id"));
   return c.json(historial);
});

// GET /api/equipos/:id/compras — purchase-order items registered against this equipo
equiposRoute.get("/:id/compras", async (c) => {
   const items = await service.getComprasItems(c.req.param("id"));
   return c.json(items);
});

// POST /api/equipos/:id/estado — change estado + record history
equiposRoute.post("/:id/estado", async (c) => {
   let body: { estado?: string; nota?: string };
   try {
      body = await c.req.json();
   } catch {
      return c.json({ error: "Cuerpo de solicitud inválido" }, 400);
   }
   if (!body.estado) {
      return c.json({ error: "Estado es requerido" }, 400);
   }

   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   const userId = session?.user?.id ?? null;
   const userName = session?.user?.name ?? null;

   try {
      const equipo = await service.changeEstado(
         c.req.param("id"),
         body.estado,
         userId,
         userName,
         body.nota ?? null
      );
      if (!equipo) return c.json({ error: "Equipo no encontrado" }, 404);
      return c.json(equipo);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// POST /api/equipos
equiposRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const equipo = await service.create(body);
      return c.json(equipo, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/equipos/:id
equiposRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const equipo = await service.update(c.req.param("id"), body);
      if (!equipo) return c.json({ error: "Equipo no encontrado" }, 404);
      return c.json(equipo);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/equipos/:id
equiposRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Equipo no encontrado" }, 404);
   return c.json({ success: true });
});

equiposRoute.get(":id/categorias", async (c) => {
   const categorias = await service.getCategoriaByEquipoId(c.req.param("id"));
   if (!categorias) return c.json({ error: "Equipo no encontrado" }, 404);
   return c.json(categorias);
})
equiposRoute.get(":id/operador", async (c) => {
   const operador = await service.getOperadorByEquipoId(c.req.param("id"));
   if (!operador) return c.json({ error: "Equipo no encontrado" }, 404);
   return c.json(operador);
})

export default equiposRoute;
