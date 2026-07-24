"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Deduccion } from "@/dtos/deducciones.dto";

interface RestoreDeduccionDialogProps {
   deduccion: Deduccion | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function RestoreDeduccionDialog({ deduccion, onConfirm, onClose, loading }: RestoreDeduccionDialogProps) {
   return (
      <Dialog open={!!deduccion} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Restaurar Deducción Anulada</DialogTitle>
               <DialogDescription>
                  ¿Deseas restaurar la deducción <strong>{deduccion?.codigoReferencia}</strong>? Volverá a estar activa y se aplicará al empleado correspondiente.
               </DialogDescription>
            </DialogHeader>
            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
               <Button onClick={onConfirm} disabled={loading} className="bg-brand-blue hover:bg-brand-blue/90">
                  {loading ? "Restaurando…" : "Restaurar Deducción"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}