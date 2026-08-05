"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Receipt, X, Check } from "lucide-react";

export interface DeudaProveedorItem {
   kind: "GASTO" | "COSTO" | "OC";
   id: string;
   codigoReferencia: string;
   concepto: string;
   pendiente: number;
   estado?: string;
   categoria?: string | null;
}

interface SelectBuscadorDeudasProveedorProps {
   deudas: DeudaProveedorItem[];
   /** Keys del formato `${kind}:${id}` de las deudas seleccionadas. */
   selectedIds: string[];
   onToggle: (item: DeudaProveedorItem) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscadorDeudasProveedor({
   deudas,
   selectedIds,
   onToggle,
   placeholder = "Buscar deuda por referencia o concepto...",
   disabled = false,
}: SelectBuscadorDeudasProveedorProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [busqueda, setBusqueda] = useState("");
   const containerRef = useRef<HTMLDivElement>(null);

   const key = (d: DeudaProveedorItem) => `${d.kind}:${d.id}`;

   useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
         if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
         }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   const filtradas = useMemo(() => {
      if (!busqueda.trim()) return deudas;
      const q = busqueda.trim().toLowerCase();
      return deudas.filter((d) =>
         `${d.codigoReferencia} ${d.concepto} ${d.categoria ?? ""} ${d.estado ?? ""}`
            .toLowerCase()
            .includes(q),
      );
   }, [deudas, busqueda]);

   return (
      <div className="relative w-full" ref={containerRef}>
         <div className="relative flex items-center">
            <Receipt className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
               type="text"
               value={busqueda}
               onChange={(e) => {
                  setBusqueda(e.target.value);
                  if (!isOpen) setIsOpen(true);
               }}
               onFocus={() => setIsOpen(true)}
               disabled={disabled}
               placeholder={placeholder}
               className="h-10 w-full rounded-md border border-input bg-input/30 pl-9 pr-9 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {busqueda && (
               <button
                  type="button"
                  onClick={() => {
                     setBusqueda("");
                     setIsOpen(true);
                  }}
                  className="absolute right-3 text-muted-foreground hover:text-foreground"
               >
                  <X className="h-4 w-4" />
               </button>
            )}
         </div>

         {isOpen && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
               <div className="max-h-52 overflow-y-auto p-1">
                  {filtradas.length > 0 ? (
                     filtradas.map((d) => {
                        const k = key(d);
                        const activa = selectedIds.includes(k);
                        return (
                           <div
                              key={k}
                              onClick={() => onToggle(d)}
                              className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                           >
                              <span
                                 className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                                    activa
                                       ? "border-brand-blue bg-brand-blue"
                                       : "border-muted-foreground/40"
                                 }`}
                              >
                                 {activa && <Check className="size-3 text-white" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                 <span className="truncate font-medium">{d.codigoReferencia}</span>
                                 <span className="block truncate text-xs text-muted-foreground">
                                    {d.concepto}
                                 </span>
                              </span>
                              <span className="shrink-0 text-[10px] font-semibold uppercase text-red-600">
                                 pend. RD$ {d.pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                        );
                     })
                  ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron deudas.</div>
                  )}
               </div>
            </div>
         )}
      </div>
   );
}
