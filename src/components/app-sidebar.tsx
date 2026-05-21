"use client"

import * as React from "react"
import {
  AudioWaveform,
  Building2,
  Command,
  HardHat,
  Settings2,
  Users,
  Calendar,
  Truck,
  Calculator,
  Wrench,
  Package,
  ClipboardList
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Paulino",
    email: "paulino@kissimmee.com",
    avatar: "",
  },
  teams: [
    {
      name: "Constructora Kissimmee",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Constructora Bésame",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Proyectos",
      url: "/dashboard/proyectos",
      icon: Building2,
      items: [
        {
          title: "Cotizaciones",
          url: "/dashboard/proyectos/cotizaciones",
        },
        {
          title: "Gastos",
          url: "/dashboard/proyectos/gastos",
        },
        {
          title: "Tareas",
          url: "/dashboard/proyectos/tareas",
        },
      ],
    },
    {
      title: "Servicios",
      url: "/dashboard/servicios",
      icon: ClipboardList,
    },
    {
      title: "Citas",
      url: "/dashboard/citas",
      icon: Calendar,
    },
    {
      title: "Clientes",
      url: "/dashboard/clientes",
      icon: Users,
    },
    {
      title: "Proveedores",
      url: "/dashboard/proveedores",
      icon: Truck,
      items: [
        {
          title: "Catálogo de Proveedores",
          url: "/dashboard/proveedores/catalogo",
        },
        {
          title: "Compras",
          url: "/dashboard/proveedores/compras",
        },
      ],
    },
    {
      title: "Empleados",
      url: "/dashboard/empleados",
      icon: HardHat,
      items: [
        {
          title: "Amonestaciones",
          url: "/dashboard/empleados/amonestaciones",
        },
      ],
    },
    {
      title: "Contabilidad",
      url: "/dashboard/contabilidad",
      icon: Calculator,
      items: [
        {
          title: "Ventas",
          url: "/dashboard/contabilidad/ventas",
        },
        {
          title: "Pagos",
          url: "/dashboard/contabilidad/pagos",
        },
        {
          title: "Nómina",
          url: "/dashboard/contabilidad/nomina",
        },
      ],
    },
    {
      title: "Equipos",
      url: "/dashboard/equipos",
      icon: Wrench,
      items: [
        {
          title: "Mantenimientos",
          url: "/dashboard/equipos/mantenimientos",
        },
      ],
    },
    {
      title: "Inventario",
      url: "/dashboard/inventario",
      icon: Package,
    },
    {
      title: "Configuración",
      url: "/dashboard/configuracion",
      icon: Settings2,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}