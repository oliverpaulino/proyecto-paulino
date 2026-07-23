"use client";

import { useCallback, useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  GROUP_ORDER,
  PERMISSION_CATALOG,
  actionLabel,
  resourceLabel,
} from "@/lib/permission-catalog";
import { PermissionGuard } from "@/components/permission-guard";
import { RolePermissionsPdfButton } from "./components/role-permissions-pdf";
import {
  RoleEditorDialog,
  type PermissionMap,
  type RoleRow,
} from "./components/role-editor-dialog";

// Resource -> display group, so a role's granted resources can be shown in the
// same order as the catalog.
const GROUP_BY_RESOURCE = new Map(
  PERMISSION_CATALOG.map((e) => [e.resource, e.group]),
);
const RESOURCE_ORDER = new Map(
  PERMISSION_CATALOG.map((e, i) => [e.resource, i]),
);

/** Build the grouped, ordered permission breakdown for one role. */
function buildBreakdown(permission: PermissionMap) {
  const granted = Object.entries(permission)
    .filter(([, actions]) => (actions?.length ?? 0) > 0)
    .sort(
      ([a], [b]) =>
        (RESOURCE_ORDER.get(a) ?? 999) - (RESOURCE_ORDER.get(b) ?? 999),
    );

  const byGroup = new Map<string, { resource: string; actions: string[] }[]>();
  for (const [resource, actions] of granted) {
    const group = GROUP_BY_RESOURCE.get(resource) ?? "General";
    const list = byGroup.get(group) ?? [];
    list.push({ resource, actions });
    byGroup.set(group, list);
  }
  return byGroup;
}

export default function RolesSettingsPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState<RoleRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roles", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar los roles");
      setRoles(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/roles/${deleting.key}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo eliminar el rol");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setDeleting(null);
    }
  };

  // Guarded on `user`, matching the `requireResourcePermission("user")` the
  // /api/roles endpoints sit behind. The previous `ac` resource is not a
  // declared statement, so it fell through to the accounts-payable
  // permissions and let `contable` open the role editor.
  return (
    <PermissionGuard resource="user" action="read" mode="page">
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/settings">
                  Configuración
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Roles y Permisos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Roles y Permisos
            </h1>
            <p className="text-sm text-muted-foreground">
              Crea y edita los roles del sistema y los permisos que otorga cada
              uno. Exporta el detalle en PDF.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo rol
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((row) => {
              const grantedResources = Object.keys(row.permissions).filter(
                (r) => (row.permissions[r] ?? []).length > 0,
              );
              const totalGranted = Object.values(row.permissions).reduce(
                (s, a) => s + (a?.length ?? 0),
                0,
              );
              const breakdown = buildBreakdown(row.permissions);

              return (
                <Card key={row.key} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {row.label}
                      </CardTitle>
                      {row.isBuiltin && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Predefinido
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {row.description ? `${row.description} · ` : ""}
                      {totalGranted} permiso{totalGranted === 1 ? "" : "s"} ·{" "}
                      {grantedResources.length} recurso
                      {grantedResources.length === 1 ? "" : "s"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-4">
                    {grantedResources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sin permisos asignados.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {GROUP_ORDER.filter((g) => breakdown.has(g)).map(
                          (group) => (
                            <div key={group} className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {group}
                              </p>
                              <div className="space-y-1">
                                {breakdown
                                  .get(group)!
                                  .map(({ resource, actions }) => (
                                    <div
                                      key={resource}
                                      className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm"
                                    >
                                      <span className="font-medium">
                                        {resourceLabel(resource)}:
                                      </span>
                                      <span className="text-muted-foreground">
                                        {actions
                                          .map((a) => actionLabel(a))
                                          .join(", ")}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <RolePermissionsPdfButton
                        roleName={row.label}
                        permission={row.permissions}
                      />
                      {/* The admin role anchors `adminRoles` in auth.ts and is
                          rejected by the API, so it is not editable here. */}
                      {!row.isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(row);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Editar
                        </Button>
                      )}
                      {!row.isBuiltin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <RoleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        role={editing}
        onSaved={load}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el rol &quot;{deleting?.label}&quot;. Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PermissionGuard>
  );
}
