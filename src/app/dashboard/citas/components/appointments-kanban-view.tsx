"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Clock, User, MoreHorizontal, Pencil, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAppointmentStore } from "@/stores/useAppointmentStore";
import { EstadoCita, type AppointmentUI } from "@/dtos/appointment.dto";
import { TableSearch } from "@/components/table-search";
import type { DragEvent } from "react";
import { AppointmentForm } from "./appointment-form";

const ESTADOS_LISTA = Object.entries(EstadoCita).map(([key, label]) => ({ key: key as keyof typeof EstadoCita, label }));

const COLUMN_THEMES: Record<string, { bg: string; border: string; badge: string; text: string }> = {
   PENDIENTE: { bg: "bg-amber-500/5", border: "border-amber-500/20", badge: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
   EN_REVISION:  { bg: "bg-purple-500/5", border: "border-purple-500/20", badge: "bg-purple-500", text: "text-purple-700 dark:text-purple-400" },
   REALIZADA:  { bg: "bg-emerald-500/5", border: "border-emerald-500/20", badge: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
   CANCELADA:   { bg: "bg-rose-500/5",  border: "border-rose-500/20",  badge: "bg-rose-500",  text: "text-rose-700 dark:text-rose-400" },
};

export function AppointmentsKanbanView() {
   const { Appointments, GetAppointments, CreateAppointment, UpdateAppointment, DeleteAppointment } = useAppointmentStore();

   const [searchInput, setSearchInput] = useState("");
   const [searchQuery, setSearchQuery] = useState("");
   const [editTarget, setEditTarget] = useState<AppointmentUI | null>(null);
   const [draggedId, setDraggedId] = useState<string | null>(null);
   const [formLoading, setFormLoading] = useState(false);

   useEffect(() => {
      GetAppointments({ limit: 100, search: searchQuery, force: true });
   }, [searchQuery, GetAppointments]);

   const filtered = Appointments.filter((a) => {
      const q = searchQuery.toLowerCase();
      return a.cliente_nombre?.toLowerCase().includes(q) || a.motivo?.toLowerCase().includes(q);
   });

   async function handleMove(id: string, nuevoEstado: string) {
      setFormLoading(true);
      try { await UpdateAppointment(id, { estado: nuevoEstado as any }); } finally { setFormLoading(false); }
   }

   async function handleDelete(id: string) {
      if (confirm("¿Estás seguro de que deseas eliminar esta cita?")) {
         await DeleteAppointment(id);
      }
   }

   return (
      <div className="flex flex-col gap-4 h-[calc(100vh-14rem)]">
         
         {/* Sub-barra del tablero */}
         <div className="flex items-center justify-between gap-4 flex-none">
            <TableSearch value={searchInput} onValueChange={setSearchInput} onSearch={setSearchQuery} placeholder="Filtrar tarjetas rápidas..." className="w-full max-w-sm" />
         </div>

         {/* Contenedor Flex de Columnas */}
         <div className="flex-1 flex gap-4 overflow-x-auto pb-4 pt-1 snap-x">
            {ESTADOS_LISTA.map((col, colIdx) => {
               const theme = COLUMN_THEMES[col.key] ?? { bg: "bg-muted/10", border: "border-border", badge: "bg-slate-400", text: "text-foreground" };
               const cards = filtered.filter((c) => c.estado === col.key);

               return (
                  <div 
                     key={col.key} 
                     onDragOver={(e) => e.preventDefault()} 
                     onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("text/plain");
                        setDraggedId(null);
                        const c = Appointments.find(x => x.id === id);
                        if (c && c.estado !== col.key) handleMove(id, col.key);
                     }} 
                     className={`w-80 shrink-0 flex flex-col max-h-full rounded-2xl border ${theme.border} ${theme.bg} bg-card/40 shadow-sm snap-start`}
                  >
                     {/* Cabecera de la columna */}
                     <div className="flex items-center justify-between p-3.5 border-b border-border/50 bg-background/40 rounded-t-2xl flex-none">
                        <div className="flex items-center gap-2">
                           <span className={`size-2.5 rounded-full ${theme.badge}`} />
                           <h3 className={`font-bold text-sm ${theme.text}`}>{col.label}</h3>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">{cards.length}</span>
                     </div>

                     {/* Contenedor de las tarjetas con scroll interno si desborda */}
                     <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                        {cards.map((cita) => (
                           <KanbanCard
                              key={cita.id}
                              cita={cita}
                              colIdx={colIdx}
                              isDragging={draggedId === cita.id}
                              onDragStart={(e: DragEvent) => {
                                 setDraggedId(cita.id);
                                 e.dataTransfer.setData("text/plain", cita.id);
                              }}
                              onMove={(nuevoEstado: string) => handleMove(cita.id, nuevoEstado)}
                              onEdit={() => setEditTarget(cita)}
                              onDelete={() => handleDelete(cita.id)}
                           />
                        ))}
                        {cards.length === 0 && (
                           <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted/40 rounded-xl p-8 text-center">
                              <p className="text-xs text-muted-foreground/60">Sin citas</p>
                           </div>
                        )}
                     </div>
                  </div>
               );
            })}
         </div>

         {/* Diálogos */}
         <Dialog open={!!editTarget} onOpenChange={(op) => !op && setEditTarget(null)}>
            <DialogContent className="sm:max-w-lg">
               <DialogHeader><DialogTitle>Reprogramar</DialogTitle></DialogHeader>
               {editTarget && <AppointmentForm initialData={editTarget} onSubmit={async (f) => { await UpdateAppointment(editTarget.id, f as any); setEditTarget(null); }} onCancel={() => setEditTarget(null)} loading={formLoading} />}
            </DialogContent>
         </Dialog>

      </div>
   );
}

function KanbanCard({ cita, isDragging, colIdx, onDragStart, onMove, onEdit, onDelete }: any) {
   const prev = ESTADOS_LISTA[colIdx - 1]?.key;
   const next = ESTADOS_LISTA[colIdx + 1]?.key;
   const f = new Date(cita.fecha);

   return (
      <div 
        draggable 
        onDragStart={onDragStart}
        className={`group relative flex flex-col rounded-xl border border-border bg-card p-3 shadow-sm hover:border-brand-blue/40 transition-all cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30 border-dashed border-brand-blue scale-95" : ""}`}
      >
         <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
               <Clock className="size-3" /> 
               {f.toLocaleDateString("es-DO", { month: "short", day: "numeric" })} • {f.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
         </div>
         <p className="mt-2 font-bold text-sm text-foreground truncate">{cita.cliente_nombre || "Sin cliente"}</p>
         <p className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{cita.motivo || "Sin motivo especificado"}</p>
         <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
               <User className="size-3 inline mr-1 text-brand-blue" />
               {cita.employee_nombre || "Sin asignar"}
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