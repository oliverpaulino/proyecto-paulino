import { Hono } from "hono";
import db from "@/backend/database";
import { sql } from "kysely";

const rolEmpleadoRoute = new Hono();

// GET /api/roles-empleado — listar todos los roles de empleado
rolEmpleadoRoute.get("/", async (c) => {
   const roles = await db
      .selectFrom("rol_empleado")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
   return c.json(roles);
});

// GET /api/roles-empleado/:id — obtener un rol por ID
rolEmpleadoRoute.get("/:id", async (c) => {
   const { id } = c.req.param();
   const rol = await db
      .selectFrom("rol_empleado")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
   if (!rol) return c.json({ error: "Rol no encontrado" }, 404);
   return c.json(rol);
});

// POST /api/roles-empleado — crear un nuevo rol
rolEmpleadoRoute.post("/", async (c) => {
   const body = await c.req.json();
   const nombre = (body.nombre ?? "").trim().toUpperCase();
   const label = (body.label ?? "").trim();
   const es_operador = Boolean(body.es_operador);
   const color = body.color ?? null;

   if (!nombre) return c.json({ error: "El nombre del rol es requerido" }, 400);
   if (!label) return c.json({ error: "La etiqueta del rol es requerida" }, 400);
   if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(nombre)) {
      return c.json(
         { error: "El nombre debe ser uppercase, alfanumérico o guión bajo, 2-32 caracteres" },
         400,
      );
   }

   // Verificar duplicado
   const exists = await db
      .selectFrom("rol_empleado")
      .select("id")
      .where("nombre", "=", nombre)
      .executeTakeFirst();
   if (exists) return c.json({ error: `Ya existe un rol con el nombre "${nombre}"` }, 409);

   const [result] = await db
      .insertInto("rol_empleado")
      .values({ nombre, label, es_operador, color })
      .returningAll()
      .execute();

   return c.json(result, 201);
});

// PATCH /api/roles-empleado/:id — actualizar un rol
rolEmpleadoRoute.patch("/:id", async (c) => {
   const { id } = c.req.param();
   const body = await c.req.json();

   const existing = await db
      .selectFrom("rol_empleado")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
   if (!existing) return c.json({ error: "Rol no encontrado" }, 404);

   const updates: Record<string, unknown> = {};
   if (body.label !== undefined) updates.label = (body.label as string).trim();
   if (body.es_operador !== undefined) updates.es_operador = Boolean(body.es_operador);
   if (body.color !== undefined) updates.color = body.color || null;

   if (updates.label && !(updates.label as string)) {
      return c.json({ error: "La etiqueta no puede estar vacía" }, 400);
   }

   if (Object.keys(updates).length === 0) {
      return c.json({ error: "No hay campos para actualizar" }, 400);
   }

   updates.updated_at = new Date();

   const [result] = await db
      .updateTable("rol_empleado")
      .set(updates)
      .where("id", "=", id)
      .returningAll()
      .execute();

   return c.json(result);
});

// DELETE /api/roles-empleado/:id — eliminar un rol (solo si no tiene empleados asignados)
rolEmpleadoRoute.delete("/:id", async (c) => {
   const { id } = c.req.param();

   const existing = await db
      .selectFrom("rol_empleado")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
   if (!existing) return c.json({ error: "Rol no encontrado" }, 404);

   // Verificar si hay empleados usando este rol
   const count = await db
      .selectFrom("empleado")
      .select(sql<number>`count(*)::int`.as("count"))
      .where("rol", "=", existing.nombre)
      .executeTakeFirst();

   if (count && count.count > 0) {
      return c.json(
         { error: `No se puede eliminar: ${count.count} empleado(s) tienen asignado este rol` },
         409,
      );
   }

   await db.deleteFrom("rol_empleado").where("id", "=", id).execute();
   return c.json({ success: true });
});

export default rolEmpleadoRoute;
