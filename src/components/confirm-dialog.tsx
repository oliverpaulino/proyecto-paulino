"use client";

import type { ReactNode } from "react";
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

interface Props {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   title: ReactNode;
   description?: ReactNode;
   confirmLabel?: string;
   cancelLabel?: string;
   destructive?: boolean;
   loading?: boolean;
   onConfirm: () => void | Promise<void>;
}

/**
 * Reemplaza al `confirm()` nativo del navegador (que en celulares se ve mal):
 * un diálogo de shadcn que no depende del navegador.
 */
export function ConfirmDialog({
   open,
   onOpenChange,
   title,
   description,
   confirmLabel = "Confirmar",
   cancelLabel = "Cancelar",
   destructive = false,
   loading = false,
   onConfirm,
}: Props) {
   return (
      <AlertDialog
         open={open}
         onOpenChange={(v) => {
            if (loading) return;
            onOpenChange(v);
         }}
      >
         <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle>{title}</AlertDialogTitle>
               {description && (
                  <AlertDialogDescription>{description}</AlertDialogDescription>
               )}
            </AlertDialogHeader>
            <AlertDialogFooter>
               <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
               <AlertDialogAction
                  disabled={loading}
                  onClick={(e) => {
                     e.preventDefault();
                     onConfirm();
                  }}
                  className={
                     destructive
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : undefined
                  }
               >
                  {loading ? "Procesando..." : confirmLabel}
               </AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
   );
}
