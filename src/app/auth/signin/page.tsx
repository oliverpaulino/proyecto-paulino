// app/login/page.tsx
'use client'
import { LoginForm } from "@/components/login-form";
import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    document.title = "Inicio de Sesión";
  }, []);
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#FAF8F5] px-4 py-12">
      {/* Aurora suave de fondo, centrada alrededor del card */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-[70%] -translate-y-[60%] h-[520px] w-[520px] rounded-full bg-[#ff6f59]/15 blur-[120px] animate-blob-a" />
        <div className="absolute top-1/2 left-1/2 translate-x-[20%] -translate-y-[40%] h-[460px] w-[460px] rounded-full bg-[#ffb84d]/15 blur-[110px] animate-blob-b" />
        <div className="absolute top-1/2 left-1/2 -translate-x-[30%] translate-y-[50%] h-[420px] w-[420px] rounded-full bg-[#3ddad7]/12 blur-[100px] animate-blob-c" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <LoginForm
          logo={
            <img
              src="/logo-kissimmee.png"
              alt="Kissimmee"
              className="h-10 mx-auto mb-2"
            />
          }
        />
      </div>
    </div>
  );
}