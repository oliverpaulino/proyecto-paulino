"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { useWidgetLayoutStore } from "@/stores/useWidgetLayoutStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { DashboardGrid } from "./components/dashboard-grid";
import { PresetPicker } from "./components/preset-picker";

export default function Page() {
   const [editando, setEditando] = useState(false);
   const { data: session } = useSession();
   const resetUserLayout = useWidgetLayoutStore((s) => s.resetUserLayout);
   const invalidar = useDashboardStore((s) => s.invalidar);

   useEffect(() => {
      document.title = "Panel Principal";
   }, []);

   // Al salir de edición se refrescan los datos: el usuario pudo haber agregado
   // tarjetas cuyo recurso nunca se pidió en esta sesión.
   useEffect(() => {
      if (!editando) return;
      return () => { void invalidar(); };
   }, [editando, invalidar]);

   const userId = session?.user?.id ?? null;
   const nombre = session?.user?.name?.split(" ")[0] ?? null;

   return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
               <h1 className="text-xl font-semibold tracking-tight">
                  {nombre ? `Hola, ${nombre}` : "Panel principal"}
               </h1>
               <p className="text-sm text-muted-foreground">
                  {editando
                     ? "Arrastra para reordenar, cambia el tamaño u oculta tarjetas."
                     : "Resumen de la operación."}
               </p>
            </div>

            <div className="flex items-center gap-2">
               {editando ? (
                  <>
                     <PresetPicker />
                     <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => userId && resetUserLayout(userId)}
                     >
                        <RotateCcw className="size-4" />
                        <span className="hidden sm:inline">Restablecer</span>
                        <span className="sr-only sm:hidden">Restablecer vista</span>
                     </Button>
                     <Button size="sm" className="gap-2" onClick={() => setEditando(false)}>
                        <Check className="size-4" />
                        Listo
                     </Button>
                  </>
               ) : (
                  <Button
                     variant="outline"
                     size="sm"
                     className="gap-2"
                     onClick={() => setEditando(true)}
                  >
                      <Settings2 className="size-4" />
                      <span className="hidden sm:inline">Personalizar</span>
                      <span className="sr-only sm:hidden">Personalizar panel</span>
                  </Button>
               )}
            </div>
         </div>

         <DashboardGrid editando={editando} />
      </div>
   );
}
