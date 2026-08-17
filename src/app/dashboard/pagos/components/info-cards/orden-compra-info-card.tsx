"use client";

import { InfoDestinoPago } from "@/dtos/pagos.dto";
import { InfoCardShell, Stat, formatMoney } from "./info-card-shell";

/** Orden de compra: la empresa paga al proveedor (solo pagos de salida). */
export function OrdenCompraInfoCard({ info, loading, esEntrada, monto, adjustment, hideNuevoSaldo }: {
   info: InfoDestinoPago | null;
   loading: boolean;
   esEntrada: boolean;
   monto: number;
   adjustment: number;
   hideNuevoSaldo?: boolean;
}) {
   if (!info) {
      return (
         <InfoCardShell info={info} loading={loading} esEntrada={esEntrada} monto={monto} adjustment={adjustment}>
            {null}
         </InfoCardShell>
      );
   }

   const tope = esEntrada ? (info.aceptaPagoEntrada ?? 0) : info.aceptaPagoSalida;
   const pendiente = tope + adjustment;

   return (
      <InfoCardShell info={info} loading={loading} esEntrada={esEntrada} monto={monto} adjustment={adjustment}>
         <div className={`grid grid-cols-1 gap-2 ${hideNuevoSaldo ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            <Stat label="Monto Total" value={`$${formatMoney(info.montoTotal)}`} />
            <Stat label="Pendiente" value={`$${formatMoney(Math.max(0, pendiente))}`} />
            {!hideNuevoSaldo && (
               <Stat label="Nuevo Saldo" value={`$${formatMoney(Math.max(0, pendiente - monto))}`} tone="good" />
            )}
         </div>
      </InfoCardShell>
   );
}
