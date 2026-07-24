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
import { Textarea } from "@/components/ui/textarea";
import type { ConduceDTO } from "@/dtos/conduce.dto";

interface Props {
   conduce: ConduceDTO | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: (id: string, motivo?: string) => Promise<void> | void;
}

/**
 * Reemplaza el `confirm()` nativo del navegador. La eliminación real sigue
 * siendo lógica (ver conduce.infraestructure.ts) — este diálogo solo pide
 * confirmación y un motivo opcional para dejar registrado por qué se
 * eliminó.
 */
export function ConduceDeleteDialog({ conduce, open, onOpenChange, onConfirm }: Props) {
   const [motivo, setMotivo] = useState("");
   const [eliminando, setEliminando] = useState(false);

   if (!conduce) return null;

   const handleConfirm = async () => {
      setEliminando(true);
      try {
         await onConfirm(conduce.id, motivo.trim() || undefined);
         setMotivo("");
         onOpenChange(false);
      } finally {
         setEliminando(false);
      }
   };

   return (
      <AlertDialog
         open={open}
         onOpenChange={(v) => {
            if (eliminando) return;
            onOpenChange(v);
            if (!v) setMotivo("");
         }}
      >
         <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle>¿Eliminar conduce {conduce.numero_referencia}?</AlertDialogTitle>
               <AlertDialogDescription>
                  El conduce se marcará como eliminado y dejará de aparecer en los listados y en los
                  totales del proyecto, pero no se borra permanentemente — podrás consultarlo o
                  restaurarlo después desde el apartado de eliminados.
               </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-1 py-2">
               <label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
               <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. registrado por error, duplicado, etc."
                  className="min-h-16"
               />
            </div>

            <AlertDialogFooter>
               <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
               <AlertDialogAction
                  disabled={eliminando}
                  onClick={(e) => {
                     e.preventDefault();
                     handleConfirm();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
               >
                  {eliminando ? "Eliminando..." : "Eliminar"}
               </AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
   );
}