"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useAppointmentStore } from "@/stores/useAppointmentStore";
import { type AppointmentUI, type CreateAppointmentForm } from "@/dtos/appointment.dto";
import { AppointmentTable } from "../components/appointment-table";
import { AppointmentForm } from "../components/appointment-form";
import { PageSizeSelector } from "@/components/page-size-selector";

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

   function handlePageSizeChange(newSize: number) {
      GetAppointments({ page: 1, limit: newSize, force: true });
   }

   const { page, limit, total, totalPages } = pagination;
   const from = total === 0 ? 0 : (page - 1) * limit + 1;
   const to = Math.min(page * limit, total);

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

         {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
               <PageSizeSelector value={limit} onChange={handlePageSizeChange} />
               <div className="flex flex-wrap items-center gap-4">
                  <span>
                     Mostrando {from}–{to} de {total}
                  </span>
                  <div className="flex gap-2">
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPrev || loading}
                        onClick={() => GetAppointments({ page: page - 1, limit, force: true })}
                     >
                        <ChevronLeft className="size-4" /> Anterior
                     </Button>
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNext || loading}
                        onClick={() => GetAppointments({ page: page + 1, limit, force: true })}
                     >
                        Siguiente <ChevronRight className="size-4" />
                     </Button>
                  </div>
               </div>
            </div>
         )}

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
