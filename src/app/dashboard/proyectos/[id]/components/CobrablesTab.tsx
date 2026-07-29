"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProyectoDetalle } from "@/dtos/proyecto.dto";
import { DetalleTable } from "./DetalleTable";

export function CobrablesTab({
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
               <CardTitle>Cargos cobrables</CardTitle>
               <CardDescription>Se incluyen en la factura del cliente.</CardDescription>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <DetalleTable
               rows={rows}
               selectedIds={selectedIds}
               onSelectIds={onSelectIds}
               moveLabel="Mover a Incobrables"
               onMove={onMove}
               moveLoading={moveLoading}
               canMove={canMove}
            />
         </CardContent>
      </Card>
   );
}
