"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useProyectoStore } from "@/stores/useProyectoStore";

interface SelectBuscadorProyectoProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (proyectoId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
   onCreateNew?: (inputValue: string) => void;
   clienteId?: string | null;
}

export function SelectBuscadorProyecto({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar proyecto por nombre...",
   disabled = false,
   onCreateNew,
   clienteId,
}: SelectBuscadorProyectoProps) {
   const { proyectos, loading, GetProyectos, GetProyectosByClientId } = useProyectoStore();
   const [isOpen, setIsOpen] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   // Sincroniza el label inicial
   useEffect(() => {
      setInputValue(initialLabel);
   }, [initialLabel]);

   // Cierra el dropdown al hacer clic fuera
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

   // Efecto ÚNICO para disparar las peticiones a la API
   useEffect(() => {
      // Solo buscamos si el menú está abierto para no saturar la API
      if (!isOpen) return;

      const searchParam = debouncedSearch.trim();

      if (clienteId) {
         GetProyectosByClientId(clienteId, {
            force: true,
            search: searchParam,
            page: 1,
            limit: 20
         });
      } else {
         GetProyectos({
            force: true,
            search: searchParam,
            page: 1,
            limit: 20
         });
      }
   }, [debouncedSearch, isOpen, clienteId, GetProyectos, GetProyectosByClientId]);

   const handleSelect = (proyecto: any) => {
      setInputValue(proyecto.nombre);
      onChange(proyecto.id);
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
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
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
                  <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
                     <X className="h-4 w-4" />
                  </button>
               )}
            </div>
         </div>

         {isOpen && (
            <div className="absolute z-50 mt-1 max-h-72 w-full flex flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
               <div className="overflow-y-auto max-h-60 p-1">
                  {loading && proyectos.length === 0 ? (
                     <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
                  ) : proyectos.length > 0 ? (
                     proyectos.map((proyecto) => (
                        <div
                           key={proyecto.id}
                           onClick={() => handleSelect(proyecto)}
                           className="flex cursor-pointer flex-col rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                           <span className="font-medium">{proyecto.nombre}</span>
                           <span className="text-xs text-muted-foreground truncate">
                              {proyecto.estado || "Activo"} • {proyecto.cliente_nombre || "Sin cliente asignado"}
                           </span>
                        </div>
                     ))
                  ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron proyectos para esta búsqueda.
                     </div>
                  )}
               </div>

               {onCreateNew && (
                  <div
                     onClick={() => {
                        onCreateNew(inputValue);
                        setIsOpen(false);
                     }}
                     className="border-t border-border bg-muted/30 p-2 text-center text-sm font-medium text-blue-600 hover:bg-accent hover:text-blue-700 cursor-pointer transition-colors"
                  >
                     + Crear nuevo proyecto
                  </div>
               )}
            </div>
         )}
      </div>
   );
}