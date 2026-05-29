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
import type { Employee } from "@/dtos/employee.dto";

interface DeleteEmployeeDialogProps {
   employee: Employee | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteEmployeeDialog({
   employee,
   onConfirm,
   onClose,
   loading,
}: DeleteEmployeeDialogProps) {
   return (
      <Dialog open={!!employee} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Eliminar Empleado</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas eliminar a{" "}
                  <strong>{employee?.nombre}</strong>? Esta acción no se puede deshacer.
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
