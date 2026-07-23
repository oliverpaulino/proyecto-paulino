"use client";

import { useEffect, useState, use } from "react";
import { authClient } from "@/lib/auth-client";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User,
  ShieldCheck,
  Trash2,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Link2,
  Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUserEmployeeLinkStore } from "@/stores/useUserEmployeeLinkStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { SelectBuscadorEmployee } from "@/components/shared/selectBuscadorEmployee";
import { PermissionGuard } from "@/components/permission-guard";
import type { UserEmployeeLink } from "@/dtos/user-employee-link.dto";
import type { Employee } from "@/dtos/employee.dto";

const ROLES = ["usuario", "asistente", "coordinador", "contable", "administrador"] as const;
type Role = (typeof ROLES)[number];

const ROLE_META: Record<string, { color: string; desc: string }> = {
  administrador: { color: "border-red-500/40 bg-red-500/10 text-red-600",   desc: "Acceso total al sistema" },
  coordinador:   { color: "border-blue-500/40 bg-blue-500/10 text-blue-600",       desc: "Gestión de proyectos y tareas" },
  contable:      { color: "border-violet-500/40 bg-violet-500/10 text-violet-600", desc: "Contabilidad, nómina y pagos" },
  asistente:     { color: "border-amber-500/40 bg-amber-500/10 text-amber-600", desc: "Tareas, citas y recepción" },
  usuario:       { color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",     desc: "Solo lectura y consultas" },
};

interface UserRecord {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
  updatedAt?: Date;
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>("usuario");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { GetLinksByUserId, CreateLink, DeleteLink } = useUserEmployeeLinkStore();
  const { GetLinkedEmployeesByUserId } = useEmployeeStore();
  
  const [userLinks, setUserLinks] = useState<UserEmployeeLink[]>([]);
  const [linkedEmployees, setLinkedEmployees] = useState<Employee[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  // Estados para el modal de eliminación de vínculo
  const [linkToDelete, setLinkToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingLink, setDeletingLink] = useState(false);

  const fetchLinks = async (userId: string) => {
    setLoadingLinks(true);
    try {
      const [links, employees] = await Promise.all([
        GetLinksByUserId(userId),
        GetLinkedEmployeesByUserId(userId)
      ]);
      setUserLinks(links || []);
      setLinkedEmployees(employees || []);
    } catch (error) {
      toast.error("Error al cargar vínculos de empleados");
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (authClient.admin as any).listUsers({ query: { limit: 500 } });
      const found = (data?.users as UserRecord[] | undefined)?.find((u) => u.id === id) ?? null;
      if (found) {
        setUser(found);
        setRole((found.role as Role) ?? "usuario");
        await fetchLinks(found.id);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (authClient.admin as any).setRole({ userId: user.id, role });

    setSaving(false);

    if (error) { 
      toast.error(error.message ?? "Error al guardar rol"); 
      return; 
    }
    
    toast.success("Rol del usuario actualizado");
    setUser((u) => u ? { ...u, role } : u);
  };

  const handleBanToggle = async () => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = authClient.admin as any;
    if (user.banned) {
      const { error } = await admin.unbanUser({ userId: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Usuario desbloqueado");
      setUser((u) => u ? { ...u, banned: false } : u);
    } else {
      const { error } = await admin.banUser({ userId: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Usuario bloqueado");
      setUser((u) => u ? { ...u, banned: true } : u);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (authClient.admin as any).removeUser({ userId: user.id });
    setDeleting(false);
    if (error) { toast.error(error.message ?? "Error al eliminar"); return; }
    toast.success("Usuario eliminado");
    router.push("/dashboard/settings/users");
  };

  const handleCreateLink = async () => {
    if (!user || !selectedEmployeeId) return;
    setLinking(true);
    const result = await CreateLink({ user_id: user.id, empleado_id: selectedEmployeeId });
    setLinking(false);

    if (result instanceof Error) {
      toast.error(result.message);
    } else {
      toast.success("Empleado vinculado exitosamente");
      setLinkDialogOpen(false);
      setSelectedEmployeeId(null);
      await fetchLinks(user.id);
    }
  };

  const confirmDeleteLink = async () => {
    if (!user || !linkToDelete) return;
    setDeletingLink(true);
    const result = await DeleteLink(linkToDelete.id);
    setDeletingLink(false);

    if (result instanceof Error) {
      toast.error(result.message);
    } else {
      toast.success("Vínculo eliminado");
      setLinkToDelete(null);
      await fetchLinks(user.id);
    }
  };

  const meta = ROLE_META[role] ?? ROLE_META.usuario;

  if (loading) {
    return (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
    );
  }

  if (!user) {
    return (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Usuario no encontrado</p>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/settings/users")}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Volver
            </Button>
          </div>
    );
  }

  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <PermissionGuard resource="user" action="read" mode="page">
    <SidebarProvider>
      <SidebarInset>
        <div className="flex flex-1 flex-col w-full max-w-xl mx-auto px-4 py-6 sm:px-6 gap-0">
          <div className="mb-8 flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/settings/users")}>
              <ArrowLeft className="size-4" />
            </Button>
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold tracking-tight select-none">
              {user.image ? (
                <img src={user.image} alt={user.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                initials
              )}
              {user.banned && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  <Ban className="h-3 w-3" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 mt-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="h-3 w-3" /> Verificado
                </span>
              )}
            </div>
            {user.banned && (
              <span className="shrink-0 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                Bloqueado
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="grid gap-6">

            <SectionHeader icon={User} title="Datos del usuario" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-1.5 md:col-span-2">
                <Label htmlFor="u-id" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  ID de Usuario
                </Label>
                <Input id="u-id" value={user.id.slice(0, 10).concat("...")} disabled className="opacity-60 cursor-not-allowed font-mono text-xs" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="u-name" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Nombre
                </Label>
                <Input id="u-name" value={user.name} disabled className="opacity-60 cursor-not-allowed" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="u-email" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Correo electrónico
                </Label>
                <Input id="u-email" value={user.email} disabled className="opacity-60 cursor-not-allowed" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="u-created" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Fecha de registro
                </Label>
                <Input 
                  id="u-created" 
                  value={new Date(user.createdAt).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })} 
                  disabled 
                  className="opacity-60 cursor-not-allowed" 
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="u-updated" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Última actualización
                </Label>
                <Input 
                  id="u-updated" 
                  value={user.updatedAt ? new Date(user.updatedAt).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" }) : "N/D"} 
                  disabled 
                  className="opacity-60 cursor-not-allowed" 
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Los datos personales son de solo lectura. El usuario debe modificarlos desde su propia cuenta.
            </p>

            <Separator />

            <div className="flex items-center justify-between">
              <SectionHeader icon={ShieldCheck} title="Rol y permisos" />
              <Button variant="outline" type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar rol"}
              </Button>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {ROLES.map((r) => {
                  const m = ROLE_META[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`group flex flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                        role === r
                          ? `${m.color} ring-2 ring-offset-1 ring-current`
                          : "border-border bg-muted/20 hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium capitalize">
                        {role === r && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {r}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <SectionHeader icon={Link2} title="Empleados Vinculados" />
            <PermissionGuard resource="user" action="create">
            <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Vincular
            </Button>
            </PermissionGuard>
          </div>

          <div className="mt-4 grid gap-2">
            {loadingLinks ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : userLinks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay empleados vinculados a este usuario.
              </div>
            ) : (
              userLinks.map((link) => {
                const emp = linkedEmployees.find(e => e.id === link.empleado_id);
                return (
                  <LinkedEmployeeItem 
                    key={link.id} 
                    link={link} 
                    employee={emp} 
                    onDelete={(id, name) => setLinkToDelete({ id, name })} 
                  />
                );
              })
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-4">
              Recibirás las notificaciones correspondientes a los empleados vinculados.
          </p>

          <Separator className="my-6" />

          <SectionHeader icon={AlertTriangle} title="Zona de peligro" className="text-destructive/70" />
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{user.banned ? "Desbloquear usuario" : "Bloquear usuario"}</p>
                <p className="text-xs text-muted-foreground">
                  {user.banned ? "Restaura el acceso al sistema." : "Impide que inicie sesión sin eliminar sus datos."}
                </p>
              </div>
              <Button
                variant={user.banned ? "outline" : "destructive"}
                size="sm"
                onClick={handleBanToggle}
              >
                {user.banned ? <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Desbloquear</> : <><Ban className="mr-1.5 h-3.5 w-3.5" />Bloquear</>}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-destructive">Eliminar usuario</p>
                <p className="text-xs text-muted-foreground">Acción permanente. No se puede deshacer.</p>
              </div>
              <PermissionGuard resource="user" action="delete">
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
              </Button>
              </PermissionGuard>
            </div>
          </div>

        </div>
      </SidebarInset>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Empleado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ID de Usuario</Label>
              <Input value={user?.id} disabled className="font-mono text-xs opacity-60" />
            </div>
            <div className="grid gap-2">
              <Label>Seleccionar Empleado</Label>
              <SelectBuscadorEmployee 
                onChange={setSelectedEmployeeId} 
                unlinkedOnly={true} 
              />
              <p className="text-[11px] text-muted-foreground">
                Solo se muestran los empleados que no tienen un usuario asignado en el sistema.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)} disabled={linking}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLink} disabled={!selectedEmployeeId || linking}>
              {linking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Vincular"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Eliminar Vínculo */}
      <Dialog open={!!linkToDelete} onOpenChange={(open) => { if (!open) setLinkToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar vínculo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar el vínculo con <strong>{linkToDelete?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkToDelete(null)} disabled={deletingLink}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteLink} disabled={deletingLink}>
              {deletingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {deletingLink ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Eliminar Usuario Completo */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar a {user?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción es permanente. Se borrarán todos los datos del usuario y no podrá recuperarse.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sí, eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
    </PermissionGuard>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
    </div>
  );
}

function Separator({ className }: { className?: string }) {
  return <hr className={`border-border opacity-50 ${className ?? ""}`} />;
}

function LinkedEmployeeItem({ 
  link, 
  employee, 
  onDelete 
}: { 
  link: UserEmployeeLink; 
  employee?: Employee; 
  onDelete: (id: string, name: string) => void 
}) {
  const empName = employee?.nombre || "Cargando o Desconocido...";
  const empRol = employee?.rol || "";

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{empName}</span>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">{link.empleado_id.slice(0, 8)}...</span>
          {empRol && (
            <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm uppercase font-semibold">
              {empRol}
            </span>
          )}
        </div>
      </div>
      <PermissionGuard resource="user" action="delete">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(link.id, empName)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      </PermissionGuard>
    </div>
  );
}