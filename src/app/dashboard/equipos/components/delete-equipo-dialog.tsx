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
import type { Equipo } from "@/dtos/equipo.dto";

interface DeleteEquipoDialogProps {
   equipo: Equipo | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteEquipoDialog({ equipo, onConfirm, onClose, loading }: DeleteEquipoDialogProps) {
   return (
      <Dialog open={!!equipo} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Eliminar equipo</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas eliminar <strong>{equipo?.nombre}</strong>? Esta acción no se puede deshacer.
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
