"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useAppointmentStore } from "@/stores/useAppointmentStore";
import { type AppointmentUI, type CreateAppointmentForm } from "@/dtos/appointment.dto";
import { AppointmentTable } from "../components/appointment-table";
import { AppointmentForm } from "../components/appointment-form";

export function AppointmentsGeneralView() {
   const { Appointments, loading, pagination, GetAppointments, UpdateAppointment, DeleteAppointment } =
      useAppointmentStore();

   const [formLoading, setFormLoading] = useState(false);
   const [editTarget, setEditTarget] = useState<AppointmentUI | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<AppointmentUI | null>(null);

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
         
         {loading ? (
            <div className="flex items-center justify-center p-16 text-sm text-muted-foreground gap-3">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Consultando agenda...
            </div>
         ) : (
            <AppointmentTable appointments={Appointments} onEdit={setEditTarget} onDelete={setDeleteTarget} />
         )}

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