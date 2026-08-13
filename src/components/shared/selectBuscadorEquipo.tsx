"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Truck, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useEquipoStore } from "@/stores/useEquipoStore";
import type { Equipo } from "@/dtos/equipo.dto";

interface SelectBuscadorEquipoProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (equipoId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscadorEquipo({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar equipo por nombre o código...",
   disabled = false,
}: SelectBuscadorEquipoProps) {
   const { Equipos, loading, GetEquipos } = useEquipoStore(); //[cite: 5]
   const [isOpen, setIsOpen] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   useEffect(() => {
      setInputValue(initialLabel);
   }, [initialLabel]);

   // Agrega este useEffect para limpiar el texto visual si el valor externo se borra
   useEffect(() => {
      if (!value) {
         setInputValue("");
      }
   }, [value]);

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

   // Búsqueda del lado del servidor utilizando el parámetro search
   useEffect(() => {
      if (!isOpen) return;

      const params = { search: debouncedSearch.trim(), limit: 20, force: true };
      GetEquipos(params); //[cite: 5]
   }, [debouncedSearch, isOpen, GetEquipos]);

   const getEquipoLabel = (equipo: Equipo) => {
      return `${equipo.codigoReferencia} - ${equipo.nombre}`; //[cite: 4]
   };

   const handleSelect = (equipo: Equipo) => {
      setInputValue(getEquipoLabel(equipo));
      onChange(equipo.id); //[cite: 4]
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

         {isOpen && (
            <div className="absolute z-50 mt-1 max-h-[50dvh] w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1">
               {loading && Equipos.length === 0 ? ( //[cite: 5]
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando equipos...</div>
               ) : Equipos.length > 0 ? ( //[cite: 5]
                  Equipos.map((equipo) => ( //[cite: 5]
                     <div
                        key={equipo.id} //[cite: 4]
                        onClick={() => handleSelect(equipo)}
                        className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-medium truncate">{equipo.nombre}</span> {/*[cite: 4] */}
                           <span className="text-[10px] font-semibold text-muted-foreground">
                              {equipo.codigoReferencia} {/*[cite: 4] */}
                           </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-muted-foreground truncate">
                              Categoría: {equipo.categoria_nombre} {/*[cite: 4] */}
                           </span>
                           <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${equipo.estado === "ACTIVO" ? "bg-green-500/10 text-green-500" : //[cite: 4]
                                 equipo.estado === "EN_MANTENIMIENTO" ? "bg-yellow-500/10 text-yellow-500" : //[cite: 4]
                                    "bg-red-500/10 text-red-500"
                              }`}>
                              {equipo.estado.replace("_", " ")} {/*[cite: 4] */}
                           </span>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron equipos.</div>
               )}
            </div>
         )}
      </div>
   );
}