"use client";

import { useState, useMemo, Fragment } from "react";
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { CategoriaGasto } from "@/dtos/categoria-gasto.dto";
import { GrupoGastoEnum } from "@/dtos/categoria-gasto.dto";

interface CategoriaGastoTableProps {
   categorias: CategoriaGasto[];
   onEdit: (categoria: CategoriaGasto) => void;
   onDelete: (categoria: CategoriaGasto) => void;
}

const GRUPO_BADGE: Record<string, string> = {
   OPERATIVO: "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   ADMINISTRATIVO: "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
   FINANCIERO: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   OTRO: "bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-600",
};

export function CategoriaGastoTable({ categorias, onEdit, onDelete }: CategoriaGastoTableProps) {
   const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
      const initial: Record<string, boolean> = {};
      Object.keys(GrupoGastoEnum).forEach((k) => {
         initial[k] = true;
      });
      return initial;
   });

   const toggleGroup = (grupo: string) => {
      setExpandedGroups((prev) => ({ ...prev, [grupo]: !prev[grupo] }));
   };

   const groupedCategorias = useMemo(() => {
      const groups: Record<string, CategoriaGasto[]> = {};

      Object.keys(GrupoGastoEnum).forEach((key) => {
         groups[key] = [];
      });

      categorias.forEach((categoria) => {
         if (groups[categoria.grupo]) {
            groups[categoria.grupo].push(categoria);
         } else {
            if (!groups["OTRO"]) groups["OTRO"] = [];
            groups["OTRO"].push(categoria);
         }
      });

      Object.keys(groups).forEach((key) => {
         if (groups[key].length === 0) {
            delete groups[key];
         } else {
            groups[key].sort((a, b) => a.nombre.localeCompare(b.nombre));
         }
      });

      return groups;
   }, [categorias]);

   if (categorias.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">🏷️</span>
            <span>No hay categorías de gastos registradas.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Nombre de la Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {Object.entries(groupedCategorias).map(([grupo, grupoCategorias]) => {
                  const isExpanded = expandedGroups[grupo];
                  const grupoNombre = GrupoGastoEnum[grupo as keyof typeof GrupoGastoEnum] ?? grupo;

                  return (
                     <Fragment key={grupo}>
                        {/* FILA CABECERA DE GRUPO */}
                        <tr
                           className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-y border-border transition-colors group"
                           onClick={() => toggleGroup(grupo)}
                        >
                           <td colSpan={3} className="px-4 py-2.5 select-none">
                              <div className="flex items-center gap-3">
                                 <button className="text-muted-foreground group-hover:text-foreground transition-colors">
                                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                 </button>
                                 <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                                       GRUPO_BADGE[grupo] ?? GRUPO_BADGE["OTRO"]
                                    }`}
                                 >
                                    {grupoNombre}
                                 </span>
                                 <span className="text-xs text-muted-foreground font-medium">
                                    ({grupoCategorias.length} {grupoCategorias.length === 1 ? "categoría" : "categorías"})
                                 </span>
                              </div>
                           </td>
                        </tr>

                        {/* FILAS DE CATEGORÍAS */}
                        {isExpanded &&
                           grupoCategorias.map((categoria) => (
                              <tr
                                 key={categoria.id}
                                 className="border-b border-border/50 hover:bg-brand-blue/5 transition-colors last:border-b-0"
                              >
                                 <td className="px-4 py-3 pl-8">
                                    <div className="font-semibold text-brand-blue dark:text-white">{categoria.nombre}</div>
                                 </td>
                                 <td className="px-4 py-3 text-muted-foreground text-xs font-medium">
                                    {grupoNombre}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                       <button
                                          onClick={() => onEdit(categoria)}
                                          className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                                          title="Editar"
                                       >
                                          <Pencil className="size-4" />
                                       </button>
                                       <button
                                          onClick={() => onDelete(categoria)}
                                          className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                                          title="Eliminar"
                                       >
                                          <Trash2 className="size-4" />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                     </Fragment>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
}