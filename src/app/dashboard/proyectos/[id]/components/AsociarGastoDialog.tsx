"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Search, Loader2, ReceiptText } from "lucide-react";
import type { Gasto } from "@/dtos/gastos.dto";
import { useGastoStore } from "@/stores/useGastoStore";
import { formatMoney } from "./formatMoney";

/**
 * Permite vincular al proyecto gastos que ya existen en la tabla `gasto`
 * pero que aún no pertenecen a ningún proyecto (proyecto_id = null).
 * La asignación se hace con el mismo endpoint PATCH /api/gastos/:id.
 */
export function AsociarGastoDialog({
   open,
   onOpenChange,
   proyectoId,
   cobrable,
   onAsociado,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   proyectoId: string;
   cobrable: boolean;
   onAsociado: () => Promise<void>;
}) {
   const { UpdateGasto, GetGastosSinProyecto } = useGastoStore();
   const [search, setSearch] = useState("");
   const [gastos, setGastos] = useState<Gasto[]>([]);
   const [loading, setLoading] = useState(false);
   const [asociandoId, setAsociandoId] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);

   const loadSinProyecto = useCallback(async (query: string) => {
      setLoading(true);
      setError(null);
      try {
         const data = await GetGastosSinProyecto(query);
         setGastos(data);
      } catch (err) {
         setError(err instanceof Error ? err.message : "Error al cargar gastos");
      } finally {
         setLoading(false);
      }
   }, [GetGastosSinProyecto]);

   useEffect(() => {
      if (open) {
         setSearch("");
         setError(null);
         loadSinProyecto("");
      }
   }, [open, loadSinProyecto]);

   async function handleAsociar(gasto: Gasto) {
      setAsociandoId(gasto.id);
      setError(null);
      try {
         const result = await UpdateGasto(gasto.id, {
            proyecto_id: proyectoId,
            cobrable_proyecto: cobrable,
         });
         if (result instanceof Error) throw result;
         setGastos((prev) => prev.filter((g) => g.id !== gasto.id));
         await onAsociado();
      } catch (err) {
         setError(err instanceof Error ? err.message : "Error al asociar el gasto");
      } finally {
         setAsociandoId(null);
      }
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
            <DialogHeader>
               <DialogTitle>Asociar gasto existente</DialogTitle>
               <DialogDescription>
                  Gastos registrados que aún no pertenecen a ningún proyecto. Se asignarán a este
                  proyecto como {cobrable ? "cobrables" : "incobrables"}.
               </DialogDescription>
            </DialogHeader>

            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                  value={search}
                  onChange={(e) => {
                     setSearch(e.target.value);
                     loadSinProyecto(e.target.value);
                  }}
                  placeholder="Buscar por concepto o NCF…"
                  className="pl-9"
               />
            </div>

            <div className="flex-1 overflow-y-auto rounded-md border">
               {loading ? (
                  <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                     <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                  </div>
               ) : gastos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                     <ReceiptText className="size-8 opacity-30" />
                     <span>No hay gastos sin proyecto.</span>
                  </div>
               ) : (
                  gastos.map((g) => (
                     <div
                        key={g.id}
                        className="flex items-center justify-between gap-3 border-b px-3 py-2.5 last:border-0"
                     >
                        <div className="flex flex-col min-w-0">
                           <span className="truncate text-sm font-medium">{g.concepto}</span>
                           <span className="text-xs text-muted-foreground">
                              {g.codigoReferencia} • NCF: {g.ncf ?? "—"}
                           </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           <span className="text-sm font-semibold">{formatMoney(g.monto_total)}</span>
                           <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={asociandoId !== null}
                              onClick={() => handleAsociar(g)}
                           >
                              {asociandoId === g.id ? (
                                 <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                 "Asociar"
                              )}
                           </Button>
                        </div>
                     </div>
                  ))
               )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
         </DialogContent>
      </Dialog>
   );
}
