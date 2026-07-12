"use client";

import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import type { PurchaseOrderDeleted } from "@/dtos/purchase-order.dto";

interface RestorePurchaseOrderDialogProps {
   order: PurchaseOrderDeleted | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function RestorePurchaseOrderDialog({
   order,
   onConfirm,
   onClose,
   loading = false,
}: RestorePurchaseOrderDialogProps) {
   return (
      <Dialog open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2 text-brand-blue dark:text-white">
                  <RefreshCw className="size-5" />
                  Restaurar Orden de Compra
               </DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas restaurar la orden de compra del proveedor{" "}
                  <strong className="text-foreground">
                     {order?.proveedor_nombre ?? order?.proveedor_id}
                  </strong>
                  ? Esta acción regresará la orden al flujo activo de compras.
               </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
               <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
               </Button>
               <Button 
                  onClick={onConfirm} 
                  disabled={loading}
                  className="bg-brand-blue text-white hover:bg-brand-blue/90"
               >
                  {loading ? (
                     <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Restaurando…
                     </>
                  ) : (
                     "Confirmar Restauración"
                  )}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}