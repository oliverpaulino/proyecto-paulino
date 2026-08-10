"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Gasto } from "@/dtos/gastos.dto";

interface MoverCobrabilidadDialogProps {
   gasto: Gasto | null;
   /** true = incobrable → cobrable; false = cobrable → incobrable */
   toCobrable: boolean;
   loading?: boolean;
   onConfirm: (monto: number | null) => Promise<void>;
   onClose: () => void;
}

const INPUT_CLASS = "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] disabled:opacity-60 disabled:bg-muted";

function defaultMonto(gasto: Gasto): number {
   if (!gasto) return 0;
   const existente = gasto.cobrable_monto ?? 0;
   if (existente > 0 && existente <= gasto.monto_total) return existente;
   return gasto.monto_total;
}

export function MoverCobrabilidadDialog({
   gasto,
   toCobrable,
   loading,
   onConfirm,
   onClose,
}: MoverCobrabilidadDialogProps) {
   const [monto, setMonto] = useState<string>(gasto ? String(defaultMonto(gasto)) : "");
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (gasto) {
         setMonto(String(defaultMonto(gasto)));
         setError(null);
      }
   }, [gasto]);

   const montoNum = Number(monto) || 0;
   const montoValido =
      gasto && toCobrable ? montoNum >= 0 && montoNum <= gasto.monto_total : true;

   function reset() {
      setMonto(gasto ? String(defaultMonto(gasto)) : "");
      setError(null);
   }

   async function handleConfirm() {
      if (!gasto) return;
      if (toCobrable && !montoValido) return;
      setError(null);
      const montoFinal = toCobrable ? (montoNum > 0 ? montoNum : 0) : null;
      try {
         await onConfirm(montoFinal);
      } catch (e) {
         setError(e instanceof Error ? e.message : "Error al mover el gasto");
      }
   }

   return (
      <Dialog
         open={!!gasto}
         onOpenChange={(open) => {
            if (!open) {
               onClose();
               reset();
            }
         }}
      >
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="size-4 text-brand-blue" />
                  {toCobrable ? "Mover a Cobrables" : "Mover a Incobrables"}
               </DialogTitle>
               <DialogDescription>
                  Cambia el estado de cobrabilidad de este gasto frente al cliente del proyecto.
               </DialogDescription>
            </DialogHeader>

            {gasto && (
               <div className="rounded-md border border-border bg-muted/20 p-4 flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                     <span className="font-mono font-medium text-brand-blue">{gasto.codigoReferencia}</span>
                     <span className="text-muted-foreground text-xs">
                        {format(new Date(gasto.fecha), "dd MMM yyyy", { locale: es })}
                     </span>
                  </div>
                  <p className="font-medium">{gasto.concepto}</p>
                  <p className="text-muted-foreground">
                     Categoría: <span className="font-medium text-foreground">{gasto.categoria_gasto_nombre}</span>
                  </p>
                  <p>
                     Monto total del gasto:{" "}
                     <span className="font-semibold text-brand-blue">
                        ${gasto.monto_total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                     </span>
                  </p>
               </div>
            )}

            {toCobrable ? (
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monto-cobrable">Monto a cobrar al cliente ($)</Label>
                  <Input
                     id="monto-cobrable"
                     type="number"
                     step="0.01"
                     min="0"
                     max={gasto ? gasto.monto_total : undefined}
                     value={monto}
                     onChange={(e) => setMonto(e.target.value)}
                     disabled={loading}
                     className={INPUT_CLASS}
                  />
                  <p className="text-xs text-muted-foreground">
                     Por defecto se cobra el total del gasto. Si ya tenía un monto a cobrar guardado, se conserva ese
                     valor (máximo el total del gasto). Si dejas el monto en 0, se cobrará el total.
                  </p>
               </div>
            ) : (
               <div className="flex items-start gap-2.5 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>
                     Este gasto <strong>ya no se le cobrará al cliente</strong>. El monto a cobrar se conserva en la
                     base de datos, pero no se tomará en cuenta para el cobro mientras esté marcado como incobrable.
                  </p>
               </div>
            )}

            {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">{error}</div>}

            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
               </Button>
               <Button onClick={handleConfirm} disabled={loading || !montoValido}>
                  {loading ? "Moviendo..." : "Confirmar"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
