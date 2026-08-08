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
  User2,
  Bell,
} from "lucide-react"

import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NameIcon } from "@/components/name-icon"
import { NAV_SHORTCUTS } from "@/lib/nav-shortcuts"
import { useNavShortcuts } from "@/hooks/useNavShortcuts"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSession } from "@/lib/auth-client"
import { useNotificationStore } from "@/stores/useNotificationStore"
import { usePermissions } from "@/hooks/usePermissions"

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
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  // Permiso real, no la escala de roles: los roles creados en la base no
  // aparecen en ROLE_HIERARCHY y quedarían en nivel 0.
  const { canPerform: puedeVerNomina } = usePermissions({
    resource: "payroll",
    action: "read",
  })

  const contactos = [
    {
      id: "clientes",
      title: "Clientes",
      url: "/dashboard/clientes",
      icon: User2,
      items: [],
    },
    {
      id: "proveedores",
      title: "Proveedores",
      url: "/dashboard/proveedores",
      icon: Truck,
      items: [],
    },
  ]

  const settingsItems = [
    { id: "settings-general", title: "General", url: "/dashboard/settings" },
    { id: "settings-unidades", title: "Unidades", url: "/dashboard/unidades" },
    { id: "settings-vinculos", title: "Vínculos", url: "/dashboard/user-employee-link" },
    ...(isAdmin ? [{ id: "settings-usuarios", title: "Usuarios", url: "/dashboard/settings/users" }] : []),
    ...(isAdmin ? [{ id: "settings-roles", title: "Roles y Permisos", url: "/dashboard/settings/roles" }] : []),
  ]

  const navMain = [
    {
      id: "panel",
      title: "Panel Principal",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
      items: [],
    },
    {
      id: "notificaciones",
      title: "Notificaciones",
      url: "/dashboard/notificaciones",
      icon: Bell,
      badge: unreadCount > 0 ? (unreadCount > 9 ? "+9" : String(unreadCount)) : undefined,
      items: [],
    },
    {
      id: "operaciones",
      title: "Operaciones",
      url: "#",
      icon: Building2,
      items: [
        { id: "op-proyectos", title: "Proyectos", url: "/dashboard/proyectos" },
        { id: "op-conduces", title: "Conduces", url: "/dashboard/conduces" },
        { id: "op-equipos", title: "Equipos", url: "/dashboard/equipos" },
        { id: "op-mantenimientos", title: "Mantenimientos", url: "/dashboard/mantenimientos" },

      ],
    },
    {
      id: "finanzas",
      title: "Control de Presupuesto",
      url: "#",
      icon: Calculator,
      items: [
        { id: "fin-cotizaciones", title: "Cotizaciones", url: "/dashboard/cotizaciones" },
        { id: "fin-compras", title: "Compras", url: "/dashboard/compras" },
        ...(isAdmin ? [{ id: "fin-aprobadores", title: "Firmantes de Compras", url: "/dashboard/compras/aprobadores" }] : []),
        ...(isAdmin ? [{ id: "fin-compras-eliminadas", title: "Compras eliminadas", url: "/dashboard/compras/eliminadas" }] : []),
        { id: "fin-cuentas-por-pagar", title: "Cuentas por Pagar", url: "/dashboard/cuentas-por-pagar" },
        { id: "fin-gastos", title: "Gastos", url: "/dashboard/gastos" },
        { id: "fin-gastos-anulados", title: "Gastos anulados", url: "/dashboard/gastos/anulados" },
        { id: "fin-categorias-gastos", title: "Categorías de Gastos", url: "/dashboard/categorias-gastos" },
        { id: "fin-costos", title: "Costos", url: "/dashboard/costos" },
        { id: "fin-costos-anulados", title: "Costos anulados", url: "/dashboard/costos/anulados" },
        { id: "fin-deducciones", title: "Deducciones", url: "/dashboard/deducciones" },
        { id: "fin-deducciones-anuladas", title: "Deducciones anuladas", url: "/dashboard/deducciones/anuladas" },
        { id: "fin-pagos", title: "Pagos", url: "/dashboard/pagos" },
        { id: "fin-pagos-anulados", title: "Pagos anulados", url: "/dashboard/pagos/anulados" },

      ],
    },
    {
      id: "personal",
      title: "Personal",
      url: "#",
      icon: HardHat,
      items: [
        { id: "rh-empleados", title: "Empleados", url: "/dashboard/empleados" },
        /*
           Se oculta sin permiso en vez de mostrarlo y que el middleware
           rebote al dashboard: un link que siempre falla es peor que no
           tenerlo. Usa el permiso real (`payroll`), no la escala de roles de
           arriba, que da nivel 0 a los roles creados en la base.
        */
        ...(puedeVerNomina
          ? [{ id: "rh-nomina", title: "Nómina", url: "/dashboard/nomina" }]
          : []),
      ],
    },
    {
      id: "directorio",
      title: "Directorio",
      url: "#",
      icon: Users,
      items: [
        { id: "dir-clientes", title: "Clientes", url: "/dashboard/clientes" },
        { id: "dir-proveedores", title: "Proveedores", url: "/dashboard/proveedores" },
      ],
    },
    {
      id: "configuracion",
      title: "Configuración",
      url: "#",
      icon: Settings2,
      items: settingsItems,
    },
  ]

  // Cuelga de cada item su atajo (si tiene) para que el sidebar pinte las
  // teclas. Sale de la misma tabla que usa `useNavShortcuts` para registrarlos,
  // así lo que se muestra y lo que funciona no pueden divergir.
  const withShortcuts = React.useMemo(() => {
    const decorate = (list: NavItem[]): NavItem[] =>
      list.map((item) => ({
        ...item,
        shortcut: NAV_SHORTCUTS[item.id],
        items: item.items?.length ? decorate(item.items) : item.items,
      }))
    return decorate(navMain)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, puedeVerNomina, unreadCount])

  useNavShortcuts(withShortcuts)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NameIcon />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={withShortcuts} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
