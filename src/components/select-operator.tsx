"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, User, X } from "lucide-react";
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
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   const operators = Operators ?? [];
   console.log("Operators in SelectBuscadorOperator:", operators);


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

      if (debouncedSearch.trim() !== "") {
         GetOperators({ search: debouncedSearch, limit: 20, force: true });
      } else {
         GetOperators({ search: "", limit: 20, force: true });
      }
   }, [debouncedSearch, isOpen, GetOperators]);

   const handleSelect = (operator: OperadorAsignable) => {
      setInputValue(operator.nombre);
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
               {loading && (operators?.length ?? 0) === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando operadores...</div>
               ) : (operators?.length ?? 0) > 0 ? (
                  operators.map((operator) => (
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
      </div>
   );
}