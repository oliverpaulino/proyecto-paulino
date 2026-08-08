"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Truck, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useSupplierStore } from "@/stores/useSupplierStore";
import type { Supplier } from "@/dtos/supplier.dto";

interface SelectBuscadorProveedorProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (proveedorId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
   onCreateNew?: (inputValue: string) => void;
   /** Si se pasa, solo se ofrecen proveedores de esos tipos (ej. ["SUB_CONTRATISTA", "AMBOS"]). */
   filterTipos?: string[];
}

export function SelectBuscadorProveedor({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar proveedor por nombre o RNC...",
   disabled = false,
   onCreateNew,
   filterTipos,
}: SelectBuscadorProveedorProps) {
   const { Suppliers, loading, GetSuppliers } = useSupplierStore();
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
      GetSuppliers({ force: true });
   }, [isOpen, GetSuppliers]);

   const proveedoresFiltrados = useMemo(() => {
      const base = filterTipos?.length ? Suppliers.filter((s) => filterTipos.includes(s.tipo)) : Suppliers;
      if (!debouncedSearch.trim()) return base;
      const q = debouncedSearch.toLowerCase();
      return base.filter(
         (s) =>
            s.nombre.toLowerCase().includes(q) ||
            s.rnc.toLowerCase().includes(q)
      );
   }, [Suppliers, debouncedSearch, filterTipos]);

   const proveedorSeleccionado = useMemo(() => {
      if (!value) return null;
      return Suppliers.find((s) => s.id === value) || null;
   }, [Suppliers, value]);

   const getLabel = (p: Supplier) => {
      return p.rnc ? `${p.nombre} (${p.rnc})` : p.nombre;
   };

   const handleSelect = (p: Supplier) => {
      setInputValue(getLabel(p));
      onChange(p.id);
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

         {proveedorSeleccionado && (
            <div className="mt-1 flex items-center gap-2 rounded-md border border-input/30 bg-muted/30 px-3 py-1.5 text-xs">
               <span className="text-muted-foreground">
                  RNC: <span className="font-semibold text-foreground">{proveedorSeleccionado.rnc}</span>
               </span>
               <span className="ml-auto shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">
                  {proveedorSeleccionado.tipo}
               </span>
            </div>
         )}

         {isOpen && (
            <div className="absolute z-50 mt-1 max-h-60 w-full flex flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
               <div className="max-h-52 overflow-y-auto p-1">
                  {loading && proveedoresFiltrados.length === 0 ? (
                     <div className="p-4 text-center text-sm text-muted-foreground">Buscando proveedores...</div>
                  ) : proveedoresFiltrados.length > 0 ? (
                     proveedoresFiltrados.map((p) => (
                        <div
                           key={p.id}
                           onClick={() => handleSelect(p)}
                           className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                           <span className="truncate font-medium">{p.nombre}</span>
                           <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                              {p.rnc}
                           </span>
                        </div>
                     ))
                  ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron proveedores.</div>
                  )}
               </div>

               {onCreateNew && (
                  <div
                     onClick={() => {
                        onCreateNew(inputValue);
                        setIsOpen(false);
                     }}
                     className="cursor-pointer border-t border-border bg-muted/30 p-2 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-accent hover:text-blue-700"
                  >
                     + Crear nuevo proveedor
                  </div>
               )}
            </div>
         )}
      </div>
   );
}
