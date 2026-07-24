"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Pago } from "@/dtos/pagos.dto";

interface RestorePagoDialogProps {
   pago: Pago | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function RestorePagoDialog({ pago, onConfirm, onClose, loading }: RestorePagoDialogProps) {
   return (
      <Dialog open={!!pago} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Restaurar Pago Anulado</DialogTitle>
               <DialogDescription>
                  ¿Deseas restaurar el pago <strong>{pago?.codigoReferencia}</strong>? Volverá a reflejarse en los registros contables del sistema.
               </DialogDescription>
            </DialogHeader>
            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
               <Button onClick={onConfirm} disabled={loading} className="bg-brand-blue hover:bg-brand-blue/90">
                  {loading ? "Restaurando…" : "Restaurar Pago"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}