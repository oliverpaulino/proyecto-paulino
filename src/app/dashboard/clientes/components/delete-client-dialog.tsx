"use client";

import { ClientProps } from "@/backend/modules/clients/domain/clients.domain";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";

interface DeleteClientDialogProps {
   client: ClientProps | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteClientDialog({
   client,
   onConfirm,
   onClose,
   loading,
}: DeleteClientDialogProps) {
   return (
      <Dialog open={!!client} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Eliminar cliente</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de eliminar a <strong>{client?.nombre}</strong>? Esta acción no se puede deshacer.
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