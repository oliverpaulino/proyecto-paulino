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
 *
 * Several actions may be given, in which case any one of them suffices — they
 * are alternative spellings of the same capability (`read` / `list` / `get`),
 * not a set that must all be held.
 */
export function requirePermission(resource: string, ...actions: string[]) {
   return async (c: Context, next: Next) => {
      const role = await getSessionRole(c);

      if (!role) {
         return c.json({ error: "No autenticado" }, 401);
      }

      const results = await Promise.all(
         actions.map((action) => roleCan(role, resource, action)),
      );

      if (!results.some(Boolean)) {
         return c.json(
            { error: "No tienes permiso para realizar esta acción" },
            403,
         );
      }

      return next();
   };
}

/**
 * Candidate actions per verb; holding any one of them satisfies the check.
 * A read is spelled `read` on most resources but `list`/`get` on others (the
 * admin plugin's `user` statement has no `read` at all), so a single mapping
 * would deny every caller on those resources.
 */
const METHOD_ACTIONS: Record<string, string[]> = {
   GET: ["read", "list", "get", "consult"],
   HEAD: ["read", "list", "get", "consult"],
   POST: ["create"],
   PUT: ["update"],
   PATCH: ["update"],
   DELETE: ["delete"],
};

/**
 * Guards a whole route module with the conventional REST verb -> action
 * mapping, so a module can be protected in one line at mount time:
 *
 *    app.use("/clients/*", requireResourcePermission("client"))
 *
 * Routes needing finer control (e.g. an approve endpoint) should use
 * `requirePermission` directly on the individual handler instead.
 */
export function requireResourcePermission(resource: string) {
   return async (c: Context, next: Next) => {
      // Preflight carries no credentials; the CORS layer answers it.
      if (c.req.method === "OPTIONS") return next();

      const actions = METHOD_ACTIONS[c.req.method] ?? ["read"];
      return requirePermission(resource, ...actions)(c, next);
   };
}
