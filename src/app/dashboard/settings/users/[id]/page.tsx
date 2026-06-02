"use client";

import { useEffect, useState, use } from "react";
import { authClient } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLES = ["usuario", "asistente", "coordinador", "contable", "administrador"] as const;
type Role = (typeof ROLES)[number];

const ROLE_META: Record<string, { color: string; desc: string }> = {
  administrador: { color: "border-amber-500/40 bg-amber-500/10 text-amber-600",   desc: "Acceso total al sistema" },
  coordinador:   { color: "border-blue-500/40 bg-blue-500/10 text-blue-600",       desc: "Gestión de proyectos y tareas" },
  contable:      { color: "border-violet-500/40 bg-violet-500/10 text-violet-600", desc: "Contabilidad, nómina y pagos" },
  asistente:     { color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600", desc: "Tareas, citas y recepción" },
  usuario:       { color: "border-border bg-muted text-muted-foreground",           desc: "Solo lectura y consultas" },
};

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [user,       setUser]       = useState<UserRecord | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [name,       setName]       = useState("");
  const [role,       setRole]       = useState<Role>("usuario");
  const [saving,     setSaving]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (authClient.admin as any).listUsers({ query: { limit: 500 } });
      const found = (data?.users as UserRecord[] | undefined)?.find((u) => u.id === id) ?? null;
      if (found) {
        setUser(found);
        setName(found.name);
        setRole((found.role as Role) ?? "usuario");
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [roleRes, nameRes] = await Promise.all([
      (authClient.admin as any).setRole({ userId: user.id, role }),
      (authClient.admin as any).setUserInfo
        ? (authClient.admin as any).setUserInfo({ userId: user.id, name })
        : Promise.resolve({ error: null }),
    ]);

    setSaving(false);

    if (roleRes?.error) { toast.error(roleRes.error.message ?? "Error al guardar rol"); return; }
    toast.success("Usuario actualizado");
    setUser((u) => u ? { ...u, name, role } : u);
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

  const meta = ROLE_META[role] ?? ROLE_META.usuario;

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!user) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Usuario no encontrado</p>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/settings/users")}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Volver
            </Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* header */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <span className="mr-2 h-4 w-px bg-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/settings/users">Usuarios</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="max-w-[140px] truncate">{user.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col w-full max-w-xl mx-auto px-4 py-6 sm:px-6 gap-0">

          {/* identity */}
          <div className="mb-8 flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold tracking-tight select-none">
              {initials}
              {user.banned && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  <Ban className="h-3 w-3" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Creado {new Date(user.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            {user.banned && (
              <span className="shrink-0 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                Bloqueado
              </span>
            )}
          </div>

          {/* form */}
          <form onSubmit={handleSave} className="grid gap-6">

            <SectionHeader icon={User} title="Datos del usuario" />
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="u-name" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Nombre
                </Label>
                <Input
                  id="u-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="u-email" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Correo electrónico
                </Label>
                <Input id="u-email" value={user.email} disabled className="opacity-60 cursor-not-allowed" />
                <p className="text-[11px] text-muted-foreground">El correo no es editable desde este panel.</p>
              </div>
            </div>

            <Separator />

            <SectionHeader icon={ShieldCheck} title="Rol y permisos" />
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

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar cambios"}
              </Button>
            </div>
          </form>

          <Separator className="my-6" />

          {/* danger zone */}
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
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
              </Button>
            </div>
          </div>

        </div>
      </SidebarInset>

      {/* delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar a {user.name}?
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
