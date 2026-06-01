"use client"

import * as React from "react"
import {
  AudioWaveform,
  Building2,
  HardHat,
  Settings2,
  SquareTerminal,
  Users,
  Calendar,
  Truck,
  Calculator,
  Wrench,
  Package,
  ClipboardList,
  FileText,
  DollarSign,
  CheckSquare,
  ShoppingCart,
  CreditCard,
  Banknote,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSession } from "@/lib/auth-client"

const ROLE_HIERARCHY: Record<string, number> = {
  usuario: 1,
  asistente: 2,
  coordinador: 3,
  contable: 3,
  administrador: 4,
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const roleLevel = ROLE_HIERARCHY[role ?? ""] ?? 0
  const isAdmin = roleLevel >= ROLE_HIERARCHY["administrador"]

  const settingsItems = [
    { id: "settings-general", title: "General", url: "/dashboard/settings" },
    { id: "settings-equipo", title: "Equipo", url: "/dashboard/equipo" },
    ...(isAdmin ? [{ id: "settings-usuarios", title: "Usuarios", url: "/dashboard/settings/users" }] : []),
    { id: "settings-limites", title: "Límites", url: "/dashboard/limites" },
  ]

  const teams = [
    {
      name: "Constructora Kissimmee",
      logo: AudioWaveform,
      plan: "Startup",
    },
  ]

  const navMain = [
    {
      id: "configuracion",
      title: "Configuración",
      url: "#",
      icon: Settings2,
      items: settingsItems,
    },
    {
      id: "panel",
      title: "Panel",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
      items: [],
    },
    {
      id: "proyectos",
      title: "Proyectos",
      url: "/dashboard/proyectos",
      icon: Building2,
      items: [],
    },
    {
      id: "proyectos-cotizaciones",
      title: "Cotizaciones",
      url: "/dashboard/proyectos/cotizaciones",
      icon: FileText,
      items: [],
    },
    {
      id: "proyectos-gastos",
      title: "Gastos",
      url: "/dashboard/proyectos/gastos",
      icon: DollarSign,
      items: [],
    },
    {
      id: "proyectos-tareas",
      title: "Tareas",
      url: "/dashboard/proyectos/tareas",
      icon: CheckSquare,
      items: [],
    },
    {
      id: "servicios",
      title: "Servicios",
      url: "/dashboard/servicios",
      icon: ClipboardList,
      items: [],
    },
    {
      id: "citas",
      title: "Citas",
      url: "/dashboard/citas",
      icon: Calendar,
      items: [],
    },
    {
      id: "clientes",
      title: "Clientes",
      url: "/dashboard/clientes",
      icon: Users,
      items: [],
    },
    {
      id: "proveedores",
      title: "Proveedores",
      url: "/dashboard/proveedores",
      icon: Truck,
      items: [],
    },
    {
      id: "proveedores-compras",
      title: "Compras",
      url: "/dashboard/proveedores/compras",
      icon: ShoppingCart,
      items: [],
    },
    {
      id: "empleados",
      title: "Empleados",
      url: "#",
      icon: HardHat,
      items: [
        {
          id: "empleados-empleados",
          title: "Empleados",
          url: "/dashboard/empleados",
        },
        {
          id: "empleados-conceptos",
          title: "Conceptos",
          url: "/dashboard/empleados/conceptos",
        },
      ],
    },
    {
      id: "contabilidad",
      title: "Contabilidad",
      url: "/dashboard/contabilidad",
      icon: Calculator,
      items: [],
    },
    {
      id: "contabilidad-ventas",
      title: "Ventas",
      url: "/dashboard/contabilidad/ventas",
      icon: Banknote,
      items: [],
    },
    {
      id: "contabilidad-pagos",
      title: "Pagos",
      url: "/dashboard/contabilidad/pagos",
      icon: CreditCard,
      items: [],
    },
    {
      id: "contabilidad-nomina",
      title: "Nómina",
      url: "/dashboard/contabilidad/nomina",
      icon: DollarSign,
      items: [],
    },
    {
      id: "equipos",
      title: "Equipos",
      url: "#",
      icon: Wrench,
      items: [
        {
          id: "equipos-equipos",
          title: "Equipos",
          url: "/dashboard/equipos",
        },
        {
          id: "equipos-mantenimientos",
          title: "Mantenimientos",
          url: "/dashboard/equipos/mantenimientos",
        },
      ],
    },
    {
      id: "inventario",
      title: "Inventario",
      url: "/dashboard/inventario",
      icon: Package,
      items: [],
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
