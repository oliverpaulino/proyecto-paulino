"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import type { ProyectoDetalle } from "@/dtos/proyecto.dto";
import { formatMoney } from "./formatMoney";

export function DetalleTable({
   rows,
   selectedIds,
   onSelectIds,
   moveLabel,
   onMove,
   moveLoading,
   canMove,
}: {
   rows: ProyectoDetalle[];
   selectedIds: Set<string>;
   onSelectIds: (ids: Set<string>) => void;
   moveLabel: string;
   onMove: () => void;
   moveLoading: boolean;
   canMove: boolean;
}) {
   const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

   function toggleAll() {
      if (allSelected) onSelectIds(new Set());
      else onSelectIds(new Set(rows.map((r) => r.id)));
   }

   function toggleOne(id: string) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectIds(next);
   }

   if (rows.length === 0) {
      return <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">Sin registros.</div>;
   }

   return (
      <div>
         {canMove && (
            <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-4 py-2">
               <span className="text-sm font-medium">
                  {selectedIds.size} seleccionado{selectedIds.size > 1 ? "s" : ""}
               </span>
               <Button
                  size="sm"
                  variant="outline"
                  onClick={onMove}
                  disabled={moveLoading}
                  className="ml-auto"
               >
                  {moveLoading ? <Loader2 className="mr-1 size-3 animate-spin" /> : <ArrowRight className="mr-1 size-3" />}
                  {moveLabel}
               </Button>
            </div>
         )}
         <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr className="border-b border-border bg-muted/40">
                     <th className="px-4 py-3 w-10">
                        <Checkbox
                           checked={allSelected}
                           onCheckedChange={toggleAll}
                        />
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Descripción</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Cantidad</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">P. Unit.</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                  </tr>
               </thead>
               <tbody>
                  {rows.map((r) => (
                     <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">
                           <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={() => toggleOne(r.id)}
                           />
                        </td>
                        <td className="px-4 py-3">{r.descripcion}</td>
                        <td className="px-4 py-3 text-right">{r.cantidad}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(r.precio_unitario)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.subtotal)}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
}
