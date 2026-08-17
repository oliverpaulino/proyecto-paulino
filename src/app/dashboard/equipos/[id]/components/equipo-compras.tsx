"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Loader2, RefreshCw, Search, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEquipoStore } from "@/stores/useEquipoStore";

const INPUT_CLASS =
   "h-9 rounded-lg border border-input bg-input/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

export function EquipoCompras({ equipoId }: { equipoId: string }) {
   const { comprasItems, comprasLoading, comprasError, GetEquipoCompras } = useEquipoStore();

   // Alias para no tocar el resto del JSX (usa items/loading/error).
   const items = comprasItems;
   const error = comprasError;

   const [loaded, setLoaded] = useState(false);
   const loading = comprasLoading || !loaded;

   const [desde, setDesde] = useState("");
   const [hasta, setHasta] = useState("");
   const [aplicados, setAplicados] = useState({ desde: "", hasta: "" });
   const [search, setSearch] = useState("");

   const cargar = useCallback(
      async (d: string, h: string, force = false) => {
         await GetEquipoCompras(equipoId, d, h, force);
      },
      [equipoId, GetEquipoCompras]
   );

   useEffect(() => {
      let active = true;
      cargar("", "").then(() => {
         if (active) setLoaded(true);
      });
      return () => {
         active = false;
      };
   }, [cargar]);

   function aplicar() {
      setAplicados({ desde, hasta });
      cargar(desde, hasta, true);
   }

   function limpiar() {
      setDesde("");
      setHasta("");
      setAplicados({ desde: "", hasta: "" });
      setSearch("");
      cargar("", "");
   }

   const filtrados = useMemo(() => {
      const s = search.trim().toLowerCase();
      if (!s) return items;
      return items.filter(
         (i) =>
            i.descripcion.toLowerCase().includes(s) ||
            i.orden_estado.toLowerCase().includes(s) ||
            i.orden_compra_id.toLowerCase().includes(s)
      );
   }, [items, search]);

   const total = filtrados.reduce((a, i) => a + i.subtotal, 0);
   const hayFiltros = aplicados.desde !== "" || aplicados.hasta !== "" || search !== "";

   return (
      <div className="flex flex-col gap-4">
         <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
               <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buscar</span>
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder="Descripción, estado u orden…"
                     className={`${INPUT_CLASS} w-full pl-9`}
                  />
               </div>
            </div>
            <div className="flex flex-col gap-1.5">
               <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Desde</span>
               <input
                  type="date"
                  value={desde}
                  max={hasta || undefined}
                  onChange={(e) => setDesde(e.target.value)}
                  className={INPUT_CLASS}
               />
            </div>
            <div className="flex flex-col gap-1.5">
               <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hasta</span>
               <input
                  type="date"
                  value={hasta}
                  min={desde || undefined}
                  onChange={(e) => setHasta(e.target.value)}
                  className={INPUT_CLASS}
               />
            </div>
            <Button onClick={aplicar} disabled={loading}>
               {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CalendarDays className="mr-2 size-4" />}
               Filtrar
            </Button>
            {hayFiltros && (
               <Button variant="ghost" size="icon" onClick={limpiar} title="Limpiar filtros">
                  <X className="size-4" />
               </Button>
            )}
         </div>

         {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando compras del equipo…
            </div>
         ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
               {error}
            </div>
         ) : (
            <div className="flex flex-col gap-3">
               <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                     {filtrados.length === 0
                        ? "Sin artículos registrados para este equipo."
                        : `${filtrados.length} artículo${filtrados.length === 1 ? "" : "s"} en órdenes de compra`}
                  </p>
                  {filtrados.length > 0 && (
                     <p className="text-sm">
                        Total invertido:{" "}
                        <strong className="text-brand-blue">{formatMoney(total)}</strong>
                     </p>
                  )}
               </div>

               {filtrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground">
                     <ShoppingCart className="size-10 opacity-30" />
                     No se encontraron artículos con los filtros actuales.
                  </div>
               ) : (
                  <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                     <table className="w-full text-sm">
                        <thead>
                           <tr className="bg-brand-blue">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Orden</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Descripción</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Estado</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Cantidad</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">P. Unitario</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Subtotal</th>
                           </tr>
                        </thead>
                        <tbody>
                           {filtrados.map((item) => (
                              <tr key={item.id} className="border-b border-border/50 transition-colors hover:bg-brand-blue/5">
                                 <td className="px-4 py-3">
                                    <Link
                                       href={`/dashboard/compras/${item.orden_compra_id}`}
                                       className="font-mono text-xs font-medium text-brand-blue hover:underline"
                                    >
                                       <span className="inline-block rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                                          {item.orden_codigo}
                                       </span>
                                    </Link>
                                 </td>
                                 <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                    {format(new Date(item.orden_fecha), "dd MMM yyyy", { locale: es })}
                                 </td>
                                 <td className="px-4 py-3 font-medium">{item.descripcion}</td>
                                 <td className="px-4 py-3 text-xs">
                                    <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">
                                       {item.orden_estado}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-right text-muted-foreground">{item.cantidad}</td>
                                 <td className="px-4 py-3 text-right text-muted-foreground">{formatMoney(item.precio_unitario)}</td>
                                 <td className="px-4 py-3 text-right font-semibold text-brand-blue">{formatMoney(item.subtotal)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
         )}
      </div>
   );
}
