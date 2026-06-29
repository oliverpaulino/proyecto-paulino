"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
   DndContext,
   useSensors,
   useSensor,
   MouseSensor,
   TouchSensor,
   DragEndEvent,
   DragStartEvent,
   DragOverlay,
   closestCorners,
   useDroppable,
   UniqueIdentifier,
   defaultDropAnimationSideEffects,
   DropAnimation,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Tarea, EstadoTarea } from "@/dtos/tarea.dto";
import { useTareaStore } from "@/stores/useTareaStore";
import { KANBAN_COLUMNS, type EstadoConfig } from "./tarea-config";
import { TareaCard } from "./tarea-card";
import { TareaForm } from "./tarea-form";

const dropAnimation: DropAnimation = {
   sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0.4" } },
   }),
};

export function TareaKanban({ proyectoId }: { proyectoId?: string }) {
   const { tareas, MoveTarea } = useTareaStore();
   const [activeTarea, setActiveTarea] = useState<Tarea | null>(null);
   const [isMounted, setIsMounted] = useState(false);

   useEffect(() => setIsMounted(true), []);

   const sensors = useSensors(
      useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
      useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
   );

   const findTarea = (id: string) => tareas.find((t) => t.id === id) ?? null;

   const tareasForColumn = (estado: EstadoTarea) =>
      tareas.filter((t) => t.estado === estado);

   // Determine the column (estado) an id belongs to — a column id or a card id.
   const findColumn = (id: UniqueIdentifier): EstadoTarea | null => {
      if (KANBAN_COLUMNS.some((c) => c.estado === id)) return id as EstadoTarea;
      const tarea = findTarea(id as string);
      return tarea ? tarea.estado : null;
   };

   const handleDragStart = ({ active }: DragStartEvent) => {
      setActiveTarea(findTarea(active.id as string));
   };

   const handleDragEnd = ({ active, over }: DragEndEvent) => {
      setActiveTarea(null);
      if (!over) return;

      const from = findColumn(active.id);
      const to = findColumn(over.id);
      if (!from || !to || from === to) return;

      MoveTarea(active.id as string, to);
   };

   return (
      <div className="flex gap-4 overflow-x-auto pb-4">
         <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
         >
            {KANBAN_COLUMNS.map((column) => (
               <KanbanColumn
                  key={column.estado}
                  column={column}
                  tareas={tareasForColumn(column.estado)}
                  proyectoId={proyectoId}
               />
            ))}

            {isMounted &&
               createPortal(
                  <DragOverlay dropAnimation={dropAnimation}>
                     {activeTarea ? (
                        <div className="rotate-2 scale-105 opacity-95 drop-shadow-2xl">
                           <TareaCard tarea={activeTarea} />
                        </div>
                     ) : null}
                  </DragOverlay>,
                  document.body,
               )}
         </DndContext>
      </div>
   );
}

function KanbanColumn({
   column,
   tareas,
   proyectoId,
}: {
   column: EstadoConfig;
   tareas: Tarea[];
   proyectoId?: string;
}) {
   const { setNodeRef, isOver } = useDroppable({ id: column.estado });
   const [createOpen, setCreateOpen] = useState(false);

   return (
      <div
         ref={setNodeRef}
         className={cn(
            "flex h-fit min-h-[300px] w-80 min-w-[280px] shrink-0 flex-col gap-2 rounded-xl border bg-card p-3 transition-all",
            isOver
               ? "border-brand-blue/40 bg-brand-blue/5 ring-2 ring-brand-blue/10"
               : "border-border",
         )}
      >
         <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className={cn("size-2.5 rounded-full", column.dotClass)} />
               <h3 className="text-sm font-bold text-brand-blue dark:text-white">
                  {column.label}
               </h3>
               <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {tareas.length}
               </span>
            </div>
            <Button
               variant="ghost"
               size="icon"
               className="size-7"
               onClick={() => setCreateOpen(true)}
               aria-label="Agregar tarea"
            >
               <PlusCircle className="size-4" />
            </Button>
         </div>

         <SortableContext
            items={tareas.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
         >
            <div className="flex min-h-[200px] flex-1 flex-col gap-2">
               {tareas.map((tarea) => (
                  <TareaCard key={tarea.id} tarea={tarea} />
               ))}
               {tareas.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand-blue/15 py-8 text-center text-muted-foreground">
                     <span className="text-2xl opacity-30">📋</span>
                     <p className="text-xs">Arrastra tareas aquí</p>
                  </div>
               )}
            </div>
         </SortableContext>

         <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
               <DialogHeader className="px-6 pt-6">
                  <DialogTitle>Nueva tarea</DialogTitle>
                  <DialogDescription>
                     Crear una tarea en &ldquo;{column.label}&rdquo;
                  </DialogDescription>
               </DialogHeader>
               <TareaForm
                  proyectoId={proyectoId}
                  defaultEstado={column.estado}
                  onClose={() => setCreateOpen(false)}
               />
            </DialogContent>
         </Dialog>
      </div>
   );
}
