"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Truck, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useConduceStore } from "@/stores/useConduceStores";
import type { ConduceDTO } from "@/dtos/conduce.dto";

interface SelectBuscadorConduceProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (conduceId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscadorConduce({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar conduce por referencia o cliente...",
   disabled = false,
}: SelectBuscadorConduceProps) {
   const { conduces, loading, GetConduces } = useConduceStore();
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
      GetConduces({ pageSize: 100 });
   }, [isOpen, GetConduces]);

   const conducesFiltrados = useMemo(() => {
      if (!debouncedSearch.trim()) return conduces;

      const searchLower = debouncedSearch.toLowerCase();

      return conduces.filter((c) => {
         const ref = c.numero_referencia.toLowerCase();
         const cliente = c.cliente_nombre?.toLowerCase() || "";
         const equipo = c.equipo_nombre?.toLowerCase() || "";

         return ref.includes(searchLower) || cliente.includes(searchLower) || equipo.includes(searchLower);
      });
   }, [conduces, debouncedSearch]);

   const conduceSeleccionado = useMemo(() => {
      if (!value) return null;
      return conduces.find((c) => c.id === value) || null;
   }, [conduces, value]);

   const getConduceLabel = (c: ConduceDTO) => {
      return `${c.numero_referencia} - ${c.cliente_nombre || "Sin cliente"}`;
   };

   const handleSelect = (c: ConduceDTO) => {
      setInputValue(getConduceLabel(c));
      onChange(c.id);
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
            <Truck className="absolute left-3 h-4 w-4 text-muted-foreground" />
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

         {conduceSeleccionado && (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-input/30 bg-muted/30 px-3 py-1.5 text-xs">
               <span className="text-muted-foreground">
                  Subtotal:{" "}
                  <span className="font-semibold text-foreground">
                     RD$ {conduceSeleccionado.subtotal.toFixed(2)}
                  </span>
               </span>
               <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${conduceSeleccionado.es_cobrable ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"}`}>
                  {conduceSeleccionado.es_cobrable ? "Cobrable" : "No cobrable"}
               </span>
            </div>
         )}

         {isOpen && (
            <div className="absolute z-50 mt-1 max-h-[50dvh] w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1">
               {loading && conducesFiltrados.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando conduces...</div>
               ) : conducesFiltrados.length > 0 ? (
                  conducesFiltrados.map((c) => (
                     <div
                        key={c.id}
                        onClick={() => handleSelect(c)}
                        className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-medium truncate">
                              {c.cliente_nombre || "Cliente no especificado"}
                           </span>
                           <span className="text-[10px] font-semibold text-muted-foreground">
                              {c.numero_referencia}
                           </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-muted-foreground">
                              RD$ {c.subtotal.toFixed(2)}
                           </span>
                           <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.tipo_conduce === "CAMION" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                           }`}>
                              {c.tipo_conduce === "CAMION" ? "Camión" : "Equipo Pesado"}
                           </span>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron conduces.</div>
               )}
            </div>
         )}
      </div>
   );
}
