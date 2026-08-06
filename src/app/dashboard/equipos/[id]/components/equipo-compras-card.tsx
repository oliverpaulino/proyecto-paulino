"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEquipoStore } from "@/stores/useEquipoStore";

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function formatDate(value: string | Date): string {
   return new Date(value).toLocaleDateString("es-DO");
}

/**
 * Tarjeta "Artículos comprados" del tab General. Se monta solo cuando el
 * usuario entra a ese tab, así que la data se pide en ese momento y no al
 * cargar la página. El fetch va por el store.
 */
export function EquipoComprasCard({ equipoId }: { equipoId: string }) {
   const { comprasItems, comprasLoading, comprasError, GetEquipoCompras } = useEquipoStore();
   const [loaded, setLoaded] = useState(false);

   useEffect(() => {
      let active = true;
      GetEquipoCompras(equipoId).then(() => {
         if (active) setLoaded(true);
      });
      return () => {
         active = false;
      };
   }, [equipoId, GetEquipoCompras]);

   const loading = comprasLoading || !loaded;

   return (
      <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <ShoppingCart className="size-5 text-brand-blue" />
               Artículos comprados
            </CardTitle>
            <CardDescription>
               Ítems de órdenes de compra registrados para este equipo.
            </CardDescription>
         </CardHeader>
         <CardContent className="p-0">
            {loading ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  Cargando artículos…
               </div>
            ) : comprasError ? (
               <div className="flex items-center justify-center p-8 text-sm text-destructive">
                  {comprasError}
               </div>
            ) : comprasItems.length === 0 ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  Sin artículos registrados para este equipo.
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="border-b border-border bg-muted/40">
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orden</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cantidad</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">P. Unitario</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subtotal</th>
                        </tr>
                     </thead>
                     <tbody>
                        {comprasItems.map((item) => (
                           <tr key={item.id} className="border-t border-border hover:bg-muted/20">
                              <td className="px-4 py-3">
                                 <Link href={`/dashboard/compras/${item.orden_compra_id}`} className="font-medium text-brand-blue hover:underline">
                                    {item.orden_compra_id.slice(0, 8)}…
                                 </Link>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{formatDate(item.orden_fecha)}</td>
                              <td className="px-4 py-3">{item.descripcion}</td>
                              <td className="px-4 py-3 text-right">{item.cantidad}</td>
                              <td className="px-4 py-3 text-right">{formatMoney(item.precio_unitario)}</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.subtotal)}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </CardContent>
      </Card>
   );
}
