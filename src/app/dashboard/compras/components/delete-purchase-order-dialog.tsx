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
   return (
      <Dialog open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Eliminar orden de compra</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas eliminar la orden{" "}
                  <strong>{order?.id?.slice(0, 8)}…</strong>? Esta acción no se
                  puede deshacer y eliminará también todos los ítems.
               </DialogDescription>
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
