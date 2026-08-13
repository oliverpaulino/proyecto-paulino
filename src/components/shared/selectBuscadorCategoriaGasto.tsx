"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Tags, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useCategoriaGastoStore } from "@/stores/useCategoriaGastoStore";
import type { CategoriaGasto } from "@/dtos/categoria-gasto.dto";

interface SelectBuscadorCategoriaGastoProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (categoriaId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
   onCreateNew?: (inputValue: string) => void;
}

export function SelectBuscadorCategoriaGasto({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar categoría por nombre...",
   disabled = false,
   onCreateNew,
}: SelectBuscadorCategoriaGastoProps) {
   const { Categorias, loading, GetCategorias } = useCategoriaGastoStore();
   const [isOpen, setIsOpen] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   useEffect(() => {
      setInputValue(initialLabel);
   }, [initialLabel]);

   // Cierra el dropdown si se hace clic fuera del componente
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

      GetCategorias({ 
         search: debouncedSearch.trim(), 
         limit: 20, 
         force: true 
      });
   }, [debouncedSearch, isOpen, GetCategorias]);

   const handleSelect = (categoria: CategoriaGasto) => {
      setInputValue(categoria.nombre);
      onChange(categoria.id);
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
            <Tags className="absolute left-3 h-4 w-4 text-muted-foreground" />
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
            <div className="absolute z-50 mt-1 max-h-[50dvh] w-full flex flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
               <div className="overflow-y-auto max-h-[42dvh] p-1">
                  {loading && Categorias.length === 0 ? (
                     <div className="p-4 text-center text-sm text-muted-foreground">Buscando categorías...</div>
                  ) : Categorias.length > 0 ? (
                     Categorias.map((categoria) => (
                        <div
                           key={categoria.id}
                           onClick={() => handleSelect(categoria)}
                           className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                           <div className="flex justify-between items-center">
                              <span className="font-medium truncate">{categoria.nombre}</span>
                              <span className="text-[10px] uppercase font-semibold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                 {categoria.grupo}
                              </span>
                           </div>
                        </div>
                     ))
                  ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron categorías.</div>
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
                     + Crear nueva categoría
                  </div>
               )}
            </div>
         )}
      </div>
   );
}