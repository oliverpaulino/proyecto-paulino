"use client";

import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PayrollConcept } from "@/dtos/payroll-concept.dto";

interface DeactivateConceptDialogProps {
   concept: PayrollConcept | null;
   onConfirm: () => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

export function DeactivateConceptDialog({
   concept,
   onConfirm,
   onClose,
   loading,
}: DeactivateConceptDialogProps) {
   return (
      <AlertDialog open={!!concept} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
         <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle>Desactivar concepto</AlertDialogTitle>
               <AlertDialogDescription>
                  ¿Estás seguro de que deseas desactivar el concepto{" "}
                  <span className="font-semibold text-foreground">
                     {concept?.code} — {concept?.name}
                  </span>
                  ? El concepto dejará de estar disponible pero sus datos históricos se conservarán.
               </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
               <AlertDialogCancel onClick={onClose} disabled={loading}>
                  Cancelar
               </AlertDialogCancel>
               <AlertDialogAction
                  onClick={onConfirm}
                  disabled={loading}
                  className="bg-destructive text-white hover:bg-destructive/90"
               >
                  {loading ? "Desactivando…" : "Desactivar"}
               </AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
   );
}
