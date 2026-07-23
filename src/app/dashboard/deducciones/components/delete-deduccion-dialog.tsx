"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Deduccion } from "@/dtos/deducciones.dto";

interface DeleteDeduccionDialogProps {
   deduccion: Deduccion | null;
   onConfirm: (reason: string) => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteDeduccionDialog({ deduccion, onConfirm, onClose, loading }: DeleteDeduccionDialogProps) {
   const [reason, setReason] = useState("");

   const handleConfirm = () => {
      if (!reason.trim()) return;
      onConfirm(reason);
   };

   return (
      <Dialog open={!!deduccion} onOpenChange={(open) => { if (!open) { onClose(); setReason(""); } }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-brand-red">Anular Deducción</DialogTitle>
               <DialogDescription>
                  Estás a punto de anular la deducción <strong>{deduccion?.codigoReferencia}</strong>. Por favor, especifica el motivo de la anulación.
               </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 flex flex-col gap-2">
               <Label>Motivo de anulación *</Label>
               <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  required
                  placeholder="Ej: Registro duplicado o revertido" 
                  className="px-2 py-1 rounded-md border border-input bg-input/30"
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