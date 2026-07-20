"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Gasto } from "@/dtos/gastos.dto";

interface DeleteGastoDialogProps {
   gasto: Gasto | null;
   onConfirm: (reason: string) => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteGastoDialog({ gasto, onConfirm, onClose, loading }: DeleteGastoDialogProps) {
   const [reason, setReason] = useState("");

   const handleConfirm = () => {
      if (!reason.trim()) return;
      onConfirm(reason);
   };

   return (
      <Dialog open={!!gasto} onOpenChange={(open) => { if (!open) { onClose(); setReason(""); } }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-brand-red">Anular Gasto</DialogTitle>
               <DialogDescription>
                  Estás a punto de anular el gasto <strong>{gasto?.codigoReferencia}</strong>. Por favor, especifica el motivo de la anulación.
               </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 flex flex-col gap-2">
               <Label>Motivo de anulación *</Label>
               <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  required
                  placeholder="Ej: Error en digitación del NCF" 
                  className="px-2 py-1"
                  disabled={loading} 
               />
            </div>

            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
               <Button variant="destructive" onClick={handleConfirm} disabled={loading || !reason.trim()}>
                  {loading ? "Anulando…" : "Confirmar Anulación"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}