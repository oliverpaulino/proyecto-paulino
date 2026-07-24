/**
 * Server-side role resolution.
 *
 * Roles live in the `app_role` table, not in the code bundle. `ac.newRole()`
 * is a pure function over a `{ resource: action[] }` map, so a role can be
 * rebuilt per request from a database row — no organization plugin required.
 *
 * Reads hit on nearly every request, so rows are cached in-process for a short
 * TTL. The TTL is deliberately short: a permission change should take effect in
 * seconds without a deploy or a server restart.
 */
import "server-only";

import db from "@/backend/database";
import { ac } from "@/lib/permission";

/** The `{ resource: action[] }` shape stored in `app_role.permissions`. */
export type PermissionMap = Record<string, string[]>;

export interface ResolvedRole {
   key: string;
   label: string;
   description: string | null;
   permissions: PermissionMap;
   isBuiltin: boolean;
   isAdmin: boolean;
}

const CACHE_TTL_MS = 30_000;

let cache: { roles: Map<string, ResolvedRole>; expiresAt: number } | null = null;

/** Drop the cache so the next read reflects a just-written change immediately. */
export function invalidateRoleCache(): void {
   cache = null;
}

async function loadRoles(): Promise<Map<string, ResolvedRole>> {
   const now = Date.now();
   if (cache && cache.expiresAt > now) return cache.roles;

   const rows = await db
      .selectFrom("app_role")
      .select([
         "key",
         "label",
         "description",
         "permissions",
         "is_builtin",
         "is_admin",
      ])
      .execute();

   const roles = new Map<string, ResolvedRole>(
      rows.map((r) => [
         r.key,
         {
            key: r.key,
            label: r.label,
            description: r.description,
            // `permissions` is jsonb; pg returns it already parsed, but a role
            // seeded by hand could hold null.
            permissions: (r.permissions ?? {}) as PermissionMap,
            isBuiltin: r.is_builtin,
            isAdmin: r.is_admin,
         },
      ]),
   );

   cache = { roles, expiresAt: now + CACHE_TTL_MS };
   return roles;
}

/** Every role, ordered by label — for the role editor and user assignment. */
export async function listRoles(): Promise<ResolvedRole[]> {
   const roles = await loadRoles();
   return [...roles.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export async function getRole(key: string): Promise<ResolvedRole | null> {
   const roles = await loadRoles();
   return roles.get(key) ?? null;
}

/**
 * The effective permission map for a role key. Unknown or unset roles resolve
 * to `{}` — deny by default, never a partial grant.
 */
export async function getPermissionsForRole(
   roleKey: string | null | undefined,
): Promise<PermissionMap> {
   if (!roleKey) return {};
   const role = await getRole(roleKey);
   return role?.permissions ?? {};
}

/** Resources/actions declared in `permission.ts`, for validating role edits. */
const STATEMENTS = ac.statements as unknown as Record<string, readonly string[]>;

/**
 * Authoritative permission check. `resource`/`action` are physical statement
 * keys as defined in `permission.ts` — not the UI-level vocabulary the
 * `usePermissions` hook speaks.
 *
 * Note this does not call `Role.authorize()`: that helper only consults the
 * role's own statement map (it never validates against the access controller),
 * so it is equivalent to this lookup while allocating a role per call. We check
 * the declared statements explicitly instead, which `authorize` does not do —
 * a stale grant for a resource since removed from `permission.ts` must not
 * authorise anything.
 */
export async function roleCan(
   roleKey: string | null | undefined,
   resource: string,
   action: string,
): Promise<boolean> {
   if (!STATEMENTS[resource]?.includes(action)) return false;
   const permissions = await getPermissionsForRole(roleKey);
   return permissions[resource]?.includes(action) ?? false;
}

/**
 * Strip anything not declared in `permission.ts` from a submitted permission
 * map, so the role editor can never persist a resource or action that does not
 * exist. Empty resources are dropped entirely.
 */
export function sanitizePermissions(input: unknown): PermissionMap {
   if (!input || typeof input !== "object") return {};
   const out: PermissionMap = {};

   for (const [resource, actions] of Object.entries(input as PermissionMap)) {
      const declared = STATEMENTS[resource];
      if (!declared || !Array.isArray(actions)) continue;

      const kept = [...new Set(actions)].filter((a) => declared.includes(a));
      if (kept.length > 0) out[resource] = kept;
   }

   return out;
}
