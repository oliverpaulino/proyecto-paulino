import type { EstadoEquipo, TipoEquipo } from "@/dtos/equipo.dto";

// Human-readable labels for the enum values (used in selects, badges and stats).
export const TIPO_LABEL: Record<TipoEquipo, string> = {
   EXCAVADORA: "Excavadora",
   RETROEXCAVADORA: "Retroexcavadora",
   BULLDOZER: "Bulldozer",
   GRUA: "Grúa",
   CAMION: "Camión",
   CARGADOR: "Cargador",
   COMPACTADORA: "Compactadora",
   MONTACARGAS: "Montacargas",
   GENERADOR: "Generador",
   OTRO: "Otro",
};

export const ESTADO_LABEL: Record<EstadoEquipo, string> = {
   ACTIVO: "Activo",
   MANTENIMIENTO: "Mantenimiento",
   INACTIVO: "Inactivo",
   BAJA: "Dado de baja",
};

// Badge styling per estado. Keep in sync with ESTADOS_EQUIPO.
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
