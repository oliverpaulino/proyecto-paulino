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
   onConfirm: () => Promise<void>;
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

   return (
      <Dialog open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Eliminar orden de compra</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas eliminar la orden{" "}
                  <strong>{order?.codigoReferencia}…</strong>? Esta acción no se
                  puede deshacer y eliminará también todos los ítems.
               </DialogDescription>
               <textarea
                  placeholder="Motivo de eliminación..."
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
               />
            </DialogHeader>
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
                  onClick={onConfirm}
                  disabled={loading}
               >
                  {loading ? "Eliminando…" : "Eliminar"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
