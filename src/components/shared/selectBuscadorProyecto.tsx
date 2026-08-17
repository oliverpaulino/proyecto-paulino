"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useProyectoStore } from "@/stores/useProyectoStore";
import type { Proyecto } from "@/dtos/proyecto.dto";

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

   // ESTADOS DE PAGINACIÓN Y CONTROL DE ESCRITURA
   const [page, setPage] = useState(1);
   const [hasMore, setHasMore] = useState(true);
   const [localProyectos, setLocalProyectos] = useState<Proyecto[]>([]);
   const [hasTyped, setHasTyped] = useState(false); // NUEVO ESTADO

   const containerRef = useRef<HTMLDivElement>(null);
   const observerRef = useRef<IntersectionObserver | null>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   // Sincroniza el label inicial
   useEffect(() => {
      setInputValue(initialLabel);
   }, [initialLabel]);
   useEffect(() => {
      if (!value) {
         setInputValue("");
      }
   }, [value]);
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

   // Resetear la paginación y el control de tipeo cada vez que cambie el cliente
   useEffect(() => {
      setPage(1);
      setHasMore(true);
      setHasTyped(false); // Al cambiar de cliente, requerimos una nueva acción o carga limpia
   }, [clienteId]);

   // Resetear la paginación cuando cambie la búsqueda con debounce
   useEffect(() => {
      setPage(1);
      setHasMore(true);
   }, [debouncedSearch]);

   // Efecto para hacer el fetch acumulativo controlando hasTyped
   useEffect(() => {
      if (!isOpen) return;

      const fetchMoreData = async () => {
         const searchParam = hasTyped ? debouncedSearch.trim() : "";
         const limit = 10;

         if (clienteId) {
            await GetProyectosByClientId(clienteId, { force: true, search: searchParam, page, limit });
         } else {
            await GetProyectos({ force: true, search: searchParam, page, limit });
         }
      };

      fetchMoreData();
   }, [debouncedSearch, isOpen, clienteId, page, hasTyped, GetProyectos, GetProyectosByClientId]);

   // Sincronizar los proyectos del store con los locales acumulados
   useEffect(() => {
      if (page === 1) {
         setLocalProyectos(proyectos);
      } else {
         setLocalProyectos((prev) => {
            const newItems = proyectos.filter((p) => !prev.some((existing) => existing.id === p.id));
            return [...prev, ...newItems];
         });
      }
      if (proyectos.length < 10) {
         setHasMore(false);
      }
   }, [proyectos, page]);

   // Referencia para el elemento centinela al final de la lista
   const lastElementRef = useCallback(
      (node: HTMLDivElement | null) => {
         if (loading) return;
         if (observerRef.current) observerRef.current.disconnect();

         observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore) {
               setPage((prevPage) => prevPage + 1);
            }
         });

         if (node) observerRef.current.observe(node);
      },
      [loading, hasMore]
   );

   const handleSelect = (proyecto: Proyecto) => {
      setInputValue(proyecto.nombre);
      setHasTyped(false);
      onChange(proyecto.id);
      setIsOpen(false);
   };

   const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputValue("");
      setHasTyped(false);
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
                  setHasTyped(true); // Marcamos que el usuario empezó a escribir
                  if (e.target.value === "") onChange(null);
                  if (!isOpen) setIsOpen(true);
               }}
               onFocus={() => {
                  setHasTyped(false); // Al hacer foco no disparamos búsqueda filtrada de inmediato
                  setIsOpen(true);
               }}
               disabled={disabled}
               placeholder={placeholder}
               className="h-10 w-full rounded-md border border-input bg-input/30 pl-9 pr-9 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <div className="absolute right-3 flex items-center gap-1">
               {loading && page === 1 && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
               {value && !disabled && (
                  <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
                     <X className="h-4 w-4" />
                  </button>
               )}
            </div>
         </div>

         {isOpen && (
            <div className="absolute z-50 mt-1 max-h-[50dvh] w-full flex flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
               <div className="overflow-y-auto max-h-[42dvh] p-1">
                  {localProyectos.length > 0 ? (
                     localProyectos.map((proyecto, index) => {
                        const isLast = index === localProyectos.length - 1;
                        return (
                           <div
                              ref={isLast ? lastElementRef : null}
                              key={proyecto.id}
                              onClick={() => handleSelect(proyecto)}
                              className="flex cursor-pointer flex-col rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                           >
                              <div className="flex justify-between items-center">
                                 <span className="font-medium">{proyecto.nombre}</span>
                                 <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                                    {String(proyecto.codigoReferencia ?? "")}
                                 </span>
                              </div>
                              <span className="text-xs text-muted-foreground truncate">
                                 {proyecto.estado || "Activo"} • {proyecto.cliente_nombre || "Sin cliente asignado"}
                              </span>
                           </div>
                        );
                     })
                  ) : !loading ? (
                     <div className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron proyectos.
                     </div>
                  ) : null}

                  {loading && page > 1 && (
                     <div className="py-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Cargando más...
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