"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSearch } from "@/components/table-search";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { TipoRolEmpleado } from "@/dtos/employee.dto";
import type { NominaEmpleado, ModalidadPago } from "@/stores/useNominaStore";

/**
 * Filtros de las líneas de nómina de un ciclo. Todo se resuelve en memoria:
 * los empleados del ciclo ya vienen completos de `GetEmpleados`.
 */
export interface FiltrosEmpleado {
   search: string;
   /** Puestos marcados (OPERADOR, MECANICO, …). Vacío = todos. */
   roles: Set<string>;
   /** PRODUCCION / FIJO. Vacío = ambas. */
   modalidades: Set<ModalidadPago>;
   /** Rango sobre el NETO a pagar. Texto para no pelear con el input vacío. */
   netoMin: string;
   netoMax: string;
   /** Solo los que tienen algo que revisar. */
   soloConDeducciones: boolean;
   soloConDeuda: boolean;
   soloInferidos: boolean;
}

export const FILTROS_EMPLEADO_VACIOS: FiltrosEmpleado = {
   search: "",
   roles: new Set(),
   modalidades: new Set(),
   netoMin: "",
   netoMax: "",
   soloConDeducciones: false,
   soloConDeuda: false,
   soloInferidos: false,
};

export function filtrosEmpleadoVacios(): FiltrosEmpleado {
   return { ...FILTROS_EMPLEADO_VACIOS, roles: new Set(), modalidades: new Set() };
}

export function hayFiltrosEmpleado(f: FiltrosEmpleado): boolean {
   return Boolean(
      f.search.trim() ||
         f.roles.size > 0 ||
         f.modalidades.size > 0 ||
         f.netoMin ||
         f.netoMax ||
         f.soloConDeducciones ||
         f.soloConDeuda ||
         f.soloInferidos
   );
}

export function filtrarEmpleados(
   empleados: NominaEmpleado[],
   f: FiltrosEmpleado
): NominaEmpleado[] {
   const texto = f.search.trim().toLowerCase();
   // Un campo vacío o con basura no debe filtrar nada.
   const min = Number.parseFloat(f.netoMin);
   const max = Number.parseFloat(f.netoMax);
   const tieneMin = Number.isFinite(min);
   const tieneMax = Number.isFinite(max);

   return empleados.filter((e) => {
      if (texto) {
         const nombre = (e.empleado_nombre ?? "").toLowerCase();
         const rol = (e.rol ?? "").toLowerCase();
         if (!nombre.includes(texto) && !rol.includes(texto)) return false;
      }
      if (f.roles.size > 0 && !f.roles.has(e.rol ?? "")) return false;
      if (f.modalidades.size > 0 && !f.modalidades.has(e.modalidad)) return false;

      if (tieneMin && e.neto_pagar < min) return false;
      if (tieneMax && e.neto_pagar > max) return false;

      if (f.soloConDeducciones && e.deducciones <= 0) return false;
      if (f.soloConDeuda && e.deuda_pendiente <= 0) return false;
      if (f.soloInferidos && e.conduces_inferidos <= 0) return false;

      return true;
   });
}

const MODALIDAD_LABEL: Record<ModalidadPago, string> = {
   PRODUCCION: "Por producción",
   FIJO: "Salario fijo",
};

function Chip({
   activo,
   onClick,
   children,
   className = "",
}: {
   activo: boolean;
   onClick: () => void;
   children: React.ReactNode;
   className?: string;
}) {
   return (
      <button
         type="button"
         aria-pressed={activo}
         onClick={onClick}
         className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase transition ${
            activo
               ? "border-primary bg-primary/10 text-primary"
               : "border-input text-muted-foreground hover:bg-muted/50"
         } ${className}`}
      >
         {children}
      </button>
   );
}

export function EmpleadoFilters({
   filtros,
   onChange,
   empleados,
   resultados,
}: {
   filtros: FiltrosEmpleado;
   onChange: (f: FiltrosEmpleado) => void;
   /** Lista completa del ciclo: de aquí salen los puestos que existen. */
   empleados: NominaEmpleado[];
   resultados: number;
}) {
   const activos = hayFiltrosEmpleado(filtros);

   // Solo se ofrecen los puestos presentes en el ciclo: un filtro que no puede
   // devolver nada es ruido.
   const rolesPresentes = [...new Set(empleados.map((e) => e.rol).filter(Boolean))] as string[];
   const modalidadesPresentes = [...new Set(empleados.map((e) => e.modalidad))];

   function toggleRol(rol: string) {
      const roles = new Set(filtros.roles);
      roles.has(rol) ? roles.delete(rol) : roles.add(rol);
      onChange({ ...filtros, roles });
   }

   function toggleModalidad(m: ModalidadPago) {
      const modalidades = new Set(filtros.modalidades);
      modalidades.has(m) ? modalidades.delete(m) : modalidades.add(m);
      onChange({ ...filtros, modalidades });
   }

   return (
      <div className="flex flex-col gap-2.5 rounded-xl border bg-muted/10 p-3">
         <div className="flex flex-wrap items-center gap-3">
            <TableSearch
               value={filtros.search}
               onValueChange={(search) => onChange({ ...filtros, search })}
               placeholder="Buscar empleado por nombre o puesto..."
               className="w-full sm:w-76"
            />

            {/* Rango sobre el neto: "quién cobra más de X" */}
            <div className="flex items-center gap-1.5 rounded-4xl border border-input bg-input/20 px-2.5 py-0.5">
               <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Neto RD$
               </span>
               <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="mín"
                  value={filtros.netoMin}
                  onChange={(e) => onChange({ ...filtros, netoMin: e.target.value })}
                  className="h-7 w-24 border-0 bg-transparent p-0 text-xs shadow-none"
               />
               <span className="text-xs font-bold text-muted-foreground">—</span>
               <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="máx"
                  value={filtros.netoMax}
                  onChange={(e) => onChange({ ...filtros, netoMax: e.target.value })}
                  className="h-7 w-24 border-0 bg-transparent p-0 text-xs shadow-none"
               />
            </div>

            {activos && (
               <>
                  <span className="text-xs text-muted-foreground">
                     {resultados} de {empleados.length} empleado
                     {empleados.length === 1 ? "" : "s"}
                  </span>
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => onChange(filtrosEmpleadoVacios())}
                     className="h-9 px-2.5 text-xs text-muted-foreground"
                  >
                     <RotateCcw className="mr-1 size-3.5" /> Limpiar
                  </Button>
               </>
            )}
         </div>

         <div className="flex flex-wrap items-center gap-1.5">
            {rolesPresentes.length > 1 && (
               <>
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                     Puesto:
                  </span>
                  {rolesPresentes.map((rol) => (
                     <Chip
                        key={rol}
                        activo={filtros.roles.has(rol)}
                        onClick={() => toggleRol(rol)}
                     >
                        {TipoRolEmpleado[rol as keyof typeof TipoRolEmpleado] ?? rol}
                     </Chip>
                  ))}
               </>
            )}

            {modalidadesPresentes.length > 1 && (
               <>
                  <span className="ml-2 text-[11px] font-semibold uppercase text-muted-foreground">
                     Pago:
                  </span>
                  {modalidadesPresentes.map((m) => (
                     <Chip
                        key={m}
                        activo={filtros.modalidades.has(m)}
                        onClick={() => toggleModalidad(m)}
                     >
                        {MODALIDAD_LABEL[m]}
                     </Chip>
                  ))}
               </>
            )}

            <span className="ml-2 text-[11px] font-semibold uppercase text-muted-foreground">
               Con:
            </span>
            <Chip
               activo={filtros.soloConDeducciones}
               onClick={() =>
                  onChange({ ...filtros, soloConDeducciones: !filtros.soloConDeducciones })
               }
            >
               Deducciones
            </Chip>
            <Chip
               activo={filtros.soloConDeuda}
               onClick={() => onChange({ ...filtros, soloConDeuda: !filtros.soloConDeuda })}
            >
               Deuda pendiente
            </Chip>
            <Chip
               activo={filtros.soloInferidos}
               onClick={() => onChange({ ...filtros, soloInferidos: !filtros.soloInferidos })}
               className="gap-1"
            >
               <span className="inline-flex items-center gap-1">
                  <TriangleAlert className="size-3" /> Inferidos
               </span>
            </Chip>
         </div>
      </div>
   );
}
