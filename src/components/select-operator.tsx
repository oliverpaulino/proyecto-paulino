"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, TriangleAlert, User, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import type { Employee, OperadorAsignable } from "@/dtos/employee.dto";

interface SelectBuscadorOperatorProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (employeeId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscadorOperator({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar operador por nombre o ID...",
   disabled = false,
}: SelectBuscadorOperatorProps) {
   const { Operators, loading, GetOperators } = useEmployeeStore();
   const [isOpen, setIsOpen] = useState(false);
   const [hasTyped, setHasTyped] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   let operators = Operators ?? [];

   // Un empleado inactivo no puede asignarse: solo se ofrece para seleccionar
   // el que sigue activo. El ya asignado inactivo se sigue viendo (con aviso)
   // para que quede claro por qué el equipo quedó sin operador.
   const asignables = operators.filter((o) => o.activo !== false);
   const valorAsignado = value ? operators.find((o) => o.id === value) : undefined;
   const valorInactivo = valorAsignado && valorAsignado.activo === false;

   useEffect(() => {
      GetOperators({ search: "", limit: 20, force: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // Sincroniza el texto visible cada vez que cambian `value` o la lista de operadores,
   // no solo cuando cambia `initialLabel`.
   useEffect(() => {
      if (!value) {
         setInputValue(initialLabel);
         return;
      }
      const match = operators.find((o) => o.id === value);
      if (match) setInputValue(match.nombre);
   }, [value, operators, initialLabel]);

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
         GetOperators({ search: "", limit: 20, force: true });
         return;
      }

      if (debouncedSearch.trim() !== "") {
         GetOperators({ search: debouncedSearch, limit: 20, force: true });
      } else {
         GetOperators({ search: "", limit: 20, force: true });
      }
   }, [debouncedSearch, isOpen, GetOperators, hasTyped]);

   const handleSelect = (operator: OperadorAsignable) => {
      setInputValue(operator.nombre);
      setHasTyped(false);
      onChange(operator.id);
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
            <User className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
               type="text"
               value={inputValue}
               onChange={(e) => {
                  setInputValue(e.target.value);
                  setHasTyped(true);

                  if (e.target.value === "") onChange(null);
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
               {loading && (asignables?.length ?? 0) === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando operadores...</div>
               ) : (asignables?.length ?? 0) > 0 ? (
                  asignables
                     .filter(o => o.id !== value) // Filtrar solo operadores activos y no seleccionados
                     .map((operator) => (
                        <div
                           key={operator.id}
                           onClick={() => handleSelect(operator)}
                           className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                           <div className="flex justify-between items-center">
                              <span className="font-medium truncate">{operator.nombre}</span>
                              <span className="text-[10px] uppercase font-semibold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                 {/* {operator.id} poner aqui el numero identificador/referencia */}
                              </span>
                           </div>
                           <span className="text-xs text-muted-foreground truncate">
                              Licencia: {operator.licencia || "No asignada"}
                           </span>
                        </div>
                     ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron empleados.</div>
               )}
            </div>
         )}

         {valorInactivo && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-600">
               <TriangleAlert className="size-3.5" />
               {valorAsignado.nombre} está inactivo — no puede operar. Selecciona otro operador.
            </p>
         )}
      </div>
   );
}