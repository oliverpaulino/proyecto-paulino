"use client";

import { useState } from "react";
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
import type { ConduceDTO } from "@/dtos/conduce.dto";

interface Props {
   conduce: ConduceDTO | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: (id: string) => Promise<void> | void;
}

export function ConduceRestoreDialog({ conduce, open, onOpenChange, onConfirm }: Props) {
   const [restaurando, setRestaurando] = useState(false);

   if (!conduce) return null;

   const handleConfirm = async () => {
      setRestaurando(true);
      try {
         await onConfirm(conduce.id);
         onOpenChange(false);
      } finally {
         setRestaurando(false);
      }
   };

   return (
      <AlertDialog open={open} onOpenChange={(v) => !restaurando && onOpenChange(v)}>
         <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle>¿Restaurar conduce {conduce.numero_referencia}?</AlertDialogTitle>
               <AlertDialogDescription>
                  Volverá a aparecer en los listados normales y, si tiene un proyecto asignado, se
                  recalculan sus totales para incluirlo de nuevo.
               </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
               <AlertDialogCancel disabled={restaurando}>Cancelar</AlertDialogCancel>
               <AlertDialogAction
                  disabled={restaurando}
                  onClick={(e) => {
                     e.preventDefault();
                     handleConfirm();
                  }}
               >
                  {restaurando ? "Restaurando..." : "Restaurar"}
               </AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
   );
}