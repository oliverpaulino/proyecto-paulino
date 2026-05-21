"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2Icon, ArrowLeftIcon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Ingresa tu correo electrónico");
      return;
    }
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Error al enviar el correo");
      return;
    }
    setSent(true);
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {sent ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <MailCheckIcon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold">Revisa tu correo</h1>
                  <p className="text-muted-foreground text-sm">
                    Enviamos un enlace a <strong>{email}</strong>. Expira en 1 hora.
                  </p>
                </div>
                <Link
                  href="/auth/signin"
                  className="mt-2 flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  <ArrowLeftIcon className="h-3 w-3" />
                  Volver al inicio de sesión
                </Link>
              </div>
            ) : (
              <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
                  <p className="text-muted-foreground text-sm text-balance">
                    Ingresa tu correo y te enviamos un enlace para restablecerla.
                  </p>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    "Enviar enlace"
                  )}
                </Button>

                <Link
                  href="/auth/signin"
                  className="flex items-center justify-center gap-1 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  <ArrowLeftIcon className="h-3 w-3" />
                  Volver al inicio de sesión
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="bg-muted relative hidden lg:block">
        <img
          src="/fingers.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
