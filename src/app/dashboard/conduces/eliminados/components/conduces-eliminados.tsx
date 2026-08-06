"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, Eye, Truck, HardHat, Trash2 } from "lucide-react";
import { useConduceStore } from "@/stores/useConduceStores";
import type { ConduceDTO } from "@/dtos/conduce.dto";
import { ConduceDetalleDialog } from "../../components/conduce-detalle-dialog";
import { ConduceRestoreDialog } from "./conduce-restore-dialog";

/**
 * Apartado de conduces eliminados (eliminación lógica). Pensado para vivir
 * en su propia ruta, p.ej. /dashboard/conduces/eliminados/page.tsx:
 *
 *   import { ConducesEliminados } from "@/components/.../conduces-eliminados";
 *   export default function Page() { return <ConducesEliminados />; }
 */
export function ConducesEliminados() {
   const { eliminados, totalEliminados, loadingEliminados, GetConducesEliminados, RestoreConduce } =
      useConduceStore();

   const [busqueda, setBusqueda] = useState("");
   const [fechaDesde, setFechaDesde] = useState("");
   const [fechaHasta, setFechaHasta] = useState("");

   const [conduceDetalle, setConduceDetalle] = useState<ConduceDTO | null>(null);
   const [conduceARestaurar, setConduceARestaurar] = useState<ConduceDTO | null>(null);
   const [restaurandoId, setRestaurandoId] = useState<string | null>(null);

   useEffect(() => {
      GetConducesEliminados({
         busqueda: busqueda || undefined,
         fecha_desde: fechaDesde || undefined,
         fecha_hasta: fechaHasta || undefined,
         pageSize: 10,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [busqueda, fechaDesde, fechaHasta]);

   const handleRestaurar = async (id: string) => {
      setRestaurandoId(id);
      try {
         const resultado = await RestoreConduce(id);
         if (resultado instanceof Error) {
            alert(resultado.message);
         }
         // No hace falta refrescar manualmente: RestoreConduce ya quita el
         // conduce de `eliminados` en el store cuando tiene éxito.
      } finally {
         setRestaurandoId(null);
      }
   };

   return (
      <div className="space-y-4">
         <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-4">
            <div className="w-56 space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Buscar (referencia/equipo)</label>
               <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. 00234" />
            </div>
            <div className="w-36 space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Desde</label>
               <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="w-36 space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Hasta</label>
               <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            {(busqueda || fechaDesde || fechaHasta) && (
               <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                     setBusqueda("");
                     setFechaDesde("");
                     setFechaHasta("");
                  }}
               >
                  Limpiar
               </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
               {totalEliminados} conduce{totalEliminados === 1 ? "" : "s"} eliminado{totalEliminados === 1 ? "" : "s"}
            </div>
         </div>

         {loadingEliminados ? (
            <div className="flex items-center justify-center py-12">
               <Loader2 className="size-6 animate-spin text-brand-blue" />
            </div>
         ) : eliminados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground border rounded-xl border-dashed">
               <Trash2 className="size-8 opacity-20" />
               <p className="text-sm">No hay conduces eliminados con estos filtros.</p>
            </div>
         ) : (
            <div className="overflow-x-auto rounded-xl border">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Referencia</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Fecha</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Cliente</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Equipo</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Eliminado por</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Motivo</th>
                        <th className="px-3 py-3" />
                     </tr>
                  </thead>
                  <tbody>
                     {eliminados.map((c) => (
                        <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                           <td className="px-3 py-3">
                              {c.tipo_conduce === "CAMION" ? (
                                 <Badge className="border-0 bg-blue-100 text-blue-800 text-xs gap-1">
                                    <Truck className="size-3" /> Camión
                                 </Badge>
                              ) : (
                                 <Badge className="border-0 bg-orange-100 text-orange-800 text-xs gap-1">
                                    <HardHat className="size-3" /> Equipo
                                 </Badge>
                              )}
                           </td>
                           <td className="px-3 py-3 font-medium">{c.numero_referencia}</td>
                           <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                              {new Date(c.fecha).toLocaleDateString("es-DO")}
                           </td>
                           <td className="px-3 py-3">{c.cliente_nombre ?? "—"}</td>
                           <td className="px-3 py-3">{c.equipo_nombre ?? "—"}</td>
                           <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                              RD$ {c.subtotal.toLocaleString("es-DO")}
                           </td>
                           <td className="px-3 py-3 text-xs">
                              {c.deleted_by_name ?? "—"}
                              {c.deleted_at && (
                                 <div className="text-muted-foreground">
                                    {new Date(c.deleted_at).toLocaleString("es-DO")}
                                 </div>
                              )}
                           </td>
                           <td className="px-3 py-3 text-xs text-muted-foreground max-w-[220px]">
                              {c.deleted_reason ?? "—"}
                           </td>
                           <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1">
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => setConduceDetalle(c)}
                                 >
                                    <Eye className="h-4 w-4" />
                                 </Button>
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-green-700"
                                    disabled={restaurandoId === c.id}
                                    onClick={() => setConduceARestaurar(c)}
                                 >
                                    <RotateCcw className="h-4 w-4" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         <ConduceDetalleDialog
            conduce={conduceDetalle}
            open={!!conduceDetalle}
            onOpenChange={(v) => !v && setConduceDetalle(null)}
         />
         <ConduceRestoreDialog
            conduce={conduceARestaurar}
            open={!!conduceARestaurar}
            onOpenChange={(v) => !v && setConduceARestaurar(null)}
            onConfirm={handleRestaurar}
         />
      </div>
   );
}