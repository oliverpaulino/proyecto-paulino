"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Briefcase, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useProyectoStore } from "@/stores/useProyectoStore";
import type { Proyecto, TipoProyecto } from "@/dtos/proyecto.dto";

interface SelectBuscadorProyectoProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (proyectoId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
   tipoFiltro?: TipoProyecto; // Opcional por si quieres buscar solo proyectos EXPRESS, NORMAL, etc.
}

export function SelectBuscadorProyecto({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar proyecto por cliente o ID...",
   disabled = false,
   tipoFiltro,
}: SelectBuscadorProyectoProps) {
   const { proyectos, loading, GetProyectos } = useProyectoStore();
   const [isOpen, setIsOpen] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   // Sincronizar label inicial
   useEffect(() => {
      setInputValue(initialLabel);
   }, [initialLabel]);

   // Manejar clic fuera del componente para cerrarlo
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

   // Obtener los proyectos cuando se abre el buscador
   useEffect(() => {
      if (!isOpen) return;
      // Usamos la firma de GetProyectos que definiste en tu store
      GetProyectos(tipoFiltro, { force: true });
   }, [isOpen, GetProyectos, tipoFiltro]);

   // Filtrado local basado en el término de búsqueda, ya que GetProyectos no incluye endpoint de search text
   const proyectosFiltrados = useMemo(() => {
      if (!debouncedSearch.trim()) return proyectos;
      
      const searchLower = debouncedSearch.toLowerCase();
      return proyectos.filter((proyecto) => {
         const cliente = proyecto.cliente_nombre?.toLowerCase() || "";
         const id = proyecto.id.toLowerCase();
         const tipo = proyecto.tipo_proyecto.toLowerCase();
         
         return cliente.includes(searchLower) || id.includes(searchLower) || tipo.includes(searchLower);
      });
   }, [proyectos, debouncedSearch]);

   // Generar una etiqueta representativa para el input
   const getProyectoLabel = (proyecto: Proyecto) => {
      return `${proyecto.tipo_proyecto} - ${proyecto.cliente_nombre || "Sin cliente"} (${proyecto.id.slice(0, 6)})`;
   };

   const handleSelect = (proyecto: Proyecto) => {
      setInputValue(getProyectoLabel(proyecto));
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
            <Briefcase className="absolute left-3 h-4 w-4 text-muted-foreground" />
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
               {loading && proyectosFiltrados.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando proyectos...</div>
               ) : proyectosFiltrados.length > 0 ? (
                  proyectosFiltrados.map((proyecto) => (
                     <div
                        key={proyecto.id}
                        onClick={() => handleSelect(proyecto)}
                        className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-medium truncate">
                              {proyecto.cliente_nombre || "Cliente no especificado"}
                           </span>
                           <span className="text-[10px] uppercase font-semibold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                              {proyecto.tipo_proyecto}
                           </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                           <span className="truncate">ID: {proyecto.id.slice(0, 8)}...</span>
                           <span className={`px-1.5 py-0.5 rounded ${
                              proyecto.estado === "COMPLETADO" ? "text-green-500" :
                              proyecto.estado === "BORRADOR" ? "text-yellow-500" :
                              "text-blue-500"
                           }`}>
                              {proyecto.estado}
                           </span>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron proyectos.</div>
               )}
            </div>
         )}
      </div>
   );
}