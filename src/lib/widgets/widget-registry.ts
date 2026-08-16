import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
   AlertTriangle, Banknote, CalendarClock, FileSignature, FolderKanban,
   IdCard, Receipt, ShoppingCart, Truck, Users, Wallet,
} from "lucide-react";

import type { Action, Resource } from "@/hooks/permissions.types";
import type { WidgetSize } from "@/stores/useWidgetLayoutStore";

import {
   CuentasPorCobrarWidget, CuentasPorPagarWidget,
   FacturacionSemanalWidget, FlujoMensualWidget,
} from "@/app/dashboard/components/widgets/finanzas-widgets";
import {
   AlertasEquiposWidget, CitasProximasWidget, ConducesSinFirmarWidget,
   DeduccionesPendientesWidget, FlotaWidget, LicenciasPorVencerWidget,
   NominaAbiertaWidget, OrdenesPendientesWidget, ProyectosActivosWidget,
} from "@/app/dashboard/components/widgets/operativo-widgets";

/**
 * Permiso que exige un widget, en el vocabulario LÓGICO de
 * `permissions.types.ts` (no en las claves físicas de `lib/permission.ts`):
 * `RESOURCE_MAP` ya expande `finances` a invoice/account_payable/… y
 * `ACTION_MAP` expande `read` a read/view/list/consult.
 */
export interface WidgetPermission {
   resource: Resource;
   action: Action | Action[];
}

export interface WidgetMeta {
   id: string;
   label: string;
   description: string;
   icon: LucideIcon;
   /** Sin permiso declarado, el widget lo ve cualquiera con sesión. */
   requiredPermissions?: WidgetPermission;
   defaultSize: WidgetSize;
   component: ComponentType;
}

/**
 * Catálogo de widgets del panel.
 *
 * A diferencia de Emporio no hay `requiredFeature` (este proyecto no tiene
 * feature flags) ni chequeo asíncrono: `usePermissions` lee el mapa que ya
 * viene con la sesión, así que filtrar es un `.filter()` síncrono y no hace
 * falta store de permisos, caché ni invalidación.
 *
 * Los ids son contrato: quedan guardados en el layout de cada usuario en
 * localStorage. Renombrar uno hace que ese widget desaparezca del panel de
 * quien ya lo tenía (ver `sanearLayout`), así que se agregan, no se renombran.
 */
export const WIDGET_REGISTRY = {
   // ── Finanzas ───────────────────────────────────────────────────────────
   "cuentas-por-cobrar": {
      id: "cuentas-por-cobrar",
      label: "Cuentas por cobrar",
      description: "Pendiente de cobro y antigüedad de la deuda.",
      icon: Wallet,
      requiredPermissions: { resource: "account_receivable", action: "read" },
      defaultSize: "small",
      component: CuentasPorCobrarWidget,
   },
   "cuentas-por-pagar": {
      id: "cuentas-por-pagar",
      label: "Cuentas por pagar",
      description: "Pendiente de pago y antigüedad de la deuda.",
      icon: Wallet,
      requiredPermissions: { resource: "account_payable", action: "read" },
      defaultSize: "small",
      component: CuentasPorPagarWidget,
   },
   "facturacion-semanal": {
      id: "facturacion-semanal",
      label: "Facturado esta semana",
      description: "Conduces cobrables de los últimos 7 días y su variación.",
      icon: Receipt,
      requiredPermissions: { resource: "finances", action: "read" },
      defaultSize: "small",
      component: FacturacionSemanalWidget,
   },
   "flujo-mensual": {
      id: "flujo-mensual",
      label: "Cobros vs. gastos",
      description: "Comparativa mensual de entradas y gastos.",
      icon: Banknote,
      requiredPermissions: { resource: "finances", action: "read" },
      defaultSize: "large",
      component: FlujoMensualWidget,
   },

   // ── Nómina ─────────────────────────────────────────────────────────────
   "nomina-abierta": {
      id: "nomina-abierta",
      label: "Nómina abierta",
      description: "Ciclos sin pagar y su neto acumulado.",
      icon: Users,
      requiredPermissions: { resource: "payroll", action: "read" },
      defaultSize: "small",
      component: NominaAbiertaWidget,
   },
   "deducciones-pendientes": {
      id: "deducciones-pendientes",
      label: "Deducciones pendientes",
      description: "Deudas de empleados con balance abierto.",
      icon: Users,
      requiredPermissions: { resource: "payroll", action: "read" },
      defaultSize: "small",
      component: DeduccionesPendientesWidget,
   },

   // ── Proyectos ──────────────────────────────────────────────────────────
   // Dos entradas para el mismo listado. La versión con montos exige permiso
   // financiero: un `coordinador` tiene `project` completo pero no puede ver
   // margen. Separar los widgets deja el permiso declarado y auditable, en vez
   // de esconder columnas dentro del componente.
   "proyectos-activos": {
      id: "proyectos-activos",
      label: "Proyectos activos",
      description: "Proyectos en progreso, sin montos.",
      icon: FolderKanban,
      requiredPermissions: { resource: "project", action: "read" },
      defaultSize: "medium",
      component: ProyectosActivosWidget,
   },
   "proyectos-rentabilidad": {
      id: "proyectos-rentabilidad",
      label: "Proyectos y rentabilidad",
      description: "Proyectos activos ordenados por rentabilidad.",
      icon: FolderKanban,
      requiredPermissions: { resource: "finances", action: "read" },
      defaultSize: "medium",
      component: ProyectosRentabilidadWidget,
   },
   "conduces-sin-firmar": {
      id: "conduces-sin-firmar",
      label: "Conduces sin firmar",
      description: "Cobrables trabados por falta de firma.",
      icon: FileSignature,
      requiredPermissions: { resource: "project", action: "read" },
      defaultSize: "small",
      component: ConducesSinFirmarWidget,
   },

   // ── Equipos ────────────────────────────────────────────────────────────
   "flota-estado": {
      id: "flota-estado",
      label: "Estado de la flota",
      description: "Equipos activos, en mantenimiento e inactivos.",
      icon: Truck,
      requiredPermissions: { resource: "machinery", action: "read" },
      defaultSize: "small",
      component: FlotaWidget,
   },
   "alertas-equipos": {
      id: "alertas-equipos",
      label: "Alertas de equipos",
      description: "Equipos sin preventivo, con mantenimiento largo o correctivos repetidos.",
      icon: AlertTriangle,
      requiredPermissions: { resource: "machinery", action: "read" },
      defaultSize: "medium",
      component: AlertasEquiposWidget,
   },

   // ── Otros ──────────────────────────────────────────────────────────────
   "licencias-por-vencer": {
      id: "licencias-por-vencer",
      label: "Licencias por vencer",
      description: "Choferes con licencia vencida o próxima a vencer.",
      icon: IdCard,
      requiredPermissions: { resource: "users", action: "read" },
      defaultSize: "small",
      component: LicenciasPorVencerWidget,
   },
   "ordenes-pendientes": {
      id: "ordenes-pendientes",
      label: "Órdenes por aprobar",
      description: "Órdenes de compra sin aprobación.",
      icon: ShoppingCart,
      requiredPermissions: { resource: "finances", action: "read" },
      defaultSize: "small",
      component: OrdenesPendientesWidget,
   },
   "citas-proximas": {
      id: "citas-proximas",
      label: "Citas de la semana",
      description: "Próximas citas agendadas.",
      icon: CalendarClock,
      requiredPermissions: { resource: "appointment", action: "read" },
      defaultSize: "small",
      component: CitasProximasWidget,
   },
} as const satisfies Record<string, WidgetMeta>;

export type WidgetId = keyof typeof WIDGET_REGISTRY;

export const WIDGET_IDS = Object.keys(WIDGET_REGISTRY) as WidgetId[];

export function getWidget(id: WidgetId): WidgetMeta {
   return WIDGET_REGISTRY[id];
}

export function esWidgetId(id: string): id is WidgetId {
   return id in WIDGET_REGISTRY;
}

/** Variante con montos; el registry no puede pasar props a los componentes. */
function ProyectosRentabilidadWidget() {
   return ProyectosActivosWidget({ conMontos: true });
}
