"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Save, Trash2 } from "lucide-react";
import { useProyectoEmpleadoTarifaStore } from "@/stores/useProyectoEmpleadoTarifaStore";
import { useDebounce } from "@/hooks/use-debounce";
import type { OperadorTarifaRowDTO } from "@/dtos/proyecto-empleado-tarifa.dto";

interface Props {
   proyectoId: string;
}

export function ProyectoEmpleadoTarifasCard({ proyectoId }: Props) {
   const { operadoresRows, operadoresTotal, loading, GetOperadoresConTarifas, BulkUpsertTarifas } = useProyectoEmpleadoTarifaStore();

   const [search, setSearch] = useState("");
   const [page, setPage] = useState(1);
   const [guardando, setGuardando] = useState(false);
   const [editando, setEditando] = useState<Record<string, string>>({});
   const limit = 20;

   const debouncedSearch = useDebounce(search, 400);

   const loadData = useCallback(() => {
      GetOperadoresConTarifas(proyectoId, debouncedSearch, page, limit);
   }, [GetOperadoresConTarifas, proyectoId, debouncedSearch, page]);

   useEffect(() => {
      loadData();
   }, [loadData]);

   useEffect(() => {
      setPage(1);
   }, [debouncedSearch]);

   const totalPages = Math.max(1, Math.ceil(operadoresTotal / limit));

   function getRowKey(row: OperadorTarifaRowDTO): string {
      return `${row.empleado_id}_${row.categoria_equipo_tarifa_id}`;
   }

   function handleMontoChange(row: OperadorTarifaRowDTO, value: string) {
      const key = getRowKey(row);
      setEditando((prev) => ({ ...prev, [key]: value }));
   }

   function getMontoDisplay(row: OperadorTarifaRowDTO): string {
      const key = getRowKey(row);
      if (key in editando) return editando[key];
      return row.monto_pago_proyecto != null ? String(row.monto_pago_proyecto) : "";
   }

   function getMontoValue(row: OperadorTarifaRowDTO): number {
      const val = getMontoDisplay(row);
      return val === "" ? 0 : Number(val);
   }

   function tieneCambios(row: OperadorTarifaRowDTO): boolean {
      const key = getRowKey(row);
      if (!(key in editando)) return false;
      const editVal = editando[key];
      const originalVal = row.monto_pago_proyecto != null ? String(row.monto_pago_proyecto) : "";
      return editVal !== originalVal;
   }

   const hayCambios = operadoresRows.some(tieneCambios);

   async function handleGuardar() {
      const tarifas = operadoresRows
         .filter(tieneCambios)
         .map((row) => ({
            empleado_id: row.empleado_id,
            categoria_equipo_tarifa_id: row.categoria_equipo_tarifa_id,
            monto_pago: getMontoValue(row),
         }));

      if (tarifas.length === 0) return;

      setGuardando(true);
      try {
         const result = await BulkUpsertTarifas({ proyecto_id: proyectoId, tarifas });
         if (result instanceof Error) throw result;
         setEditando({});
         await GetOperadoresConTarifas(proyectoId, debouncedSearch, page, limit);
      } catch (e) {
         console.error(e);
      } finally {
         setGuardando(false);
      }
   }

   return (
      <div className="space-y-4">
         {/* Buscador */}
         <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
               placeholder="Buscar operador por nombre..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9"
            />
         </div>

         {/* Tabla */}
         {loading && operadoresRows.length === 0 ? (
            <div className="flex items-center justify-center py-12">
               <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
         ) : operadoresRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
               No se encontraron operadores con tarifas asignadas.
            </p>
         ) : (
            <>
               <div className="rounded-md border">
                  <Table>
                     <TableHeader>
                        <TableRow>
                           <TableHead className="w-[200px]">Operador</TableHead>
                           <TableHead className="w-[160px]">Categoría</TableHead>
                           <TableHead className="w-[140px]">Tarifa</TableHead>
                           <TableHead className="w-[120px] text-right">Pago Global</TableHead>
                           <TableHead className="w-[140px] text-right">Pago Proyecto (RD$)</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {operadoresRows.map((row) => {
                           const key = getRowKey(row);
                           return (
                              <TableRow key={key}>
                                 <TableCell className="font-medium">{row.empleado_nombre}</TableCell>
                                 <TableCell>{row.categoria_equipo_nombre}</TableCell>
                                 <TableCell>{row.categoria_equipo_tarifa_nombre} ({row.medida_cobro_nombre})</TableCell>
                                 <TableCell className="text-right">
                                    {row.monto_pago_global != null
                                       ? `RD$ ${row.monto_pago_global.toLocaleString("es-DO")}`
                                       : "—"}
                                 </TableCell>
                                 <TableCell className="text-right">
                                    <Input
                                       type="number"
                                       min={0}
                                       step="0.01"
                                       placeholder={row.monto_pago_global?.toLocaleString("es-DO") ?? "0"}
                                       value={getMontoDisplay(row)}
                                       onChange={(e) => handleMontoChange(row, e.target.value)}
                                       className={`h-8 w-28 text-right ml-auto ${tieneCambios(row) ? "border-amber-400" : ""}`}
                                    />
                                 </TableCell>
                              </TableRow>
                           );
                        })}
                     </TableBody>
                  </Table>
               </div>

               {/* Paginación */}
               <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {operadoresTotal} tarifa{operadoresTotal !== 1 ? "s" : ""} en total
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

         {/* Botón Guardar Cambios */}
         {hayCambios && (
            <div className="sticky bottom-0 flex justify-end border-t bg-background pt-4">
               <Button
                  type="button"
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="gap-2"
               >
                  <Save className="size-4" />
                  {guardando ? "Guardando..." : `Guardar Cambios (${operadoresRows.filter(tieneCambios).length})`}
               </Button>
            </div>
         )}
      </div>
   );
}
