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
import type { Supplier } from "@/dtos/supplier.dto";

interface DeleteSupplierDialogProps {
   supplier: Supplier | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteSupplierDialog({ supplier, onConfirm, onClose, loading }: DeleteSupplierDialogProps) {
   return (
      <Dialog open={!!supplier} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Eliminar proveedor</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas eliminar a <strong>{supplier?.nombre}</strong>? Esta acción no se puede deshacer.
               </DialogDescription>
            </DialogHeader>
            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
               </Button>
               <Button variant="destructive" onClick={onConfirm} disabled={loading}>
                  {loading ? "Eliminando…" : "Eliminar"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
