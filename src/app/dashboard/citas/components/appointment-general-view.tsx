"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { useAppointmentStore } from "@/stores/useAppointmentStore";
import { EstadoCita, type AppointmentUI, type CreateAppointmentForm } from "@/dtos/appointment.dto";
import { TableSearch } from "@/components/table-search";
import { AppointmentTable } from "../components/appointment-table";
import { AppointmentForm } from "../components/appointment-form";

const SELECT_FILTER_CLASS = "h-9 rounded-4xl border border-input bg-input/30 px-3 py-1 text-xs outline-none text-foreground";

export function AppointmentsGeneralView() {
   const { Appointments, loading, pagination, GetAppointments, CreateAppointment, UpdateAppointment, DeleteAppointment } =
      useAppointmentStore();

   // Estados de Filtros
   const [searchInput, setSearchInput] = useState("");
   const [searchQuery, setSearchQuery] = useState("");
   const [estadoFilter, setEstadoFilter] = useState("");
   const [startDate, setStartDate] = useState("");
   const [endDate, setEndDate] = useState("");

   // Estados de Modales y Carga (Igual que en tu ClientPage)
   const [formLoading, setFormLoading] = useState(false);
   const [editTarget, setEditTarget] = useState<AppointmentUI | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<AppointmentUI | null>(null);

   useEffect(() => {
      GetAppointments({
         page: 1, limit: 20, search: searchQuery,
         state: (estadoFilter as any) || undefined,
         start: startDate || undefined, end: endDate || undefined,
         force: true,
      });
   }, [searchQuery, estadoFilter, startDate, endDate, GetAppointments]);

   const hasActiveFilters = Boolean(searchQuery || estadoFilter || startDate || endDate);

   function handleResetFilters() {
      setSearchInput(""); setSearchQuery(""); setEstadoFilter(""); setStartDate(""); setEndDate(""); GetAppointments();
   }

   async function handleEdit(data: CreateAppointmentForm) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateAppointment(editTarget.id, data as any);
         if (result instanceof Error) throw result;
         setEditTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleDelete() {
      if (!deleteTarget) return;
      setFormLoading(true);
      try {
         const result = await DeleteAppointment(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   function goToPageSafe(newPage: number) {
      GetAppointments({ page: newPage, limit: 20, force: true });
   }

   return (
      <div className="flex flex-col gap-4">
         
         {/* Barra de Filtros */}
         <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <TableSearch value={searchInput} onValueChange={setSearchInput} onSearch={setSearchQuery} placeholder="Buscar cliente o motivo..." className="w-full sm:w-64" />

            <div className="flex items-center gap-1.5 bg-input/20 px-2.5 py-1 rounded-4xl border border-input">
               <span className="text-[11px] font-semibold text-muted-foreground uppercase">Desde:</span>
               <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate} className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none" />
               <span className="text-muted-foreground text-xs font-bold">—</span>
               <span className="text-[11px] font-semibold text-muted-foreground uppercase">Hasta:</span>
               <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none" />
            </div>

            {hasActiveFilters && (
               <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 px-2.5 text-xs text-muted-foreground">
                  <RotateCcw className="size-3.5 mr-1" /> Limpiar
               </Button>
            )}
         </div>

         {/* Tabla */}
         {loading ? (
            <div className="flex items-center justify-center p-16 text-sm text-muted-foreground gap-3">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Consultando agenda...
            </div>
         ) : (
            <AppointmentTable appointments={Appointments} onEdit={setEditTarget} onDelete={setDeleteTarget} />
         )}

         {/* Paginación */}
         <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted-foreground">
            <span>Total: <strong>{pagination.total}</strong> citas registradas</span>
            <div className="flex items-center gap-1.5">
               <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => goToPageSafe(pagination.page - 1)} disabled={!pagination.hasPrev || loading}>
                  <ChevronLeft className="size-3.5 mr-1" /> Anterior
               </Button>
               <span className="font-medium px-2 text-foreground">Pág. {pagination.page} / {pagination.totalPages || 1}</span>
               <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => goToPageSafe(pagination.page + 1)} disabled={!pagination.hasNext || loading}>
                  Siguiente <ChevronRight className="size-3.5 ml-1" />
               </Button>
            </div>
         </div>

         <Dialog open={!!editTarget} onOpenChange={(op) => !op && setEditTarget(null)}>
            <DialogContent className="sm:max-w-lg">
               <DialogHeader><DialogTitle>Editar Cita</DialogTitle></DialogHeader>
               {editTarget && <AppointmentForm initialData={editTarget} onSubmit={handleEdit} onCancel={() => setEditTarget(null)} loading={formLoading} />}
            </DialogContent>
         </Dialog>

         <Dialog open={!!deleteTarget} onOpenChange={(op) => !op && setDeleteTarget(null)}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader><DialogTitle>¿Cancelar cita?</DialogTitle><DialogDescription>Vas a eliminar la cita de <strong>{deleteTarget?.cliente_nombre}</strong>.</DialogDescription></DialogHeader>
               <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDeleteTarget(null)}>Volver</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>Confirmar</Button>
               </div>
            </DialogContent>
         </Dialog>

      </div>
   );
}