"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2Icon, ArrowLeftIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import Image from "next/image";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (searchParams.get("error") === "INVALID_TOKEN") {
      setTokenError(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      toast.error("Token inválido o expirado");
      return;
    }

    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Error al restablecer la contraseña");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/auth/signin"), 2500);
  };

  if (tokenError) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircleIcon className="h-7 w-7 text-destructive" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Enlace inválido</h1>
          <p className="text-muted-foreground text-sm">
            El enlace expiró o ya fue utilizado. Solicita uno nuevo.
          </p>
        </div>
        <Link
          href="/auth/forgot-password"
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <CheckCircleIcon className="h-7 w-7 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Contraseña actualizada</h1>
          <p className="text-muted-foreground text-sm">
            Redirigiendo al inicio de sesión…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Nueva contraseña</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Ingresa y confirma tu nueva contraseña.
        </p>
      </div>

      <div className="grid gap-3">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input
          id="confirm"
          type="password"
          placeholder="Repite la contraseña"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2Icon className="animate-spin" /> : "Guardar contraseña"}
      </Button>

      <Link
        href="/auth/signin"
        className="flex items-center justify-center gap-1 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeftIcon className="h-3 w-3" />
        Volver al inicio de sesión
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          {/* <Link href="/auth/signin" className="flex items-center gap-2 font-medium">
           
          </Link> */}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Suspense fallback={<Loader2Icon className="animate-spin mx-auto" />}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image width={96} // Explicitly set width (24 * 4 for Tailwind)
          height={96}
          src="/fingers.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
