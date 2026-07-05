// components/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

type Props = React.ComponentProps<"div"> & {
  logo?: React.ReactNode;
};

export function LoginForm({ className, logo, ...props }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    });

    if (error) {
      setError(error.message ?? "Credenciales incorrectas");
      setLoading(false);
      return;
    }

    router.refresh();
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-white/20 bg-white/70 dark:bg-black/40 backdrop-blur-xl shadow-2xl shadow-black/20 p-8",
        "opacity-0 animate-card-in",
        className
      )}
      {...props}
    >
      {logo && (
        <div className="flex justify-center mb-6 opacity-0 animate-item-in [animation-delay:100ms]">
          {logo}
        </div>
      )}

      <div className="text-center mb-6 opacity-0 animate-item-in [animation-delay:180ms]">
        <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Accede a tu panel de control
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2 opacity-0 animate-item-in [animation-delay:260ms]">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="transition-shadow focus-visible:ring-2 focus-visible:ring-[#ff6f59]/50"
          />
        </div>

        <div className="space-y-2 opacity-0 animate-item-in [animation-delay:340ms]">
          <div className="flex justify-between">
            <Label>Contraseña</Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-muted-foreground hover:text-[#ff6f59] transition-colors"
            >
              ¿Olvidaste?
            </Link>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="transition-shadow focus-visible:ring-2 focus-visible:ring-[#ff6f59]/50"
          />
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded-md text-center animate-shake">
            {error}
          </div>
        )}

        <div className="opacity-0 animate-item-in [animation-delay:420ms]">
          <Button
            className={cn(
              "w-full relative overflow-hidden text-white border-0",
              "bg-gradient-to-r from-[#ff6f59] to-[#ffb84d]",
              "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]",
              "shadow-lg shadow-[#ff6f59]/25 hover:shadow-[#ff6f59]/40"
            )}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm mt-6 text-muted-foreground opacity-0 animate-item-in [animation-delay:500ms]">
        ¿No tienes cuenta?{" "}
        <Link
          href="/auth/signup"
          className="font-medium underline decoration-[#ff6f59]/50 underline-offset-4 hover:decoration-[#ff6f59]"
        >
          Regístrate
        </Link>
      </p>

      <style jsx global>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes itemIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-card-in { animation: cardIn 0.6s ease-out forwards; }
        .animate-item-in { animation: itemIn 0.5s ease-out forwards; }
        .animate-shake { animation: shake 0.3s ease-in-out; }

        @media (prefers-reduced-motion: reduce) {
          .animate-card-in, .animate-item-in, .animate-shake {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}