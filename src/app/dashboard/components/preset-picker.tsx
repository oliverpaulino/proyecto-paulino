"use client";

import { LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
   DropdownMenu, DropdownMenuContent, DropdownMenuItem,
   DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionPermissions } from "@/hooks/usePermissions";
import { useSession } from "@/lib/auth-client";
import { useWidgetLayoutStore } from "@/stores/useWidgetLayoutStore";
import {
   DASHBOARD_PRESETS, layoutDesdePreset,
} from "@/lib/widgets/dashboard-presets";
import { puedeVerWidget } from "@/lib/widgets/widget-permissions";
import { WIDGET_REGISTRY } from "@/lib/widgets/widget-registry";

/**
 * Selector de vistas por rol.
 *
 * Se listan TODAS las vistas cuyo contenido el usuario pueda ver al menos en
 * parte; aplicar una descarta en silencio lo que no le toca. No se esconde una
 * vista por su nombre: un `coordinador` puede aplicar "Administrador" y recibir
 * el subconjunto que le corresponde, sin un error que no podría resolver.
 */
export function PresetPicker() {
   const { data: session } = useSession();
   const { permissions } = useSessionPermissions();
   const setUserLayout = useWidgetLayoutStore((s) => s.setUserLayout);

   const userId = session?.user?.id ?? null;
   if (!userId) return null;

   const disponibles = DASHBOARD_PRESETS.map((preset) => ({
      preset,
      cantidad: preset.widgets.filter((w) =>
         puedeVerWidget(WIDGET_REGISTRY[w.id], permissions),
      ).length,
   })).filter((p) => p.cantidad > 0);

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
               <LayoutGrid className="size-4" />
               <span className="hidden sm:inline">Vistas</span>
               <span className="sr-only sm:hidden">Vistas predefinidas</span>
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
            <DropdownMenuLabel>Vistas predefinidas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {disponibles.map(({ preset, cantidad }) => (
               <DropdownMenuItem
                  key={preset.id}
                  className="flex flex-col items-start gap-0.5 py-2"
                  onClick={() =>
                     setUserLayout(userId, layoutDesdePreset(preset, permissions))
                  }
               >
                  <span className="flex items-center gap-2 text-sm font-medium">
                     <preset.icon className="size-4" />
                     {preset.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                  <span className="text-[10px] text-muted-foreground">
                     {cantidad} tarjeta{cantidad === 1 ? "" : "s"} disponible{cantidad === 1 ? "" : "s"}
                  </span>
               </DropdownMenuItem>
            ))}
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
