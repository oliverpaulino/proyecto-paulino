"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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
import { User, Mail, ShieldCheck, Loader2, ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  administrador: { label: "Administrador", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  coordinador: { label: "Coordinador", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  contable: { label: "Contable", color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  asistente: { label: "Asistente", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  usuario: { label: "Usuario", color: "bg-muted text-muted-foreground border-border" },
};

export default function AccountPage() {
  const { data: session, refetch } = useSession();
  const user = session?.user;

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  const role = (user as { role?: string } | undefined)?.role ?? "usuario";
  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.usuario;
  const initials = (user?.name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    const { error } = await authClient.updateUser({ name, image: undefined });
    setSaving(false);
    if (error) { toast.error(error.message ?? "Error al guardar"); return; }
    await refetch?.();
    toast.success("Perfil actualizado");
  };

  return (
    <>

      {/* // <SidebarProvider> */}
      {/* <AppSidebar /> */}
      {/* // <SidebarInset> */}
      {/* ── header ── */}
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Inicio</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Mi cuenta</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-0 w-full max-w-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        {/* ── identity card ── */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold tracking-tight select-none">
            {initials}
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold leading-tight truncate">{user?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email ?? "—"}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-0.5 text-xs font-medium ${roleInfo.color}`}>
            {roleInfo.label}
          </span>
        </div>

        {/* ── section: info ── */}
        <Section icon={User} title="Información personal">
          <form onSubmit={handleSave} className="grid gap-5">
            <Field label="Nombre completo" htmlFor="acc-name">
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                required
              />
            </Field>
            <Field label="Correo electrónico" htmlFor="acc-email">
              <div className="relative">
                <Input
                  id="acc-email"
                  type="email"
                  value={email}
                  disabled
                  className="pr-9 cursor-not-allowed opacity-60"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">El correo no se puede cambiar desde aquí.</p>
            </Field>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Section>

        <DividerLine />

        {/* ── section: role ── */}
        <Section icon={ShieldCheck} title="Rol y permisos">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
            <p className="text-sm text-muted-foreground">
              Asignado por un administrador. Contacta al admin para cambiar tu rol.
            </p>
          </div>
        </Section>

        <DividerLine />

        {/* ── section: security ── */}
        <Section icon={KeyRound} title="Seguridad">
          <Link
            href="/dashboard/account/reset-password"
            className="group flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60"
          >
            <div>
              <p className="text-sm font-medium">Cambiar contraseña</p>
              <p className="text-xs text-muted-foreground">Actualiza tu contraseña de acceso</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Section>

      </div>
      {/* // </SidebarInset> */}
      {/* // </SidebarProvider> */}
    </>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function DividerLine() {
  return <Separator className="opacity-50" />;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}
