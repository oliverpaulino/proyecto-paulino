"use client";

import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import type { Servicio } from "@/dtos/service.dto";

interface DeleteServiceDialogProps {
   service: Servicio | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteServiceDialog({ service, onConfirm, onClose, loading }: DeleteServiceDialogProps) {
   return (
      <Dialog open={!!service} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Eliminar servicio</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas eliminar <strong>{service?.nombre}</strong>? Esta acción no se puede deshacer.
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
