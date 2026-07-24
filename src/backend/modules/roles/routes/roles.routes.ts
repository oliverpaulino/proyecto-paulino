/**
 * CRUD for runtime-editable roles (`app_role`).
 *
 * Mounted behind `requireResourcePermission("user")` in `app.ts`, so only roles
 * granted the `user` statements (in practice `administrador`) can read or
 * change them.
 */
import { Hono } from "hono";
import db from "@/backend/database";
import {
   invalidateRoleCache,
   listRoles,
   sanitizePermissions,
} from "@/lib/permissions/resolve";

const rolesRoute = new Hono();

/** Role keys are used as identifiers in the `user.role` column. */
const KEY_PATTERN = /^[a-z][a-z0-9_]{2,31}$/;

// GET /api/roles
rolesRoute.get("/", async (c) => {
   try {
      return c.json(await listRoles());
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         500,
      );
   }
});

// POST /api/roles
rolesRoute.post("/", async (c) => {
   const body = await c.req.json();
   const key = String(body.key ?? "").trim();
   const label = String(body.label ?? "").trim();

   if (!KEY_PATTERN.test(key)) {
      return c.json(
         {
            error:
               "La clave debe empezar con una letra y contener solo minúsculas, números o guiones bajos (3-32 caracteres).",
         },
         400,
      );
   }
   if (!label) {
      return c.json({ error: "El nombre es obligatorio" }, 400);
   }

   try {
      const existing = await db
         .selectFrom("app_role")
         .select("key")
         .where("key", "=", key)
         .executeTakeFirst();

      if (existing) {
         return c.json({ error: "Ya existe un rol con esa clave" }, 409);
      }

      const created = await db
         .insertInto("app_role")
         .values({
            key,
            label,
            description: body.description ? String(body.description) : null,
            // Custom roles are never built-in and never carry admin-plugin
            // powers; `is_admin` is intentionally not settable over the API.
            permissions: sanitizePermissions(body.permissions),
            is_builtin: false,
            is_admin: false,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      invalidateRoleCache();
      return c.json(created, 201);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400,
      );
   }
});

// PATCH /api/roles/:key
rolesRoute.patch("/:key", async (c) => {
   const key = c.req.param("key");
   const body = await c.req.json();

   try {
      const role = await db
         .selectFrom("app_role")
         .selectAll()
         .where("key", "=", key)
         .executeTakeFirst();

      if (!role) return c.json({ error: "Rol no encontrado" }, 404);

      // The admin role anchors `adminRoles` in `auth.ts`; letting it be
      // narrowed here could lock every user out of role management.
      if (role.is_admin) {
         return c.json(
            { error: "El rol de administrador no puede modificarse" },
            403,
         );
      }

      const updated = await db
         .updateTable("app_role")
         .set({
            ...(body.label !== undefined
               ? { label: String(body.label).trim() }
               : {}),
            ...(body.description !== undefined
               ? {
                    description: body.description
                       ? String(body.description)
                       : null,
                 }
               : {}),
            ...(body.permissions !== undefined
               ? { permissions: sanitizePermissions(body.permissions) }
               : {}),
            updated_at: new Date(),
         })
         .where("key", "=", key)
         .returningAll()
         .executeTakeFirstOrThrow();

      invalidateRoleCache();
      return c.json(updated);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400,
      );
   }
});

// DELETE /api/roles/:key
rolesRoute.delete("/:key", async (c) => {
   const key = c.req.param("key");

   try {
      const role = await db
         .selectFrom("app_role")
         .select(["key", "is_builtin"])
         .where("key", "=", key)
         .executeTakeFirst();

      if (!role) return c.json({ error: "Rol no encontrado" }, 404);
      if (role.is_builtin) {
         return c.json(
            { error: "Los roles predefinidos no se pueden eliminar" },
            403,
         );
      }

      // A user whose role row vanished would resolve to no permissions at all,
      // so refuse while the role is still assigned.
      const assigned = await db
         .selectFrom("user")
         .select("id")
         .where("role", "=", key)
         .limit(1)
         .executeTakeFirst();

      if (assigned) {
         return c.json(
            {
               error:
                  "Hay usuarios con este rol asignado. Reasígnalos antes de eliminarlo.",
            },
            409,
         );
      }

      await db.deleteFrom("app_role").where("key", "=", key).execute();
      invalidateRoleCache();
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error desconocido" },
         400,
      );
   }
});

export default rolesRoute;
