/**
 * Server-side permission enforcement for Hono routes.
 *
 * This is the authoritative check. `PermissionGuard` on the client is a UX
 * affordance — it hides what a user cannot do, but nothing stops a request
 * being issued directly against the API. Every mutating route should sit
 * behind `requirePermission`.
 *
 * Resource/action pairs here are the *physical* statement keys declared in
 * `src/lib/permission.ts`, not the UI-level vocabulary used by the
 * `usePermissions` hook.
 */
import type { Context, Next } from "hono";
import { auth } from "@/lib/auth";
import { roleCan } from "@/lib/permissions/resolve";

/** Resolve the caller's role from the request's session cookie. */
async function getSessionRole(c: Context): Promise<string | null> {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      const user = session?.user as { role?: string | null } | undefined;
      return user?.role ?? null;
   } catch {
      return null;
   }
}

/**
 * Hono middleware asserting the caller's role grants `action` on `resource`.
 * Responds 401 when unauthenticated and 403 when authenticated but not
 * permitted, so the client can tell the two apart.
 */
export function requirePermission(resource: string, action: string) {
   return async (c: Context, next: Next) => {
      const role = await getSessionRole(c);

      if (!role) {
         return c.json({ error: "No autenticado" }, 401);
      }

      if (!(await roleCan(role, resource, action))) {
         return c.json(
            { error: "No tienes permiso para realizar esta acción" },
            403,
         );
      }

      return next();
   };
}

/**
 * Guards a whole route module with the conventional REST verb -> action
 * mapping, so a module can be protected in one line at mount time:
 *
 *    app.route("/clients", protectResource("client", clientsRoute))
 *
 * GET is treated as `read`; anything else maps to its CRUD action. Routes
 * needing finer control (e.g. an approve endpoint) should use
 * `requirePermission` directly on the individual handler instead.
 */
const METHOD_ACTIONS: Record<string, string> = {
   GET: "read",
   HEAD: "read",
   POST: "create",
   PUT: "update",
   PATCH: "update",
   DELETE: "delete",
};

export function requireResourcePermission(resource: string) {
   return async (c: Context, next: Next) => {
      // Preflight carries no credentials; the CORS layer answers it.
      if (c.req.method === "OPTIONS") return next();

      const action = METHOD_ACTIONS[c.req.method] ?? "read";
      return requirePermission(resource, action)(c, next);
   };
}
