import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyEmployeeRepository } from "../infraestructure/employees.infraestructure";
import { EmployeeService } from "../service/employees.service";

const employeesRoute = new Hono();
const repo = new KyselyEmployeeRepository(db);
const service = new EmployeeService(repo);

// GET /api/employees
employeesRoute.get("/", async (c) => {
   const employees = await service.getAll();
   return c.json(employees);
});

// GET /api/employees/:id
employeesRoute.get("/:id", async (c) => {
   const employee = await service.getById(c.req.param("id"));
   if (!employee) return c.json({ error: "Empleado no encontrado" }, 404);
   return c.json(employee);
});

// POST /api/employees
employeesRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const employee = await service.create(body);
      return c.json(employee, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/employees/:id
employeesRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const employee = await service.update(c.req.param("id"), body);
      if (!employee) return c.json({ error: "Empleado no encontrado" }, 404);
      return c.json(employee);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/employees/:id
employeesRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Empleado no encontrado" }, 404);
   return c.json({ success: true });
});

export default employeesRoute;