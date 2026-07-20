"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Costo } from "@/dtos/costos.dto";

interface RestoreCostoDialogProps {
   costo: Costo | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function RestoreCostoDialog({ costo, onConfirm, onClose, loading }: RestoreCostoDialogProps) {
   return (
      <Dialog open={!!costo} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Restaurar Costo Anulado</DialogTitle>
               <DialogDescription>
                  ¿Deseas restaurar el costo <strong>{costo?.codigoReferencia}</strong>? Volverá a estar activo en los reportes financieros del proyecto.
               </DialogDescription>
            </DialogHeader>
            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
               <Button onClick={onConfirm} disabled={loading} className="bg-brand-blue hover:bg-brand-blue/90">
                  {loading ? "Restaurando…" : "Restaurar Costo"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}