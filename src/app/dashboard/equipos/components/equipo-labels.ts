import type { EstadoEquipo } from "@/dtos/equipo.dto";

export const ESTADO_LABEL: Record<EstadoEquipo, string> = {
   ACTIVO: "Activo",
   MANTENIMIENTO: "Mantenimiento",
   INACTIVO: "Inactivo",
   BAJA: "Dado de baja",
};

export const ESTADO_BADGE: Record<EstadoEquipo, string> = {
   ACTIVO:
      "border-green-600/30 bg-green-600/10 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300",
   MANTENIMIENTO:
      "border-brand-yellow/50 bg-brand-yellow/20 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
   INACTIVO:
      "border-border bg-muted text-muted-foreground",
   BAJA:
      "border-brand-red/40 bg-brand-red/10 text-brand-red dark:border-red-800 dark:bg-red-900/30 dark:text-red-300",
};
