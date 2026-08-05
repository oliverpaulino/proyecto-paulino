"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePagoStore } from "@/stores/usePagoStore";
import { PagoTable } from "../../../pagos/components/pago-table";

const INPUT_CLASS =
   "h-9 rounded-lg border border-input bg-input/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

interface Filtros {
   search: string;
   desde: string;
   hasta: string;
}

const SIN_FILTROS: Filtros = { search: "", desde: "", hasta: "" };

export function EquipoPagos({ equipoId }: { equipoId: string }) {
   const { Pagos, loading, pagination, GetPagos, NextPage, PrevPage } = usePagoStore();
   const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
   const [aplicados, setAplicados] = useState<Filtros>(SIN_FILTROS);

   const cargar = useCallback(
      async (f: Filtros, page = 1, force = false) => {
         await GetPagos({
            equipo_id: equipoId,
            search: f.search || undefined,
            start: f.desde || undefined,
            end: f.hasta || undefined,
            page,
            limit: 50,
            force,
         });
      },
      [equipoId, GetPagos]
   );

   useEffect(() => {
      cargar(SIN_FILTROS);
   }, [cargar]);

   function aplicar() {
      setAplicados(filtros);
      cargar(filtros, 1, true);
   }

   function limpiar() {
      setFiltros(SIN_FILTROS);
      setAplicados(SIN_FILTROS);
      cargar(SIN_FILTROS);
   }

   const hayFiltros = aplicados.search !== "" || aplicados.desde !== "" || aplicados.hasta !== "";

   return (
      <div className="flex flex-col gap-4">
         <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
               <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Buscar
               </span>
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                     value={filtros.search}
                     onChange={(e) => setFiltros((f) => ({ ...f, search: e.target.value }))}
                     onKeyDown={(e) => e.key === "Enter" && aplicar()}
                     placeholder="Concepto, método o referencia…"
                     className={`${INPUT_CLASS} w-full pl-9`}
                  />
               </div>
            </div>
            <div className="flex flex-col gap-1.5">
               <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Desde</span>
               <input
                  type="date"
                  value={filtros.desde}
                  max={filtros.hasta || undefined}
                  onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value }))}
                  className={INPUT_CLASS}
               />
            </div>
            <div className="flex flex-col gap-1.5">
               <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hasta</span>
               <input
                  type="date"
                  value={filtros.hasta}
                  min={filtros.desde || undefined}
                  onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value }))}
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

         {loading && Pagos.length === 0 ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando pagos del equipo…
            </div>
         ) : (
            <div className="flex flex-col gap-4">
               <PagoTable pagos={Pagos} />
               <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">
                     Total: <strong>{pagination.total}</strong> pagos vinculados al equipo
                  </span>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" onClick={PrevPage} disabled={!pagination.hasPrev || loading}>
                        <ChevronLeft className="mr-1 size-4" /> Anterior
                     </Button>
                     <span className="px-2 text-xs font-medium text-foreground">
                        Pág. {pagination.page} / {pagination.totalPages || 1}
                     </span>
                     <Button variant="outline" size="sm" onClick={NextPage} disabled={!pagination.hasNext || loading}>
                        Siguiente <ChevronRight className="ml-1 size-4" />
                     </Button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
