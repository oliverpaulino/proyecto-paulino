"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Save } from "lucide-react";
import { useProyectoTarifaStore } from "@/stores/useProyectoTarifaStore";
import { useDebounce } from "@/hooks/use-debounce";
import type { TarifaGlobalRowDTO } from "@/dtos/proyecto-tarifa.dto";

interface Props {
   proyectoId: string;
   locked?: boolean;
}

export function ProyectoTarifasCard({ proyectoId, locked = false }: Props) {
   const { tarifasGlobales, tarifasGlobalesTotal, loading, GetTarifasGlobales, BulkUpsertTarifas } = useProyectoTarifaStore();

   const [search, setSearch] = useState("");
   const [page, setPage] = useState(1);
   const [guardando, setGuardando] = useState(false);
   const [editando, setEditando] = useState<Record<string, string>>({});
   const limit = 20;

   const debouncedSearch = useDebounce(search, 400);

   const loadData = useCallback(() => {
      GetTarifasGlobales(proyectoId, debouncedSearch, page, limit);
   }, [GetTarifasGlobales, proyectoId, debouncedSearch, page]);

   useEffect(() => {
      loadData();
   }, [loadData]);

   useEffect(() => {
      setPage(1);
   }, [debouncedSearch]);

   const totalPages = Math.max(1, Math.ceil(tarifasGlobalesTotal / limit));

   function handleEdit(row: TarifaGlobalRowDTO, value: string) {
      setEditando((prev) => ({ ...prev, [row.categoria_equipo_tarifa_id]: value }));
   }

   function getDisplay(row: TarifaGlobalRowDTO): string {
      const id = row.categoria_equipo_tarifa_id;
      if (id in editando) return editando[id];
      return row.precio_proyecto != null ? String(row.precio_proyecto) : "";
   }

   function getValue(row: TarifaGlobalRowDTO): number {
      const val = getDisplay(row);
      return val === "" ? 0 : Number(val);
   }

   function tieneCambio(row: TarifaGlobalRowDTO): boolean {
      const id = row.categoria_equipo_tarifa_id;
      if (!(id in editando)) return false;
      const editVal = editando[id];
      const origVal = row.precio_proyecto != null ? String(row.precio_proyecto) : "";
      return editVal !== origVal;
   }

   const hayCambios = tarifasGlobales.some(tieneCambio);

   async function handleGuardar() {
      const tarifas = tarifasGlobales
         .filter(tieneCambio)
         .map((row) => ({
            categoria_equipo_tarifa_id: row.categoria_equipo_tarifa_id,
            precio_unitario: getValue(row),
         }));

      if (tarifas.length === 0) return;

      setGuardando(true);
      try {
         const result = await BulkUpsertTarifas({ proyecto_id: proyectoId, tarifas });
         if (result instanceof Error) throw result;
         setEditando({});
         await GetTarifasGlobales(proyectoId, debouncedSearch, page, limit);
      } catch (e) {
         console.error(e);
      } finally {
         setGuardando(false);
      }
   }

   return (
      <div className="space-y-4">
         {locked && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
               Proyecto <strong>COMPLETADO</strong>: las tarifas están bloqueadas.
            </p>
         )}
         <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
               placeholder="Buscar categoría o tarifa..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9"
               disabled={locked}
            />
         </div>

         {loading && tarifasGlobales.length === 0 ? (
            <div className="flex items-center justify-center py-12">
               <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
         ) : tarifasGlobales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
               No hay tarifas de categorías disponibles.
            </p>
         ) : (
            <>
               <div className="rounded-md border">
                  <Table>
                     <TableHeader>
                        <TableRow>
                           <TableHead className="w-[160px]">Categoría</TableHead>
                           <TableHead className="w-[140px]">Tarifa</TableHead>
                           <TableHead className="w-[100px]">Medida</TableHead>
                           <TableHead className="w-[120px] text-right">Precio Global</TableHead>
                           <TableHead className="w-[140px] text-right">Precio Proyecto (RD$)</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {tarifasGlobales.map((row) => (
                           <TableRow key={row.categoria_equipo_tarifa_id}>
                              <TableCell className="font-medium">{row.categoria_equipo_nombre}</TableCell>
                              <TableCell>{row.categoria_equipo_tarifa_nombre}</TableCell>
                              <TableCell>{row.medida_cobro_nombre}</TableCell>
                              <TableCell className="text-right">
                                 RD$ {row.precio_global.toLocaleString("es-DO")}
                              </TableCell>
                              <TableCell className="text-right">
                                  <Input
                                     type="number"
                                     min={0}
                                     step="0.01"
                                     placeholder={row.precio_global.toLocaleString("es-DO")}
                                     value={getDisplay(row)}
                                     onChange={(e) => handleEdit(row, e.target.value)}
                                     disabled={locked}
                                     className={`h-8 w-28 text-right ml-auto ${tieneCambio(row) ? "border-amber-400" : ""}`}
                                  />
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </div>

               <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                     {tarifasGlobalesTotal} tarifa{tarifasGlobalesTotal !== 1 ? "s" : ""} en total
                  </span>
                  <div className="flex items-center gap-2">
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                     >
                        Anterior
                     </Button>
                     <span className="min-w-[80px] text-center">
                        Pág. {page} de {totalPages}
                     </span>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                     >
                        Siguiente
                     </Button>
                  </div>
               </div>
            </>
         )}

         {hayCambios && (
            <div className="sticky bottom-0 flex justify-end border-t bg-background pt-4">
               <Button
                  type="button"
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="gap-2"
               >
                  <Save className="size-4" />
                  {guardando ? "Guardando..." : `Guardar Cambios (${tarifasGlobales.filter(tieneCambio).length})`}
               </Button>
            </div>
         )}
      </div>
   );
}
