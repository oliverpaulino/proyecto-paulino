"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProyectoDetalle } from "@/dtos/proyecto.dto";
import { DetalleTable } from "./DetalleTable";

export function IncobrablesTab({
   rows,
   selectedIds,
   onSelectIds,
   onMove,
   moveLoading,
   canMove,
}: {
   rows: ProyectoDetalle[];
   selectedIds: Set<string>;
   onSelectIds: (ids: Set<string>) => void;
   onMove: () => void;
   moveLoading: boolean;
   canMove: boolean;
}) {
   return (
      <Card>
         <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
               <CardTitle>Gastos incobrables / internos</CardTitle>
               <CardDescription>Solo afectan la rentabilidad interna y no se facturan al cliente.</CardDescription>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <DetalleTable
               rows={rows}
               selectedIds={selectedIds}
               onSelectIds={onSelectIds}
               moveLabel="Mover a Cobrables"
               onMove={onMove}
               moveLoading={moveLoading}
               canMove={canMove}
            />
         </CardContent>
      </Card>
   );
}
