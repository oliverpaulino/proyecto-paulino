"use client";

import { useEffect, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Clock, User, MoreHorizontal, ArrowRight, ArrowLeft, CheckSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useTareaStore } from "@/stores/useTareaStore";
import type { Tarea, EstadoTarea } from "@/dtos/tarea.dto";
import { TableSearch } from "@/components/table-search";
import { TareaForm } from "./tarea-form";

const ESTADOS_LISTA: { key: EstadoTarea; label: string }[] = [
   { key: "PENDIENTE" as EstadoTarea, label: "Pendiente" },
   { key: "EN_PROCESO" as EstadoTarea, label: "En Proceso" },
   { key: "COMPLETADA" as EstadoTarea, label: "Completada" },
   { key: "CANCELADA" as EstadoTarea, label: "Cancelada" },
];

const COLUMN_THEMES: Record<string, { bg: string; border: string; badge: string; text: string }> = {
   PENDIENTE:   { bg: "bg-slate-500/5",   border: "border-slate-500/20",   badge: "bg-slate-500",   text: "text-slate-700 dark:text-slate-400" },
   EN_PROCESO:  { bg: "bg-brand-blue/5",  border: "border-brand-blue/20",  badge: "bg-brand-blue",  text: "text-brand-blue dark:text-blue-400" },
   COMPLETADA:  { bg: "bg-emerald-500/5", border: "border-emerald-500/20", badge: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
   CANCELADA:   { bg: "bg-rose-500/5",    border: "border-rose-500/20",    badge: "bg-rose-500",    text: "text-rose-700 dark:text-rose-400" },
};

export function TareaKanban({ proyectoId }: { proyectoId?: string }) {
   const { tareas, MoveTarea, DeleteTarea } = useTareaStore();

   const [searchInput, setSearchInput] = useState("");
   const [searchQuery, setSearchQuery] = useState("");
   const [editTarget, setEditTarget] = useState<Tarea | null>(null);
   const [draggedId, setDraggedId] = useState<string | null>(null);
   const [formLoading, setFormLoading] = useState(false);

   const tareasFiltradas = tareas.filter((t) => {
      const matchProyecto = proyectoId ? t.proyecto_id === proyectoId : true;
      const q = searchQuery.toLowerCase();
      const matchSearch = t.nombre?.toLowerCase().includes(q) || t.descripcion?.toLowerCase().includes(q);
      return matchProyecto && matchSearch;
   });

   async function handleMove(id: string, nuevoEstado: string) {
      setFormLoading(true);
      try { 
         await MoveTarea(id, nuevoEstado as EstadoTarea); 
      } finally { 
         setFormLoading(false); 
      }
   }

   async function handleDelete(id: string) {
      if (confirm("¿Estás seguro de que deseas eliminar esta tarea?")) {
         await DeleteTarea(id);
      }
   }

   return (
      <div className="flex flex-col gap-4 h-[calc(100vh-14rem)] overflow-x-auto">
         
         {/* Sub-barra del tablero */}
         <div className="flex flex-none items-center justify-between gap-4">
            <TableSearch 
               value={searchInput} 
               onValueChange={setSearchInput} 
               onSearch={setSearchQuery} 
               placeholder="Filtrar tareas rápidas..." 
               className="w-full max-w-sm" 
            />
         </div>

         {/* Contenedor Flex de Columnas */}
         <div className="flex flex-1 snap-x gap-4 overflow-x-auto pt-1 pb-4">
            {ESTADOS_LISTA.map((col, colIdx) => {
               const theme = COLUMN_THEMES[col.key] ?? { bg: "bg-muted/10", border: "border-border", badge: "bg-slate-400", text: "text-foreground" };
               const cards = tareasFiltradas.filter((c) => c.estado === col.key);

               return (
                  <div 
                     key={col.key} 
                     onDragOver={(e) => e.preventDefault()} 
                     onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("text/plain");
                        setDraggedId(null);
                        const t = tareas.find((x) => x.id === id);
                        if (t && t.estado !== col.key) handleMove(id, col.key);
                     }} 
                     className={`flex max-h-full w-80 shrink-0 snap-start flex-col rounded-2xl border bg-card/40 shadow-sm ${theme.border} ${theme.bg}`}
                  >
                     {/* Cabecera de la columna */}
                     <div className="flex flex-none items-center justify-between rounded-t-2xl border-b border-border/50 bg-background/40 p-3.5">
                        <div className="flex items-center gap-2">
                           <span className={`size-2.5 rounded-full ${theme.badge}`} />
                           <h3 className={`text-sm font-bold ${theme.text}`}>{col.label}</h3>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">{cards.length}</span>
                     </div>

                     {/* Contenedor de las tarjetas con scroll interno si desborda */}
                     <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                        {cards.map((tarea) => (
                           <TareaKanbanCard
                              key={tarea.id}
                              tarea={tarea}
                              colIdx={colIdx}
                              isDragging={draggedId === tarea.id}
                              onDragStart={(e: DragEvent) => {
                                 setDraggedId(tarea.id);
                                 e.dataTransfer.setData("text/plain", tarea.id);
                              }}
                              onMove={(nuevoEstado: string) => handleMove(tarea.id, nuevoEstado)}
                              onEdit={() => setEditTarget(tarea)}
                              onDelete={() => handleDelete(tarea.id)}
                           />
                        ))}
                        {cards.length === 0 && (
                           <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-muted/40 p-8 text-center">
                              <p className="text-xs text-muted-foreground/60">Sin tareas</p>
                           </div>
                        )}
                     </div>
                  </div>
               );
            })}
         </div>

         {/* Diálogos */}
         <Dialog open={!!editTarget} onOpenChange={(op) => !op && setEditTarget(null)}>
            <DialogContent className="max-h-[90vh] sm:max-w-lg overflow-y-auto p-0">
               <DialogHeader className="px-6 pt-6"><DialogTitle>Editar Tarea</DialogTitle></DialogHeader>
               {editTarget && (
                  <TareaForm 
                     tarea={editTarget}
                     proyectoId={proyectoId}
                     onClose={() => setEditTarget(null)} 
                  />
               )}
            </DialogContent>
         </Dialog>

      </div>
   );
}

function TareaKanbanCard({ tarea, isDragging, colIdx, onDragStart, onMove, onEdit, onDelete }: any) {
   const prev = ESTADOS_LISTA[colIdx - 1]?.key;
   const next = ESTADOS_LISTA[colIdx + 1]?.key;
   
   const f = tarea.fechaLimite ? new Date(tarea.fechaLimite) : null;

   return (
      <div 
        draggable 
        onDragStart={onDragStart}
        className={`group relative flex cursor-grab flex-col rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-brand-blue/40 active:cursor-grabbing ${isDragging ? "scale-95 border-dashed border-brand-blue opacity-30" : ""}`}
      >
         <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-muted-foreground">
            {f ? (
               <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                  <Clock className="size-3" /> 
                  {f.toLocaleDateString("es-DO", { month: "short", day: "numeric" })}
               </span>
            ) : (
               <span className="flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5">
                  <CheckSquare className="size-3" /> Sin fecha
               </span>
            )}
         </div>
         <p className="mt-2 truncate text-sm font-bold text-foreground">{tarea.titulo || "Sin título"}</p>
         <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">{tarea.descripcion || "Sin descripción"}</p>
         
         <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
            <span className="max-w-[120px] truncate text-[11px] text-muted-foreground">
               <User className="inline mr-1 size-3 text-brand-blue" />
               {tarea.asignado_nombre || "Sin asignar"}
            </span>
            
            <div className="flex items-center gap-0.5">
               {prev && <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-foreground" onClick={() => onMove(prev)}><ArrowLeft className="size-3.5" /></Button>}
               {next && <Button variant="ghost" size="icon" className="size-6 text-brand-blue hover:bg-brand-blue/10" onClick={() => onMove(next)}><ArrowRight className="size-3.5" /></Button>}
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon" className="size-6"><MoreHorizontal className="size-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem onClick={onEdit} className="text-xs">Editar</DropdownMenuItem>
                     <DropdownMenuItem onClick={onDelete} className="text-xs text-destructive focus:bg-destructive/10">Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>
      </div>
   );
}