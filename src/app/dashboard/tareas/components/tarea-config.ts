import { Circle, Timer, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { EstadoTarea } from "@/dtos/tarea.dto";

export type EstadoConfig = {
   estado: EstadoTarea;
   label: string;
   icon: LucideIcon;
   /** Card left-border accent. */
   borderClass: string;
   /** Icon / dot tint. */
   iconClass: string;
   /** Badge background. */
   badgeClass: string;
   /** Kanban column header accent dot. */
   dotClass: string;
};

export const ESTADO_CONFIG: Record<EstadoTarea, EstadoConfig> = {
   PENDIENTE: {
      estado: "PENDIENTE",
      label: "Pendiente",
      icon: Circle,
      borderClass: "border-l-brand-blue",
      iconClass: "text-brand-blue",
      badgeClass:
         "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
      dotClass: "bg-brand-blue",
   },
   EN_PROCESO: {
      estado: "EN_PROCESO",
      label: "En progreso",
      icon: Timer,
      borderClass: "border-l-brand-yellow",
      iconClass: "text-yellow-600 dark:text-yellow-400",
      badgeClass:
         "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
      dotClass: "bg-brand-yellow",
   },
   COMPLETADA: {
      estado: "COMPLETADA",
      label: "Completada",
      icon: CheckCircle2,
      borderClass: "border-l-green-500",
      iconClass: "text-green-600 dark:text-green-400",
      badgeClass:
         "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
      dotClass: "bg-green-500",
   },
   CANCELADA: {
      estado: "CANCELADA",
      label: "Cancelada",
      icon: XCircle,
      borderClass: "border-l-brand-red",
      iconClass: "text-brand-red",
      badgeClass:
         "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
      dotClass: "bg-brand-red",
   },
};

/** Column order for the Kanban board (left → right). */
export const KANBAN_COLUMNS: EstadoConfig[] = [
   ESTADO_CONFIG.PENDIENTE,
   ESTADO_CONFIG.EN_PROCESO,
   ESTADO_CONFIG.COMPLETADA,
   ESTADO_CONFIG.CANCELADA,
];
