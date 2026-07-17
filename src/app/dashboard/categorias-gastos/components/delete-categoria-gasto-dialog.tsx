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
import type { CategoriaGasto } from "@/dtos/categoria-gasto.dto";

interface DeleteCategoriaDialogProps {
   categoria: CategoriaGasto | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeleteCategoriaDialog({ categoria, onConfirm, onClose, loading }: DeleteCategoriaDialogProps) {
   return (
      <Dialog open={!!categoria} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Eliminar categoría</DialogTitle>
               <DialogDescription>
                  ¿Estás seguro de que deseas eliminar la categoría <strong>{categoria?.nombre}</strong>? Esta acción no se puede deshacer.
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