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
import type { PurchaseOrder } from "@/dtos/purchase-order.dto";
import { useEffect, useState } from "react";

interface DeletePurchaseOrderDialogProps {
   order: PurchaseOrder | null;
   onConfirm: (reason: string) => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeletePurchaseOrderDialog({
   order,
   onConfirm,
   onClose,
   loading,
}: DeletePurchaseOrderDialogProps) {

   const [reason, setReason] = useState("");

   useEffect(() => {
      setReason(order?.deleted_reason ?? "");
   }, [order]);

   const handleConfirm = () => {
      if (!reason.trim()) return;
      onConfirm(reason);
   };

   return (
      <Dialog open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-brand-red">Anular orden de compra</DialogTitle>
               <DialogDescription>
                  Estás a punto de anular la orden{" "}
                  <strong>{order?.codigoReferencia}</strong>. Esta acción no se
                  puede deshacer y eliminará también todos los ítems.
               </DialogDescription>
            </DialogHeader>
            <div className="py-2">
               <label className="text-sm font-medium">Motivo de anulación *</label>
               <textarea
                  placeholder="Ej: Error en la orden o compra duplicada"
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
               />
            </div>
            <DialogFooter>
               <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
               >
                  Cancelar
               </Button>
               <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={loading || !reason.trim()}
               >
                  {loading ? "Anulando…" : "Confirmar Anulación"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
