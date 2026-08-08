"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { MetodoPago } from "@/dtos/pagos.dto";
import type { Deduccion, PagarDeduccionForm } from "@/dtos/deducciones.dto";

interface PagarDeduccionDialogProps {
   deduccion: Deduccion | null;
   onConfirm: (data: PagarDeduccionForm) => Promise<void>;
   onClose: () => void;
   loading?: boolean;
}

const INPUT_CLASS = "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] disabled:opacity-60 disabled:bg-muted";

const formatDateForInput = (date?: Date) => {
   if (!date || isNaN(date.getTime())) return "";
   const d = new Date(date);
   const year = d.getFullYear();
   const month = String(d.getMonth() + 1).padStart(2, "0");
   const day = String(d.getDate()).padStart(2, "0");
   return `${year}-${month}-${day}`;
};

/** Diálogo para registrar un pago directo contra una deducción del empleado. */
export function PagarDeduccionDialog({ deduccion, onConfirm, onClose, loading }: PagarDeduccionDialogProps) {
   const [monto, setMonto] = useState("");
   const [metodoPago, setMetodoPago] = useState("EFECTIVO");
   const [fecha, setFecha] = useState<string>(formatDateForInput(new Date()));
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (deduccion) {
         setMonto(deduccion.monto_pendiente > 0 ? String(deduccion.monto_pendiente) : "");
         setMetodoPago("EFECTIVO");
         setFecha(formatDateForInput(new Date()));
         setError(null);
      }
   }, [deduccion]);

   const pendiente = deduccion?.monto_pendiente ?? 0;

   const handleConfirm = () => {
      setError(null);
      const montoNum = Number(monto);
      if (!Number.isFinite(montoNum) || montoNum <= 0) {
         setError("El monto del pago debe ser mayor a 0.");
         return;
      }
      if (montoNum > pendiente + 0.01) {
         setError(`El monto no puede superar lo pendiente (RD$ ${pendiente.toLocaleString("es-DO")}).`);
         return;
      }
      const [year, month, day] = fecha.split("-").map(Number);
      onConfirm({
         monto: montoNum,
         metodo_pago: metodoPago,
         fecha: year && month && day ? new Date(year, month - 1, day) : new Date(),
      });
   };

   return (
      <Dialog open={!!deduccion} onOpenChange={(open) => { if (!open) onClose(); }}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Pagar Deducción</DialogTitle>
               <DialogDescription>
                  Registra un pago directo contra la deducción{" "}
                  <strong>{deduccion?.codigoReferencia}</strong>. El monto se descuenta del balance
                  pendiente de {deduccion?.empleado_nombre ?? "el empleado"}.
               </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
               <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                  Pendiente por cobrar:{" "}
                  <span className="font-semibold">RD$ {pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Monto del pago (RD$) *</Label>
                  <Input
                     type="number"
                     step="0.01"
                     min="0.01"
                     max={pendiente || undefined}
                     value={monto}
                     onChange={(e) => setMonto(e.target.value)}
                     disabled={loading}
                     className={INPUT_CLASS}
                  />
               </div>

               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                     <Label>Método de pago *</Label>
                     <Select value={metodoPago} onValueChange={setMetodoPago} disabled={loading}>
                        <SelectTrigger className="h-9 w-full bg-input/30">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {Object.entries(MetodoPago).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <Label>Fecha *</Label>
                     <Input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        disabled={loading}
                        className={INPUT_CLASS}
                     />
                  </div>
               </div>
            </div>

            {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">{error}</div>}

            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
               <Button onClick={handleConfirm} disabled={loading}>
                  {loading ? "Registrando…" : "Registrar Pago"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
