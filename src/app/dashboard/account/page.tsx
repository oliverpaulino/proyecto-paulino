"use client"
import { useSession } from "@/lib/auth-client";
import {
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
import MyAccount from "./components/myAccount";
import type { Metadata } from "next";
import { useEffect } from "react";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  administrador: { label: "Administrador", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  coordinador: { label: "Coordinador", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  contable: { label: "Contable", color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  asistente: { label: "Asistente", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  usuario: { label: "Usuario", color: "bg-muted text-muted-foreground border-border" },
};

export default function AccountPage() {

  useEffect(() => {
    document.title = "Mi Cuenta"
  }, [])
  return (
    <>
      <MyAccount />
    </>
  )
}