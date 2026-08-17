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

/** Días (en base al calendario local) entre hoy y la fecha dada. Negativo = vencida. */
function diasHasta(fecha: Date): number {
   const hoy = new Date();
   const a = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
   const b = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
   return Math.round((a - b) / 86400000);
}

/**
 * Convierte a Date local un valor que puede venir como string "YYYY-MM-DD"
 * (tipo `date` de Postgres) o como Date. Se parsea a mano para no meter el
 * corrimiento de un día por timezone que causa `new Date("2027-05-14")`
 * (UTC medianoche → se ve un día antes en República Dominicana).
 */
function parseFechaLocal(value: Date | string | null | undefined): Date | null {
   if (!value) return null;
   if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
   const m = String(value).slice(0, 10).split("-").map(Number);
   if (m.length === 3 && !m.some(Number.isNaN)) return new Date(m[0], m[1] - 1, m[2]);
   const d = new Date(value);
   return Number.isNaN(d.getTime()) ? null : d;
}

const DIAS_AVISO_LICENCIA = 30;

function estadoLicencia(value: Date | string | null | undefined): { texto: string; clase: string; enRiesgo: boolean } {
   const fecha = parseFechaLocal(value);
   if (!fecha) {
      return { texto: "Sin licencia registrada", clase: "text-muted-foreground", enRiesgo: false };
   }
   const dias = diasHasta(fecha);
   const fechaTxt = fecha.toLocaleDateString("es-DO");
   if (dias < 0) {
      return { texto: `Licencia vencida · ${fechaTxt}`, clase: "text-red-600", enRiesgo: true };
   }
   if (dias <= DIAS_AVISO_LICENCIA) {
      return {
         texto: dias === 0 ? `Licencia vence hoy · ${fechaTxt}` : `Licencia vence en ${dias} día${dias === 1 ? "" : "s"} · ${fechaTxt}`,
         clase: "text-amber-600",
         enRiesgo: true,
      };
   }
   return { texto: `Licencia vence: ${fechaTxt}`, clase: "text-muted-foreground", enRiesgo: false };
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
                                  <div className="flex items-center gap-1.5">
                                     {operator.referencia != null && (
                                        <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                                           EMP-{String(operator.referencia).padStart(3, "0")}
                                        </span>
                                     )}
                                     {estadoLicencia(operator.fecha_vencimiento).enRiesgo && (
                                        <span className="text-[10px] uppercase font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                           Licencia por vencer
                                        </span>
                                     )}
                                  </div>
                               </div>
                               <span className={`text-xs truncate ${estadoLicencia(operator.fecha_vencimiento).clase}`}>
                                  {estadoLicencia(operator.fecha_vencimiento).texto}
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

         {valorAsignado && !valorInactivo && estadoLicencia(valorAsignado.fecha_vencimiento).enRiesgo && (
            <p className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${estadoLicencia(valorAsignado.fecha_vencimiento).clase}`}>
               <TriangleAlert className="size-3.5" />
               {valorAsignado.nombre}: {estadoLicencia(valorAsignado.fecha_vencimiento).texto}
            </p>
         )}
      </div>
   );
}