"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ArrowDownRight, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useDeduccionStore } from "@/stores/useDeduccionStore";
import type { Deduccion } from "@/dtos/deducciones.dto";

interface SelectBuscadorDeduccionProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (deduccionId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscadorDeduccion({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar deducción por concepto o empleado...",
   disabled = false,
}: SelectBuscadorDeduccionProps) {
   const { Deducciones, loading, GetDeducciones } = useDeduccionStore();
   const [isOpen, setIsOpen] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   useEffect(() => {
      setInputValue(initialLabel);
   }, [initialLabel]);

   useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
         if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
            if (!value) setInputValue(""); 
         }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, [value]);

   useEffect(() => {
      if (!isOpen) return;

      GetDeducciones({ 
         search: debouncedSearch.trim(), 
         limit: 20, 
         force: true 
      });
   }, [debouncedSearch, isOpen, GetDeducciones]);

   const handleSelect = (deduccion: Deduccion) => {
      setInputValue(`${deduccion.codigoReferencia} - ${deduccion.concepto}`);
      onChange(deduccion.id);
      setIsOpen(false);
   };

   const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputValue("");
      onChange(null);
      setIsOpen(false);
   };

   return (
      <div className="relative w-full" ref={containerRef}>
         <div className="relative flex items-center">
            <ArrowDownRight className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
               type="text"
               value={inputValue}
               onChange={(e) => {
                  setInputValue(e.target.value);
                  if (e.target.value === "") onChange(null);
                  if (!isOpen) setIsOpen(true);
               }}
               onFocus={() => setIsOpen(true)}
               disabled={disabled}
               placeholder={placeholder}
               className="h-10 w-full rounded-md border border-input bg-input/30 pl-9 pr-9 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            
            <div className="absolute right-3 flex items-center gap-1">
               {loading && isOpen && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
               {value && !disabled && (
                  <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
                     <X className="h-4 w-4" />
                  </button>
               )}
            </div>
         </div>

         {isOpen && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1">
               {loading && Deducciones.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando deducciones...</div>
               ) : Deducciones.length > 0 ? (
                  Deducciones.map((deduccion) => (
                     <div
                        key={deduccion.id}
                        onClick={() => handleSelect(deduccion)}
                        className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                     >
                        <div className="flex justify-between items-start gap-2">
                           <div className="flex flex-col overflow-hidden">
                              <span className="font-medium truncate text-foreground">{deduccion.concepto}</span>
                              <span className="text-xs text-muted-foreground">
                                 {deduccion.codigoReferencia} • Emp: {deduccion.empleado_nombre || "N/A"}
                              </span>
                           </div>
                           <span className="text-xs font-semibold whitespace-nowrap bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                              {new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(deduccion.monto_total)}
                           </span>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron deducciones.</div>
               )}
            </div>
         )}
      </div>
   );
}