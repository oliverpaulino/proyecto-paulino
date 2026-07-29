import { NextRequest, NextResponse } from "next/server";

type PermissionMap = Record<string, string[]>;

/**
 * Route prefix -> the permission required to open it, as a
 * `[resource, action]` pair from the statements in `src/lib/permission.ts`.
 *
 * This replaces the old numeric `ROLE_HIERARCHY`: with runtime-editable roles
 * there is no single privilege ladder to sit on, and a custom role would not
 * have a level at all. Checking the permission map means custom roles are
 * handled by construction and this file has no list of role names to drift out
 * of sync with the database.
 */
const ROUTE_PERMISSIONS: [prefix: string, resource: string, action: string][] = [
  ["/dashboard/settings", "user", "list"],
  ["/dashboard/equipo", "machinery", "read"],
  ["/dashboard/limites", "organization", "update"],
  ["/dashboard/contabilidad", "account_payable", "read"],
  ["/dashboard/cuentas-por-pagar", "account_payable", "read"],
  ["/dashboard/nomina", "payroll", "read"],
  ["/dashboard/proyectos", "project", "read"],
];

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + "/");
}

interface SessionResponse {
  user?: { role?: string };
  /** Attached by the `customSession` plugin in `src/lib/auth.ts`. */
  permissions?: PermissionMap;
}

async function getSession(request: NextRequest) {
  try {
    const url = new URL("/api/auth/get-session", request.url);
    const res = await fetch(url, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (res.ok) {
      const data = (await res.json()) as SessionResponse | null;
      return data ?? null;
    }
  } catch {
    // ignore fetch errors in middleware
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const userSession = await getSession(request);

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith("/auth/")) {
    if (userSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (!userSession) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const permissions = userSession.permissions ?? {};

  for (const [prefix, resource, action] of ROUTE_PERMISSIONS) {
    if (matchesRoute(pathname, prefix) && !permissions[resource]?.includes(action)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
