"use client";

import { InfoDestinoPago } from "@/dtos/pagos.dto";
import { InfoCardShell, Stat, formatMoney } from "./info-card-shell";

/**
 * Proyecto: capital = Σ entradas − Σ salidas. ENTRADA → el capital sube (sin
 * tope). SALIDA → el capital baja, sin poder exceder el disponible.
 */
export function ProyectoInfoCard({ info, loading, esEntrada, monto, adjustment }: {
   info: InfoDestinoPago | null;
   loading: boolean;
   esEntrada: boolean;
   monto: number;
   adjustment: number;
}) {
   if (!info) {
      return (
         <InfoCardShell info={info} loading={loading} esEntrada={esEntrada} monto={monto} adjustment={adjustment}>
            {null}
         </InfoCardShell>
      );
   }

   const disponible = esEntrada ? info.capital - adjustment : info.capital + adjustment;
   const nuevoSaldo = esEntrada ? disponible + monto : disponible - monto;

   return (
      <InfoCardShell info={info} loading={loading} esEntrada={esEntrada} monto={monto} adjustment={adjustment}>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Stat label="Monto Total Disponible" value={`$${formatMoney(Math.max(0, disponible))}`} />
            <Stat
               label={esEntrada ? "Nuevo Saldo (aumenta)" : "Nuevo Saldo (disminuye)"}
               value={`$${formatMoney(Math.max(0, nuevoSaldo))}`}
               tone="good"
            />
         </div>
      </InfoCardShell>
   );
}
