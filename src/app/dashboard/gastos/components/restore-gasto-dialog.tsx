"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Gasto } from "@/dtos/gastos.dto";

interface RestoreGastoDialogProps {
   gasto: Gasto | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function RestoreGastoDialog({ gasto, onConfirm, onClose, loading }: RestoreGastoDialogProps) {
   return (
      <Dialog open={!!gasto} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Restaurar Gasto Anulado</DialogTitle>
               <DialogDescription>
                  ¿Deseas restaurar el gasto <strong>{gasto?.codigoReferencia}</strong>? Volverá a estar activo en los reportes financieros.
               </DialogDescription>
            </DialogHeader>
            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
               <Button onClick={onConfirm} disabled={loading} className="bg-brand-blue hover:bg-brand-blue/90">
                  {loading ? "Restaurando…" : "Restaurar Gasto"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}