"use client";

import { useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tarea, EstadoTarea } from "@/dtos/tarea.dto";
import { useTareaStore } from "@/stores/useTareaStore";
import { ESTADO_CONFIG, KANBAN_COLUMNS } from "./tarea-config";
import { TareaForm } from "./tarea-form";

export function TareaTable({ tareas }: { tareas: Tarea[] }) {
   const { proyectos, MoveTarea, DeleteTarea } = useTareaStore();
   const [editing, setEditing] = useState<Tarea | null>(null);

   if (tareas.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground">
            <span className="text-3xl opacity-30">📋</span>
            <span>No hay tareas que mostrar.</span>
         </div>
      );
   }

   const proyectoNombre = (id: string) =>
      proyectos.find((p) => p.id === id)?.nombre ?? "—";

   async function handleDelete(tarea: Tarea) {
      const result = await DeleteTarea(tarea.id);
      if (result instanceof Error) toast.error(result.message);
      else toast.success("Tarea eliminada");
   }

   async function handleEstadoChange(tarea: Tarea, estado: EstadoTarea) {
      if (tarea.estado === estado) return;
      await MoveTarea(tarea.id, estado);
   }

   return (
      <>
         <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
               <thead>
                  <tr className="bg-brand-blue">
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Tarea
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Proyecto
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Estado
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Inicio
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Fin
                     </th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Acciones
                     </th>
                  </tr>
               </thead>
               {KANBAN_COLUMNS.map((column) => {
                  const grupo = tareas.filter((t) => t.estado === column.estado);
                  if (grupo.length === 0) return null;
                  const Icon = column.icon;
                  return (
                     <tbody key={column.estado}>
                        <tr className="border-t border-border bg-muted/40">
                           <td colSpan={6} className="px-4 py-2">
                              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 <Icon className={cn("size-4", column.iconClass)} />
                                 {column.label}
                                 <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] normal-case">
                                    {grupo.length}
                                 </span>
                              </div>
                           </td>
                        </tr>
                        {grupo.map((tarea) => {
                           const isOverdue =
                              tarea.fecha_fin &&
                              isPast(new Date(tarea.fecha_fin)) &&
                              tarea.estado !== "COMPLETADA";
                           return (
                              <tr
                                 key={tarea.id}
                                 className="border-t border-border transition-colors hover:bg-brand-blue/5"
                              >
                                 <td className="px-4 py-3">
                                    <button
                                       onClick={() => setEditing(tarea)}
                                       className="text-left"
                                    >
                                       <div className="font-semibold text-brand-blue dark:text-white">
                                          {tarea.nombre}
                                       </div>
                                       {tarea.descripcion && (
                                          <div className="mt-0.5 line-clamp-1 max-w-xs text-xs text-muted-foreground">
                                             {tarea.descripcion}
                                          </div>
                                       )}
                                    </button>
                                 </td>
                                 <td className="px-4 py-3 text-xs text-muted-foreground">
                                    {proyectoNombre(tarea.proyecto_id)}
                                 </td>
                                 <td className="px-4 py-3">
                                    <DropdownMenu>
                                       <DropdownMenuTrigger asChild>
                                          <button
                                             className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                                ESTADO_CONFIG[tarea.estado].badgeClass,
                                             )}
                                          >
                                             {ESTADO_CONFIG[tarea.estado].label}
                                          </button>
                                       </DropdownMenuTrigger>
                                       <DropdownMenuContent align="start">
                                          {KANBAN_COLUMNS.map((c) => {
                                             const CIcon = c.icon;
                                             return (
                                                <DropdownMenuItem
                                                   key={c.estado}
                                                   onClick={() =>
                                                      handleEstadoChange(tarea, c.estado)
                                                   }
                                                >
                                                   <CIcon
                                                      className={cn("mr-2 size-4", c.iconClass)}
                                                   />
                                                   {c.label}
                                                </DropdownMenuItem>
                                             );
                                          })}
                                       </DropdownMenuContent>
                                    </DropdownMenu>
                                 </td>
                                 <td className="px-4 py-3 text-xs text-muted-foreground">
                                    {tarea.fecha_inicio
                                       ? format(new Date(tarea.fecha_inicio), "dd MMM yyyy", {
                                            locale: es,
                                         })
                                       : "—"}
                                 </td>
                                 <td
                                    className={cn(
                                       "px-4 py-3 text-xs",
                                       isOverdue
                                          ? "font-medium text-brand-red"
                                          : "text-muted-foreground",
                                    )}
                                 >
                                    {tarea.fecha_fin
                                       ? format(new Date(tarea.fecha_fin), "dd MMM yyyy", {
                                            locale: es,
                                         })
                                       : "—"}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                       <button
                                          onClick={() => setEditing(tarea)}
                                          className="rounded-md p-1.5 text-brand-blue transition-colors hover:bg-brand-blue/10"
                                          title="Editar"
                                       >
                                          <Pencil className="size-4" />
                                       </button>
                                       <DropdownMenu modal={false}>
                                          <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                             </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                             <DropdownMenuItem onClick={() => setEditing(tarea)}>
                                                <Pencil className="mr-2 size-4" />
                                                Editar
                                             </DropdownMenuItem>
                                             <DropdownMenuSeparator />
                                             <DropdownMenuItem
                                                className="text-brand-red focus:text-brand-red"
                                                onClick={() => handleDelete(tarea)}
                                             >
                                                <Trash2 className="mr-2 size-4" />
                                                Eliminar
                                             </DropdownMenuItem>
                                          </DropdownMenuContent>
                                       </DropdownMenu>
                                    </div>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  );
               })}
            </table>
         </div>

         <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
               <DialogHeader className="sr-only">
                  <DialogTitle>Editar tarea</DialogTitle>
                  <DialogDescription>Modifica los detalles de la tarea</DialogDescription>
               </DialogHeader>
               {editing && <TareaForm tarea={editing} onClose={() => setEditing(null)} />}
            </DialogContent>
         </Dialog>
      </>
   );
}
