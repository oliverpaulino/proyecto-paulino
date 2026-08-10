import type { LucideIcon } from "lucide-react";
import { ClipboardList, Crown, HardHat, Landmark, User } from "lucide-react";

import type { WidgetLayout, WidgetSize } from "@/stores/useWidgetLayoutStore";
import { WIDGET_REGISTRY, type WidgetId } from "./widget-registry";
import { puedeVerWidget, type PermissionMap } from "./widget-permissions";

export interface PresetWidget {
   id: WidgetId;
   size: WidgetSize;
}

export interface DashboardPreset {
   id: string;
   label: string;
   description: string;
   icon: LucideIcon;
   widgets: PresetWidget[];
}

/**
 * Vistas por rol.
 *
 * Son PUNTOS DE PARTIDA, no jaulas: al aplicar una, el usuario queda libre de
 * reordenar, redimensionar y esconder. Y son sugerencias, no seguridad — lo
 * que el usuario no puede ver se cae al aplicar el preset (`layoutDesdePreset`)
 * y el backend igual niega el dato.
 *
 * Los nombres siguen los roles reales de `src/lib/permission.ts`.
 */
export const DASHBOARD_PRESETS: DashboardPreset[] = [
   {
      id: "administrador",
      label: "Administrador",
      description: "Visión completa: dinero, nómina, proyectos y flota.",
      icon: Crown,
      widgets: [
         { id: "flujo-mensual", size: "large" },
         { id: "cuentas-por-cobrar", size: "small" },
         { id: "cuentas-por-pagar", size: "small" },
         { id: "nomina-abierta", size: "small" },
         { id: "proyectos-rentabilidad", size: "medium" },
         { id: "alertas-equipos", size: "medium" },
      ],
   },
   {
      id: "contable",
      label: "Contable",
      description: "Cobros, pagos, nómina y aprobaciones.",
      icon: Landmark,
      widgets: [
         { id: "cuentas-por-cobrar", size: "small" },
         { id: "cuentas-por-pagar", size: "small" },
         { id: "facturacion-semanal", size: "small" },
         { id: "nomina-abierta", size: "small" },
         { id: "deducciones-pendientes", size: "small" },
         { id: "ordenes-pendientes", size: "small" },
      ],
   },
   {
      id: "coordinador",
      label: "Coordinador",
      description: "Operación: flota, proyectos y conduces.",
      icon: HardHat,
      widgets: [
         { id: "flota-estado", size: "small" },
         { id: "alertas-equipos", size: "medium" },
         // Sin montos: `coordinador` no tiene ningún recurso financiero.
         { id: "proyectos-activos", size: "medium" },
         { id: "conduces-sin-firmar", size: "small" },
         { id: "licencias-por-vencer", size: "small" },
      ],
   },
   {
      id: "asistente",
      label: "Asistente",
      description: "Agenda, proyectos y pendientes del día.",
      icon: ClipboardList,
      widgets: [
         { id: "citas-proximas", size: "small" },
         { id: "proyectos-activos", size: "medium" },
         { id: "conduces-sin-firmar", size: "small" },
      ],
   },
   {
      id: "usuario",
      label: "Básico",
      description: "Lo mínimo: agenda y proyectos.",
      icon: User,
      widgets: [
         { id: "citas-proximas", size: "small" },
         { id: "proyectos-activos", size: "medium" },
      ],
   },
];

/**
 * Convierte un preset en layout, descartando en silencio lo que el usuario no
 * puede ver.
 *
 * El descarte silencioso es deliberado: si un `coordinador` aplica la vista de
 * Administrador, recibe el subconjunto que le toca en vez de un error. Un
 * preset es una sugerencia; el permiso es la verdad.
 */
export function layoutDesdePreset(
   preset: DashboardPreset,
   permissions: PermissionMap | null,
): WidgetLayout[] {
   return preset.widgets
      .filter((w) => puedeVerWidget(WIDGET_REGISTRY[w.id], permissions))
      .map((w, i) => ({ id: w.id, position: i, size: w.size, visible: true }));
}

/**
 * Preset por defecto para un rol. Cae a "usuario" ante un rol desconocido
 * (p.ej. uno creado en la tabla `app_role`): el filtro por permisos se encarga
 * de dejar solo lo que corresponda.
 */
export function presetParaRol(rol: string | null | undefined): DashboardPreset {
   const hit = DASHBOARD_PRESETS.find((p) => p.id === (rol ?? "").toLowerCase());
   return hit ?? DASHBOARD_PRESETS[DASHBOARD_PRESETS.length - 1];
}
