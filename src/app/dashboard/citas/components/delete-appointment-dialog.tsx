"use client";

import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Appointment } from "@/dtos/appointment.dto";

interface DeleteAppointmentDialogProps {
   appointment: Appointment | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteEmployeeDialog({
   appointment,
   onConfirm,
   onClose,
   loading,
}: DeleteAppointmentDialogProps) {
   return (
      <Dialog open={!!appointment} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Eliminar Cita</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.
               </DialogDescription>
            </DialogHeader>
            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
               </Button>
               <Button variant="destructive" onClick={onConfirm} disabled={loading}>
                  {loading ? "Eliminando…" : "Eliminar"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
