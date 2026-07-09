"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Ruler, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useUnitStore } from "@/stores/useUnitStore";
import type { Unit } from "@/dtos/unit.dto";
import { TipoUnidadEnum } from "@/dtos/unit.dto";

// Función auxiliar para normalizar texto (quita tildes y pasa a minúsculas)
const normalizeText = (text: string) => {
   return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
};

interface SelectBuscadorUnidadProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (unitId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscadorUnidad({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar unidad por nombre o abreviatura...",
   disabled = false,
}: SelectBuscadorUnidadProps) {
   const { Units, loading, GetUnits } = useUnitStore();
   const [isOpen, setIsOpen] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   useEffect(() => {
      setInputValue(initialLabel);
   }, [initialLabel]);

   // Cargar unidades al abrir si no hay registros cargados
   useEffect(() => {
      if (isOpen && Units.length === 0) {
         GetUnits();
      }
   }, [isOpen, Units.length, GetUnits]);

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

   const handleSelect = (unit: Unit) => {
      setInputValue(`${unit.nombre} (${unit.abreviatura})`);
      onChange(unit.id);
      setIsOpen(false);
   };

   const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputValue("");
      onChange(null);
      setIsOpen(false);
   };

   // Filtrado local ignorando tildes y mayúsculas
   const filteredUnits = Units.filter((unit) => {
      const query = normalizeText(debouncedSearch.trim());
      if (!query) return true;
      
      return (
         normalizeText(unit.nombre).includes(query) ||
         normalizeText(unit.abreviatura).includes(query) ||
         normalizeText(unit.tipo_unidad).includes(query)
      );
   }).slice(0, 20); // Limitamos visualmente para no saturar el DOM

   return (
      <div className="relative w-full" ref={containerRef}>
         <div className="relative flex items-center">
            <Ruler className="absolute left-3 h-4 w-4 text-muted-foreground" />
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
               {loading && Units.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Cargando unidades...</div>
               ) : filteredUnits.length > 0 ? (
                  filteredUnits.map((unit) => (
                     <div
                        key={unit.id}
                        onClick={() => handleSelect(unit)}
                        className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-medium truncate">{unit.nombre}</span>
                           <span className="text-[10px] uppercase font-semibold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                              {unit.abreviatura}
                           </span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                           {TipoUnidadEnum[unit.tipo_unidad as keyof typeof TipoUnidadEnum] || unit.tipo_unidad}
                        </span>
                     </div>
                  ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron unidades.</div>
               )}
            </div>
         )}
      </div>
   );
}