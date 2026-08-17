"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2, User } from "lucide-react";
import type { Equipo } from "@/dtos/equipo.dto";
import { ESTADO_BADGE, ESTADO_LABEL } from "./equipo-labels";
import { PermissionGuard } from "@/components/permission-guard";
import { useEquipoStore } from "@/stores/useEquipoStore";
import { useEffect, useState } from "react";
import { OperadorAsignable } from "@/dtos/employee.dto";
import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";
import { useEmployeeStore } from "@/stores/useEmployeeStore";

interface EquipoTableProps {
   equipos: Equipo[];
   onEdit: (equipo: Equipo) => void;
   onDelete: (equipo: Equipo) => void;
}

export function EquipoTable({ equipos, onEdit, onDelete }: EquipoTableProps) {
   const { GetOperators, Operators } = useEmployeeStore();
   if (equipos.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">🚜</span>
            <span>No hay equipos que mostrar.</span>
         </div>
      );
   }

   useEffect(() => {
      const fetchOperadores = async () => {
         try {
            await GetOperators();
         } catch (error) {
            console.error("Error fetching operadores:", error);
         }
      };

      fetchOperadores();
   }, [GetOperators]);



   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="w-10 px-3 py-3"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Equipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Operador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Estado</th>
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
                     <td className="px-3 py-3 text-center">
                        <Link
                           href={`/dashboard/equipos/${equipo.id}`}
                           className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                           title="Ver detalle"
                        >
                           <Eye className="size-4" />
                        </Link>
                     </td>
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
                        <span className="inline-block rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                           EQU-{String(equipo.referencia).padStart(3, "0")}
                        </span>
                     </td>
                     <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-brand-blue/30 bg-brand-blue/10 px-2.5 py-0.5 text-xs font-semibold text-brand-blue dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                           {equipo.categoria_nombre}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-xs text-muted-foreground flex flex-col">
                        {(() => {
                           const operadorAsignado = Operators.find((o) => o.id === equipo.operador_id);
                           return (
                              <>
                                 <div>
                                    <User className="mr-1 size-4 bg-brand-blue rounded-full text-white inline-block" />
                                    <span>{operadorAsignado?.nombre || "Sin operador asignado"}</span>
                                    {operadorAsignado && operadorAsignado.activo === false && (
                                       <span className="ml-1.5 inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                                          Inactivo
                                       </span>
                                    )}
                                 </div>
                                 <span>{operadorAsignado?.identificacion || "—"}</span>
                              </>
                           );
                        })()}
                     </td>
                     <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[equipo.estado]}`}>
                           {ESTADO_LABEL[equipo.estado]}
                        </span>
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
                           <PermissionGuard resource="machinery" action="update">
                              <button
                                 onClick={() => onEdit(equipo)}
                                 className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                                 title="Editar"
                              >
                                 <Pencil className="size-4" />
                              </button>
                           </PermissionGuard>
                           <PermissionGuard resource="machinery" action="delete">
                              <button
                                 onClick={() => onDelete(equipo)}
                                 className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                                 title="Eliminar"
                              >
                                 <Trash2 className="size-4" />
                              </button>
                           </PermissionGuard>
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
