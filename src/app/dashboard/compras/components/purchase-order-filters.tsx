"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectBuscadorProveedor } from "@/components/shared/selectBuscadorProveedor";
import { SelectBuscadorEquipo } from "@/components/shared/selectBuscadorEquipo";

export interface PurchaseOrderFiltersValues {
   proveedorId: string;
   estado: string;
   estadoPago: string;
   equipoId: string;
}

interface PurchaseOrderFiltersProps {
   values: PurchaseOrderFiltersValues;
   onChange: (next: PurchaseOrderFiltersValues) => void;
   onClear: () => void;
   hasActiveFilters: boolean;
   resetKey?: number;
}

const ESTADOS = ["BORRADOR", "PENDIENTE", "APROBADA", "RECIBIDA", "CANCELADA"];

const SELECT_CLASS =
   "h-10 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

export function PurchaseOrderFilters({
   values,
   onChange,
   onClear,
   hasActiveFilters,
   resetKey = 0,
}: PurchaseOrderFiltersProps) {
   return (
      <div className="rounded-xl border border-border bg-card p-4">
         <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
               <Label className="text-xs font-medium text-muted-foreground">
                  Proveedor
               </Label>
               <SelectBuscadorProveedor
                  key={`proveedor-${resetKey}`}
                  value={values.proveedorId}
                  onChange={(id) =>
                     onChange({ ...values, proveedorId: id ?? "" })
                  }
                  placeholder="Todos los proveedores"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label className="text-xs font-medium text-muted-foreground">
                  Estado
               </Label>
               <select
                  value={values.estado}
                  onChange={(e) => onChange({ ...values, estado: e.target.value })}
                  className={SELECT_CLASS}
               >
                  <option value="">Todos los estados</option>
                  {ESTADOS.map((e) => (
                     <option key={e} value={e}>
                        {e.charAt(0) + e.slice(1).toLowerCase()}
                     </option>
                  ))}
               </select>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label className="text-xs font-medium text-muted-foreground">
                  Estado de pago
               </Label>
               <select
                  value={values.estadoPago}
                  onChange={(e) =>
                     onChange({ ...values, estadoPago: e.target.value })
                  }
                  className={SELECT_CLASS}
               >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">Sin pagos</option>
                  <option value="PARCIAL">Pago parcial</option>
                  <option value="PAGADO">Pagada</option>
               </select>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label className="text-xs font-medium text-muted-foreground">
                  Equipo
               </Label>
               <SelectBuscadorEquipo
                  key={`equipo-${resetKey}`}
                  value={values.equipoId}
                  onChange={(id) => onChange({ ...values, equipoId: id ?? "" })}
                  placeholder="Todos los equipos"
               />
            </div>
         </div>

         {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
               <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
               >
                  <X className="size-3.5 mr-1" />
                  Limpiar filtros
               </Button>
            </div>
         )}
      </div>
   );
}
