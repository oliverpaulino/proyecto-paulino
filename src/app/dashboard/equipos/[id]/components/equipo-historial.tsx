"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEquipoStore } from "@/stores/useEquipoStore";
import { ESTADO_BADGE, ESTADO_LABEL } from "../../components/equipo-labels";

function formatDateTime(value: string | Date): string {
   const d = new Date(value);
   return (
      d.toLocaleDateString("es-DO") +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
   );
}

/**
 * Tarjeta "Historial de estados" del tab General. Se monta solo cuando el
 * usuario entra a ese tab, así que la data se pide en ese momento y no al
 * cargar la página. El fetch va por el store.
 */
export function EquipoHistorial({ equipoId }: { equipoId: string }) {
   const { historialData, historialLoading, historialError, GetEquipoHistorial } = useEquipoStore();
   const [loaded, setLoaded] = useState(false);

   useEffect(() => {
      let active = true;
      GetEquipoHistorial(equipoId).then(() => {
         if (active) setLoaded(true);
      });
      return () => {
         active = false;
      };
   }, [equipoId, GetEquipoHistorial]);

   const loading = historialLoading || !loaded;

   return (
      <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <History className="size-5 text-brand-blue" />
               Historial de estados
            </CardTitle>
            <CardDescription>Cambios de estado registrados para este equipo.</CardDescription>
         </CardHeader>
         <CardContent>
            {loading ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  Cargando historial…
               </div>
            ) : historialError ? (
               <div className="flex items-center justify-center p-8 text-sm text-destructive">
                  {historialError}
               </div>
            ) : historialData.length === 0 ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  Aún no hay cambios de estado registrados.
               </div>
            ) : (
               <ul className="flex flex-col gap-3">
                  {historialData.map((h) => (
                     <li key={h.id} className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                           {h.estado_anterior ? (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[h.estado_anterior]}`}>
                                 {ESTADO_LABEL[h.estado_anterior]}
                              </span>
                           ) : (
                              <span className="text-xs text-muted-foreground">Inicial</span>
                           )}
                           <span className="text-muted-foreground">→</span>
                           <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[h.estado_nuevo]}`}>
                              {ESTADO_LABEL[h.estado_nuevo]}
                           </span>
                           {h.nota && <span className="text-xs text-muted-foreground">— {h.nota}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                           {h.changed_by_name ?? "Sistema"} · {formatDateTime(h.created_at)}
                        </div>
                     </li>
                  ))}
               </ul>
            )}
         </CardContent>
      </Card>
   );
}
