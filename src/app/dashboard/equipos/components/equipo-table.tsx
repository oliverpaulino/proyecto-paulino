"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { Equipo } from "@/dtos/equipo.dto";
import { ESTADO_BADGE, ESTADO_LABEL } from "./equipo-labels";

interface EquipoTableProps {
   equipos: Equipo[];
   onEdit: (equipo: Equipo) => void;
   onDelete: (equipo: Equipo) => void;
}

export function EquipoTable({ equipos, onEdit, onDelete }: EquipoTableProps) {
   if (equipos.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">🚜</span>
            <span>No hay equipos que mostrar.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Equipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Cobra en</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Costo/unidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Placa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Modelo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Año</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {equipos.map((equipo) => (
                  <tr
                     key={equipo.id}
                     className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                  >
                     <td className="px-4 py-3">
                        <Link
                           href={`/dashboard/equipos/${equipo.id}`}
                           className="font-semibold text-brand-blue hover:underline dark:text-white"
                        >
                           {equipo.nombre}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                           {new Date(equipo.created_at).toLocaleDateString("es-DO")}
                        </div>
                     </td>
                     <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-brand-blue/30 bg-brand-blue/10 px-2.5 py-0.5 text-xs font-semibold text-brand-blue dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                           {equipo.categoria_nombre}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">
                        <span>{equipo.cobra_en}</span>
                        {equipo.cobra_minimo != null && (
                           <span className="ml-1 text-muted-foreground/60">(mín. {equipo.cobra_minimo})</span>
                        )}
                     </td>
                     <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[equipo.estado]}`}>
                           {ESTADO_LABEL[equipo.estado]}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-right font-mono text-xs">
                        {Number(equipo.costo_por_hora).toLocaleString("es-DO", {
                           style: "currency",
                           currency: "DOP",
                           minimumFractionDigits: 2,
                        })}
                     </td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">
                        {equipo.placa ?? "—"}
                     </td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">
                        {equipo.modelo ?? "—"}
                     </td>
                     <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {equipo.ano ?? "—"}
                     </td>
                     <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <button
                              onClick={() => onEdit(equipo)}
                              className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                              title="Editar"
                           >
                              <Pencil className="size-4" />
                           </button>
                           <button
                              onClick={() => onDelete(equipo)}
                              className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                              title="Eliminar"
                           >
                              <Trash2 className="size-4" />
                           </button>
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
