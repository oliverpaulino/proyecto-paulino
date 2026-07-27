"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { useNominaStore, type NominaEmpleado } from "@/stores/useNominaStore";

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const soloFecha = (v: string) => String(v).slice(0, 10);

/**
 * Crea una deducción NUEVA para el chofer. No modifica las que ya existen:
 * cada descuento queda como un registro propio, con su concepto y su fecha,
 * igual que una creada desde el módulo de deducciones.
 */
export function AgregarDeduccionDialog({
   empleado,
   onClose,
}: {
   empleado: NominaEmpleado;
   onClose: () => void;
}) {
   const { selectedCycle, AgregarDeduccion } = useNominaStore();

   const [monto, setMonto] = useState("");
   const [concepto, setConcepto] = useState("");
   // Por defecto el último día del ciclo, para que caiga dentro del período.
   const [fecha, setFecha] = useState(
      selectedCycle ? soloFecha(selectedCycle.fecha_fin) : ""
   );
   const [guardando, setGuardando] = useState(false);
   const [error, setError] = useState<string | null>(null);

   async function submit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);

      const n = Number(monto);
      if (!Number.isFinite(n) || n <= 0) return setError("El monto debe ser mayor a 0.");
      if (!concepto.trim()) return setError("Indique el concepto de la deducción.");
      if (!selectedCycle) return setError("No hay un ciclo seleccionado.");

      setGuardando(true);
      const ok = await AgregarDeduccion(selectedCycle.id, empleado.empleado_id, {
         monto: n,
         concepto: concepto.trim(),
         fecha,
      });
      setGuardando(false);
      if (ok) onClose();
      else setError("No se pudo crear la deducción.");
   }

   const fueraDeRango =
      selectedCycle &&
      fecha &&
      (fecha < soloFecha(selectedCycle.fecha_inicio) ||
         fecha > soloFecha(selectedCycle.fecha_fin));

   return (
      <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Agregar deducción</DialogTitle>
               <DialogDescription>
                  {empleado.empleado_nombre} · se le descuenta en este ciclo.
                  {empleado.deducciones > 0 && (
                     <> Ya tiene {money(empleado.deducciones)} en deducciones.</>
                  )}
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={submit} className="flex flex-col gap-4">
               <div className="flex flex-col gap-1.5">
                  <Label>Monto *</Label>
                  <Input
                     type="number"
                     step="0.01"
                     min="0.01"
                     value={monto}
                     onChange={(e) => setMonto(e.target.value)}
                     placeholder="0.00"
                     autoFocus
                     required
                  />
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Concepto *</Label>
                  <Input
                     value={concepto}
                     onChange={(e) => setConcepto(e.target.value)}
                     placeholder="Ej: Adelanto de quincena"
                     required
                  />
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Fecha *</Label>
                  <Input
                     type="date"
                     value={fecha}
                     min={selectedCycle ? soloFecha(selectedCycle.fecha_inicio) : undefined}
                     max={selectedCycle ? soloFecha(selectedCycle.fecha_fin) : undefined}
                     onChange={(e) => setFecha(e.target.value)}
                     required
                  />
                  {fueraDeRango && (
                     <p className="text-xs text-amber-600">
                        Fuera del ciclo. Se guardará con la fecha de cierre para que
                        entre en esta nómina.
                     </p>
                  )}
               </div>

               {error && (
                  <div className="rounded-md bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
                     {error}
                  </div>
               )}

               <div className="flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>
                     Cancelar
                  </Button>
                  <Button type="submit" disabled={guardando}>
                     {guardando ? "Guardando..." : "Agregar deducción"}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}
