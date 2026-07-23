"use client";

import { useState, useMemo, Fragment } from "react";
import { Pencil, Trash2, Star, ChevronDown, ChevronRight } from "lucide-react";
import type { Unit } from "@/dtos/unit.dto";
import { TipoUnidadEnum } from "@/dtos/unit.dto";
import { PermissionGuard } from "@/components/permission-guard";

interface UnitTableProps {
   units: Unit[];
   onEdit: (unit: Unit) => void;
   onDelete: (unit: Unit) => void;
}

const TIPO_BADGE: Record<string, string> = {
   LONGITUD: "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   AREA: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   VOLUMEN: "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
   TIEMPO: "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
   FRECUENCIA: "bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
   MASA: "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
   OTRO: "bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-600",
};

export function UnitTable({ units, onEdit, onDelete }: UnitTableProps) {
   // Estado para controlar qué grupos están expandidos (por defecto, todos expandidos)
   const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
      const initial: Record<string, boolean> = {};
      Object.keys(TipoUnidadEnum).forEach((k) => {
         initial[k] = true;
      });
      return initial;
   });

   const toggleGroup = (tipo: string) => {
      setExpandedGroups((prev) => ({ ...prev, [tipo]: !prev[tipo] }));
   };

   // Agrupar y ordenar las unidades
   const groupedUnits = useMemo(() => {
      const groups: Record<string, Unit[]> = {};

      // 1. Inicializar grupos en el orden del Enum (para mantener un orden lógico)
      Object.keys(TipoUnidadEnum).forEach((key) => {
         groups[key] = [];
      });

      // 2. Distribuir las unidades en sus respectivos grupos
      units.forEach((unit) => {
         if (groups[unit.tipo_unidad]) {
            groups[unit.tipo_unidad].push(unit);
         } else {
            if (!groups["OTRO"]) groups["OTRO"] = [];
            groups["OTRO"].push(unit);
         }
      });

      // 3. Limpiar grupos vacíos y ordenar internamente
      Object.keys(groups).forEach((key) => {
         if (groups[key].length === 0) {
            delete groups[key];
         } else {
            // Ordenamos: La unidad base primero, luego alfabéticamente
            groups[key].sort((a, b) => {
               const isBaseA = Number(a.factor_a_base) === 1 && a.tipo_unidad !== "OTRO";
               const isBaseB = Number(b.factor_a_base) === 1 && b.tipo_unidad !== "OTRO";

               if (isBaseA && !isBaseB) return -1;
               if (!isBaseA && isBaseB) return 1;
               return a.nombre.localeCompare(b.nombre);
            });
         }
      });

      return groups;
   }, [units]);

   if (units.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">📏</span>
            <span>No hay unidades que mostrar.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Unidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Abreviatura</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-blue-200">Factor Base</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {Object.entries(groupedUnits).map(([tipo, tipoUnits]) => {
                  const isExpanded = expandedGroups[tipo];
                  const tipoNombre = TipoUnidadEnum[tipo as keyof typeof TipoUnidadEnum] ?? tipo;

                  return (
                     <Fragment key={tipo}>
                        {/* FILA CABECERA DE GRUPO */}
                        <tr
                           className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-y border-border transition-colors group"
                           onClick={() => toggleGroup(tipo)}
                        >
                           <td colSpan={5} className="px-4 py-2.5 select-none">
                              <div className="flex items-center gap-3">
                                 <button className="text-muted-foreground group-hover:text-foreground transition-colors">
                                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                 </button>
                                 <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                                       TIPO_BADGE[tipo] ?? TIPO_BADGE["OTRO"]
                                    }`}
                                 >
                                    {tipoNombre}
                                 </span>
                                 <span className="text-xs text-muted-foreground font-medium">
                                    ({tipoUnits.length} {tipoUnits.length === 1 ? "unidad" : "unidades"})
                                 </span>
                              </div>
                           </td>
                        </tr>

                        {/* FILAS DE UNIDADES (Si el grupo está expandido) */}
                        {isExpanded &&
                           tipoUnits.map((unit) => {
                              const isBaseUnit = Number(unit.factor_a_base) === 1 && unit.tipo_unidad !== "OTRO";

                              return (
                                 <tr
                                    key={unit.id}
                                    className="border-b border-border/50 hover:bg-brand-blue/5 transition-colors last:border-b-0"
                                 >
                                    <td className="px-4 py-3 pl-8"> {/* pl-8 para darle un efecto de indentación o "jerarquía" bajo el grupo */}
                                       <div className="font-semibold text-brand-blue dark:text-white">{unit.nombre}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono font-medium text-muted-foreground">
                                       {unit.abreviatura}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">
                                       {/* Opcional: Como ya está agrupado, este texto se vuelve redundante, pero lo mantenemos ligero */}
                                       {tipoNombre}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                       {isBaseUnit ? (
                                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                                             <Star className="size-3" fill="currentColor" /> Base
                                          </span>
                                       ) : unit.tipo_unidad === "OTRO" ? (
                                          <span className="text-muted-foreground/50">-</span>
                                       ) : (
                                          <span className="font-mono text-xs">{Number(unit.factor_a_base)}</span>
                                       )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                       <div className="flex items-center justify-end gap-1">
                                          <PermissionGuard resource="category" action="update">
                                          <button
                                             onClick={() => onEdit(unit)}
                                             className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                                             title="Editar"
                                          >
                                             <Pencil className="size-4" />
                                          </button>
                                          </PermissionGuard>
                                          <PermissionGuard resource="category" action="delete">
                                          <button
                                             onClick={() => !isBaseUnit && onDelete(unit)}
                                             disabled={isBaseUnit}
                                             className={`rounded-md p-1.5 transition-colors ${
                                                isBaseUnit
                                                   ? "text-muted-foreground/30 cursor-not-allowed"
                                                   : "text-brand-red hover:bg-brand-red/10"
                                             }`}
                                             title={isBaseUnit ? "No puedes eliminar la unidad base de esta categoría" : "Eliminar"}
                                          >
                                             <Trash2 className="size-4" />
                                          </button>
                                          </PermissionGuard>
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                     </Fragment>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
}