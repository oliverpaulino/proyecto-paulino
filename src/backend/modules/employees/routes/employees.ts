import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyEmployeeRepository } from "../infraestructure/employees.infraestructure";
import { EmployeeService } from "../service/employees.service";
import { catchError } from "@/lib/utils";

const employeesRoute = new Hono();
const repo = new KyselyEmployeeRepository(db);
const service = new EmployeeService(repo);


// GET /api/employees
employeesRoute.get("/", async (c) => {
   const page = parseInt(c.req.query("page") || "1", 10);
   const limit = parseInt(c.req.query("limit") || "10", 10);
   const search = c.req.query("search") || "";
   const employees = await service.getAll({ page, limit, search });
   return c.json(employees);
});



employeesRoute.get("/operators", async (c) => {
   console.log("tu maldit amadre")
   const page = parseInt(c.req.query("page") || "1", 10);
   const limit = parseInt(c.req.query("limit") || "10", 10);
   const search = c.req.query("search") || "";
   console.log("Fetching operators with params:", { page, limit, search });
   const operators = await service.getAllOperators({ page, limit, search });
   return c.json(operators);
});


// employeesRoute.get("/contacts", async (c) => {
//    const contacts = await service.getContacts();
//    return c.json(contacts);
// });

// GET /api/employees/:id/details
employeesRoute.get("/unlinked", async (c) => {
   const employees = await service.getUnlinked();
   return c.json(employees);
});

employeesRoute.get("/linked/:userId", async (c) => {
   const employees = await service.getLinkedByUserId(c.req.param("userId"));
   return c.json(employees);
});

employeesRoute.get("/:id/details", async (c) => {
   const { id } = c.req.param();
   const details = await service.getDetails(id);

   if (!details) return c.json({ error: "Empleado no encontrado" }, 404);
   return c.json(details);
});

employeesRoute.get("/:id", async (c) => {
   const employee = await service.getById(c.req.param("id"));
   if (!employee) return c.json({ error: "Empleado no encontrado" }, 404);
   return c.json(employee);
});

employeesRoute.get("/:id/operator", async (c) => {
   const { id } = c.req.param();
   const operator = await service.getOperator(id);
   return c.json(operator ?? null);
});

employeesRoute.post("/", async (c) => {
   const { operador, ...employeeData } = await c.req.json();
   try {
      const employee = await service.create(employeeData);

      if (employeeData.rol === "OPERADOR" && operador) {
         await service.createOperator({
            empleado_id: employee.id,
            licencia: operador.licencia,
            fecha_vencimiento: operador.fecha_vencimiento
         });
      }

      return c.json(employee, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

employeesRoute.patch("/:id", async (c) => {
   const { operador, ...employeeData } = await c.req.json();
   const id = c.req.param("id");

   try {
      const employee = await service.update(id, employeeData);
      if (!employee) return c.json({ error: "Empleado no encontrado" }, 404);

      if (operador) {
         const existingOp = await service.getOperator(id);

         if (existingOp) {
            await service.updateOperator(existingOp.id, {
               licencia: operador.licencia,
               fecha_vencimiento: operador.fecha_vencimiento
            });
         } else if (employee.rol === "OPERADOR" || employeeData.rol === "OPERADOR") {
            await service.createOperator({
               empleado_id: id,
               licencia: operador.licencia,
               fecha_vencimiento: operador.fecha_vencimiento
            });
         }
      }

      return c.json(employee);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

employeesRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Empleado no encontrado" }, 404);
   return c.json({ success: true });
});

employeesRoute.post("/contacts", async (c) => {
   const body = await c.req.json();

   if (!body.empleado_id) return c.json({ error: "empleado_id es requerido" }, 400);
   if (!body.name?.trim()) return c.json({ error: "El nombre es requerido" }, 400);
   if (!body.phone && !body.email) return c.json({ error: "Se requiere al menos un teléfono o un email" }, 400);
   if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return c.json({ error: "Formato de email inválido" }, 400);
   }

   const [error, contact] = await catchError(service.createContact(body));

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ data: contact }, 201);
});

employeesRoute.patch("/contacts/:contactId", async (c) => {
   const { contactId } = c.req.param();
   const body = await c.req.json();

   if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return c.json({ error: "Formato de email inválido" }, 400);
   }

   const [error, contact] = await catchError(service.updateContact(contactId, body));

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ contact });
});

employeesRoute.delete("/contacts/:contactId", async (c) => {
   const { contactId } = c.req.param();

   const [error] = await catchError(service.deleteContact(contactId));

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ success: true });
});

employeesRoute.post("/operators", async (c) => {
   const body = await c.req.json();

   if (!body.empleado_id) return c.json({ error: "empleado_id es requerido" }, 400);

   const [error, operator] = await catchError(service.createOperator(body));

   if (error) {
      if (error instanceof Error && error.message.includes("ya tiene un perfil")) {
         return c.json({ error: error.message }, 409);
      }
      return c.json({ error: String(error) }, 400);
   }
   return c.json({ data: operator }, 201);
});

employeesRoute.patch("/operators/:operatorId", async (c) => {
   const { operatorId } = c.req.param();
   const body = await c.req.json();

   const [error, operator] = await catchError(service.updateOperator(operatorId, body));

   if (error) return c.json({ error: String(error) }, 400);
   return c.json({ operator });
});

export default employeesRoute;