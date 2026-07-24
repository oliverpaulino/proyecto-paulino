"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MoreHorizontal, Trash2, GripVertical } from "lucide-react";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tarea } from "@/dtos/tarea.dto";
import { useTareaStore } from "@/stores/useTareaStore";
import { ESTADO_CONFIG } from "./tarea-config";
import { TareaForm } from "./tarea-form";
import { PermissionGuard } from "@/components/permission-guard";

export function TareaCard({ tarea }: { tarea: Tarea }) {
   const [open, setOpen] = useState(false);
   const { DeleteTarea, proyectos } = useTareaStore();

   const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: tarea.id });

   const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
   };

   const config = ESTADO_CONFIG[tarea.estado];
   const proyectoNombre = proyectos.find((p) => p.id === tarea.proyecto_id)?.nombre;
   const isOverdue =
      tarea.fecha_fin &&
      isPast(new Date(tarea.fecha_fin)) &&
      tarea.estado !== "COMPLETADA" &&
      tarea.estado !== "CANCELADA";

   async function handleDelete() {
      const result = await DeleteTarea(tarea.id);
      if (result instanceof Error) {
         toast.error(result.message);
      } else {
         toast.success("Tarea eliminada");
      }
   }

   return (
      <div
         ref={setNodeRef}
         style={style}
         className={cn("group/card", isDragging && "z-50")}
      >
         <div
            className={cn(
               "rounded-lg border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md",
               config.borderClass,
            )}
         >
            <div className="flex items-start gap-1 p-3">
               {/* Drag handle */}
               <button
                  {...attributes}
                  {...listeners}
                  className="mt-0.5 cursor-grab touch-none rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground active:cursor-grabbing group-hover/card:opacity-100"
                  aria-label="Arrastrar tarea"
               >
                  <GripVertical className="size-4" />
               </button>

               {/* Click body → edit dialog */}
               <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                     <button className="flex-1 text-left">
                        <h3 className="line-clamp-2 text-sm font-semibold text-brand-blue dark:text-white">
                           {tarea.nombre}
                        </h3>
                        {tarea.descripcion && (
                           <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {tarea.descripcion}
                           </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                           {proyectoNombre ? (
                              <span className="inline-flex items-center rounded bg-brand-yellow/25 px-1.5 py-0.5 text-[10px] font-medium text-brand-black dark:text-brand-yellow">
                                 {proyectoNombre}
                              </span>
                           ) : (
                              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium italic text-muted-foreground">
                                 Sin proyecto
                              </span>
                           )}
                           {tarea.fecha_fin && (
                              <span
                                 className={cn(
                                    "inline-flex items-center gap-1 text-[10px]",
                                    isOverdue
                                       ? "font-medium text-brand-red"
                                       : "text-muted-foreground",
                                 )}
                              >
                                 <CalendarIcon className="size-3" />
                                 {format(new Date(tarea.fecha_fin), "dd MMM", { locale: es })}
                              </span>
                           )}
                        </div>
                     </button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
                     <DialogHeader className="sr-only">
                        <DialogTitle>Editar tarea</DialogTitle>
                        <DialogDescription>Modifica los detalles de la tarea</DialogDescription>
                     </DialogHeader>
                     <TareaForm tarea={tarea} onClose={() => setOpen(false)} />
                  </DialogContent>
               </Dialog>

               {/* Overflow menu */}
               <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground"
                     >
                        <MoreHorizontal className="size-4" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <PermissionGuard resource="task" action="delete">
                        <DropdownMenuItem
                           className="text-brand-red focus:text-brand-red"
                           onClick={handleDelete}
                        >
                           <Trash2 className="mr-2 size-4" />
                           Eliminar
                        </DropdownMenuItem>
                     </PermissionGuard>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>
      </div>
   );
}
