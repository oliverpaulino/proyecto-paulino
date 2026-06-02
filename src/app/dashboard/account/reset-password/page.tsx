"use client";

import { useState } from "react";
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
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ caracteres",          pass: password.length >= 8 },
    { label: "Letra mayúscula",         pass: /[A-Z]/.test(password) },
    { label: "Letra minúscula",         pass: /[a-z]/.test(password) },
    { label: "Número o símbolo",        pass: /[\d\W]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const bar   = ["bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-emerald-500", "bg-emerald-500"];

  if (!password) return null;

  return (
    <div className="mt-2 grid gap-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? bar[score] : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`flex items-center gap-1 text-[11px] transition-colors ${c.pass ? "text-emerald-600" : "text-muted-foreground"}`}
          >
            {c.pass ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3 opacity-40" />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function DashboardResetPasswordPage() {
  const router = useRouter();
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [saving,   setSaving]   = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8)           { toast.error("Mínimo 8 caracteres");          return; }
    if (next !== confirm)          { toast.error("Las contraseñas no coinciden");  return; }

    setSaving(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword:     next,
      revokeOtherSessions: false,
    });
    setSaving(false);

    if (error) { toast.error(error.message ?? "Error al cambiar contraseña"); return; }

    toast.success("Contraseña actualizada");
    router.push("/dashboard/account");
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <span className="mr-2 h-4 w-px bg-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/account">Mi cuenta</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Cambiar contraseña</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col w-full max-w-md mx-auto px-4 py-6 sm:px-6">

          {/* header */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Cambiar contraseña</h1>
              <p className="text-xs text-muted-foreground">Necesitas tu contraseña actual para continuar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5">
            {/* current */}
            <div className="grid gap-1.5">
              <Label htmlFor="pw-current" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Contraseña actual
              </Label>
              <PasswordInput
                id="pw-current"
                value={current}
                onChange={setCurrent}
                placeholder="Tu contraseña actual"
              />
            </div>

            <Separator className="opacity-40" />

            {/* new */}
            <div className="grid gap-1.5">
              <Label htmlFor="pw-new" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Nueva contraseña
              </Label>
              <PasswordInput
                id="pw-new"
                value={next}
                onChange={setNext}
                placeholder="Mínimo 8 caracteres"
              />
              <PasswordStrength password={next} />
            </div>

            {/* confirm */}
            <div className="grid gap-1.5">
              <Label htmlFor="pw-confirm" className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Confirmar contraseña
              </Label>
              <PasswordInput
                id="pw-confirm"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repite la nueva contraseña"
              />
              {mismatch && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Las contraseñas no coinciden
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/account")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || mismatch || !current || !next || !confirm}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Actualizar contraseña"}
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function Separator({ className }: { className?: string }) {
  return <hr className={`border-border ${className ?? ""}`} />;
}
