import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyEmployeeRepository } from "../infraestructure/employees.infraestructure";
import { EmployeeService } from "../service/employees.service";
import crypto from "crypto";
import { catchError } from "@/lib/utils";

const employeesRoute = new Hono();
const repo = new KyselyEmployeeRepository(db);
const service = new EmployeeService(repo);

// GET /api/employees
employeesRoute.get("/", async (c) => {
   const employees = await service.getAll();
   return c.json(employees);
});

// GET /api/employees/:id/details — detalles con contactos, amonestaciones y operador
employeesRoute.get("/:id/details", async (c) => {
   const { id } = c.req.param();

   const empleado = await service.getById(id);
   if (!empleado) return c.json({ error: "Empleado no encontrado" }, 404);

   const [contactos, operadorRow] = await Promise.all([
      db
         .selectFrom("contact_empleado")
         .selectAll()
         .where("empleado_id", "=", id)
         .orderBy("created_at", "desc")
         .execute(),
      db
         .selectFrom("operador")
         .selectAll()
         .where("empleado_id", "=", id)
         .executeTakeFirst(),
   ]);

   return c.json({
      empleado,
      contactos: contactos.map((c) => ({
         ...c,
         created_at: new Date(c.created_at),
         updated_at: new Date(c.updated_at),
      })),
      operador: operadorRow
         ? {
              ...operadorRow,
              created_at: new Date(operadorRow.created_at),
              updated_at: new Date(operadorRow.updated_at),
           }
         : null,
   });
});

// GET /api/employees/:id
employeesRoute.get("/:id", async (c) => {
   const employee = await service.getById(c.req.param("id"));
   if (!employee) return c.json({ error: "Empleado no encontrado" }, 404);
   return c.json(employee);
});

// GET /api/employees/:id/operator
employeesRoute.get("/:id/operator", async (c) => {
   const { id } = c.req.param();
   const operator = await db
      .selectFrom("operador")
      .selectAll()
      .where("empleado_id", "=", id)
      .executeTakeFirst();
   return c.json(operator ?? null);
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

const TIPOS_CONTACTO_VALIDOS = ["TELEFONO", "EMAIL"];

// POST /api/employees/contacts
employeesRoute.post("/contacts", async (c) => {
   const body = await c.req.json();

   if (!body.empleado_id) return c.json({ error: "empleado_id es requerido" }, 400);
   if (!body.tipo_contacto) return c.json({ error: "tipo_contacto es requerido" }, 400);
   if (!TIPOS_CONTACTO_VALIDOS.includes(body.tipo_contacto)) {
      return c.json({ error: "tipo_contacto debe ser TELEFONO o EMAIL" }, 400);
   }
   if (!body.contacto?.trim()) return c.json({ error: "contacto es requerido" }, 400);

   if (body.tipo_contacto === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contacto)) {
      return c.json({ error: "Formato de email inválido" }, 400);
   }

   const [error, contact] = await catchError(
      db
         .insertInto("contact_empleado")
         .values({
            id: crypto.randomUUID(),
            empleado_id: body.empleado_id,
            tipo_contacto: body.tipo_contacto,
            contacto: body.contacto,
            created_at: new Date(),
            updated_at: new Date(),
         })
         .returningAll()
         .executeTakeFirstOrThrow()
   );

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ data: contact }, 201);
});

// PATCH /api/employees/contacts/:contactId
employeesRoute.patch("/contacts/:contactId", async (c) => {
   const { contactId } = c.req.param();
   const body = await c.req.json();

   if (body.tipo_contacto && !TIPOS_CONTACTO_VALIDOS.includes(body.tipo_contacto)) {
      return c.json({ error: "tipo_contacto debe ser TELEFONO o EMAIL" }, 400);
   }

   if (body.tipo_contacto === "EMAIL" && body.contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contacto)) {
      return c.json({ error: "Formato de email inválido" }, 400);
   }

   const updateData: Record<string, unknown> = { updated_at: new Date() };
   if (body.tipo_contacto !== undefined) updateData.tipo_contacto = body.tipo_contacto;
   if (body.contacto !== undefined) updateData.contacto = body.contacto;

   const [error, contact] = await catchError(
      db
         .updateTable("contact_empleado")
         .set(updateData)
         .where("id", "=", contactId)
         .returningAll()
         .executeTakeFirstOrThrow()
   );

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ contact });
});

// DELETE /api/employees/contacts/:contactId
employeesRoute.delete("/contacts/:contactId", async (c) => {
   const { contactId } = c.req.param();

   const [error] = await catchError(
      db
         .deleteFrom("contact_empleado")
         .where("id", "=", contactId)
         .executeTakeFirst()
   );

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ success: true });
});

// POST /api/employees/operators
employeesRoute.post("/operators", async (c) => {
   const body = await c.req.json();

   if (!body.empleado_id) return c.json({ error: "empleado_id es requerido" }, 400);

   const existing = await db
      .selectFrom("operador")
      .select("id")
      .where("empleado_id", "=", body.empleado_id)
      .executeTakeFirst();

   if (existing) return c.json({ error: "Este empleado ya tiene un perfil de operador" }, 409);

   const [error, operator] = await catchError(
      db
         .insertInto("operador")
         .values({
            id: crypto.randomUUID(),
            empleado_id: body.empleado_id,
            licencia: body.licencia ?? null,
            fecha_vencimiento: body.fecha_vencimiento ? new Date(body.fecha_vencimiento) : null,
            created_at: new Date(),
            updated_at: new Date(),
         })
         .returningAll()
         .executeTakeFirstOrThrow()
   );

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ data: operator }, 201);
});

// PATCH /api/employees/operators/:operatorId
employeesRoute.patch("/operators/:operatorId", async (c) => {
   const { operatorId } = c.req.param();
   const body = await c.req.json();

   const [error, operator] = await catchError(
      db
         .updateTable("operador")
         .set({ licencia: body.licencia ?? null, fecha_vencimiento: body.fecha_vencimiento ?? null, updated_at: new Date() })
         .where("id", "=", operatorId)
         .returningAll()
         .executeTakeFirstOrThrow()
   );

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ operator });
});

export default employeesRoute;
