import { NextRequest, NextResponse } from "next/server";

const ADMIN_ONLY_ROUTES = [
  "/dashboard/settings",
  "/dashboard/equipo",
  "/dashboard/limites",
];

const CONTABLE_ROUTES = [
  "/dashboard/contabilidad",
  "/dashboard/nomina",
];

const COORDINADOR_ROUTES = [
  "/dashboard/proyectos",
];

const ROLE_HIERARCHY: Record<string, number> = {
  usuario: 1,
  asistente: 2,
  coordinador: 3,
  contable: 3,
  administrador: 4,
};

function hasMinRole(userRole: string | undefined, minRole: string): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 99);
}

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

async function getSession(request: NextRequest) {
  try {
    const url = new URL("/api/auth/get-session", request.url);
    const res = await fetch(url, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (res.ok) {
      const data = await res.json() as { user?: { role?: string } } | null;
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

  const role = (userSession as { user?: { role?: string } }).user?.role;

  if (matchesRoute(pathname, ADMIN_ONLY_ROUTES) && !hasMinRole(role, "administrador")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (matchesRoute(pathname, CONTABLE_ROUTES) && !hasMinRole(role, "contable")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (matchesRoute(pathname, COORDINADOR_ROUTES) && !hasMinRole(role, "coordinador")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
