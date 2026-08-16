"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useClientStore } from "@/stores/useClientStore";
import type { Client } from "@/dtos/client.dto";

interface SelectBuscadorClientProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (clientId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
   // Nueva propiedad para disparar la creación
   onCreateNew?: (inputValue: string) => void;
}

export function SelectBuscadorClient({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar cliente por nombre, email o ID...",
   disabled = false,
   onCreateNew,
}: SelectBuscadorClientProps) {
   const { Clients, loading, GetClients } = useClientStore();
   const [isOpen, setIsOpen] = useState(false);
   const [hasTyped, setHasTyped] = useState(false);
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

            // FIX: Si hay un cliente seleccionado, revertimos el texto a su nombre real
            // para no dejar texto "basura" que el usuario escribió pero no seleccionó.
            if (value) {
               setInputValue(initialLabel);
            } else {
               setInputValue("");
            }
         }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, [value, initialLabel]); // Añadir initialLabel a las dependencias

   useEffect(() => {
      if (!isOpen) return;

      if (!hasTyped) {
         GetClients({ search: "", limit: 20, force: true });
         return;
      }

      if (debouncedSearch.trim() !== "") {
         GetClients({ search: debouncedSearch.trim(), limit: 20, force: true });
      } else {
         GetClients({ search: "", limit: 20, force: true });
      }
   }, [debouncedSearch, isOpen, GetClients, hasTyped]);

   const handleSelect = (client: Client) => {
      setInputValue(client.nombre);
      setHasTyped(false);
      onChange(client.id);
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
                  setHasTyped(true);
                  if (e.target.value === "") onChange(null);
                  if (!isOpen) setIsOpen(true);
               }}
               onFocus={() => { setHasTyped(false); setIsOpen(true); }}
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
                  {loading && Clients.length === 0 ? (
                     <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
                  ) : Clients.length > 0 ? (
                     Clients.map((client) => (
                        <div
                           key={client.id}
                           onClick={() => handleSelect(client)}
                           className="flex cursor-pointer flex-col rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                           <span className="font-medium">{client.nombre}</span>
                           <span className="text-xs text-muted-foreground truncate">
                              {client.email || "Sin email"} • {client.identificacion || "Sin ID"}
                           </span>
                        </div>
                     ))
                  ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron clientes.</div>
                  )}
               </div>

               {/* Botón para crear nuevo cliente */}
               {onCreateNew && (
                  <div
                     onClick={() => {
                        onCreateNew(inputValue);
                        setIsOpen(false);
                     }}
                     className="border-t border-border bg-muted/30 p-2 text-center text-sm font-medium text-blue-600 hover:bg-accent hover:text-blue-700 cursor-pointer transition-colors"
                  >
                     + Crear nuevo cliente
                  </div>
               )}
            </div>
         )}
      </div>
   );
}