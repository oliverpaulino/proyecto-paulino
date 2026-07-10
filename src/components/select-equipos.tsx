

"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, User, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import type { Employee, OperadorAsignable } from "@/dtos/employee.dto";
import { useEquipoStore } from "@/stores/useEquipoStore";
import { Equipo } from "@/dtos/equipo.dto";
import { EquipoUsarItem } from "@/app/dashboard/proyectos/components/proyecto-express-form";

interface SelectBuscarEquiposProps {
   value?: string | null;
   initialLabel?: string;
   exclude?: EquipoUsarItem[];
   onChange: (equipoId: string | number | null, equipo: Equipo | null) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscarEquipos({
   value,
   initialLabel = "",
   onChange,
   exclude = [],
   placeholder = "Buscar equipo por nombre o ID...",
   disabled = false,
}: SelectBuscarEquiposProps) {
   const { Equipos, loading, GetEquipos, GetOperadorByEquipoId } = useEquipoStore();
   const [operator, setOperator] = useState<OperadorAsignable | null>(null);
   const [isOpen, setIsOpen] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const [hasTyped, setHasTyped] = useState(false);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   useEffect(() => {
      const loadOperator = async () => {
         // 1. Limpiar el operador si no hay equipo seleccionado
         if (!value) {
            setOperator(null);
            return;
         }

         try {
            const result = await GetOperadorByEquipoId(value);

            if (result instanceof Error) {
               console.error("Error al cargar el operador:", result.message);
               setOperator(null); // Opcional: manejar el error mostrando un mensaje visual
            } else {
               setOperator(result);
            }
         } catch (error) {
            console.error("Error inesperado:", error);
            setOperator(null);
         }
      };

      loadOperator();

   }, [value, GetOperadorByEquipoId]);

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

      if (!hasTyped) {
         GetEquipos({
            search: "",
            limit: 20,
            force: true,
         });
         return;
      }

      GetEquipos({
         search: debouncedSearch,
         limit: 20,
         force: true,
      });
   }, [debouncedSearch, hasTyped, isOpen, GetEquipos]);

   const handleSelect = (equipo: Equipo) => {
      setInputValue(equipo.nombre);
      setHasTyped(false);
      onChange(equipo.id, equipo);
      setIsOpen(false);
   };

   const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputValue("");
      onChange(null, null);
      setIsOpen(false);
   };

   const equiposFiltrados = Equipos.filter((eq) => !exclude.some((ex) => ex.equipo_id === eq.id))

   return (
      <div className="relative w-full" ref={containerRef}>
         <div className="relative flex items-center">
            <User className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
               type="text"
               value={inputValue}
               onChange={(e) => {
                  setInputValue(e.target.value);
                  setHasTyped(true);

                  if (e.target.value === "") onChange(null, null);
                  if (!isOpen) setIsOpen(true);
               }}
               onFocus={() => { setHasTyped(false); setIsOpen(true) }}
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
               {loading && Equipos.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando equipos...</div>
               ) : equiposFiltrados.length > 0 ? (
                  equiposFiltrados.map((equipox) => (
                     <div
                        key={equipox.id}
                        onClick={() => handleSelect(equipox)}
                        className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-medium truncate">{equipox.nombre}</span>
                           <span className="text-[10px] uppercase font-semibold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                              {equipox.categoria_nombre}
                           </span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                           {operator?.nombre || "Sin operador asignado"}
                        </span>
                     </div>
                  ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron empleados.</div>
               )}
            </div>
         )}
      </div>
   );
}