"use client";

import { InfoDestinoPago } from "@/dtos/pagos.dto";
import { InfoCardShell, Stat, formatMoney } from "./info-card-shell";

/**
 * Gasto. ENTRADA → lo que falta por cobrar al cliente. SALIDA → lo que falta
 * por pagar a la empresa. Si el gasto nació de una orden de compra y el
 * movimiento es SALIDA, no acepta pagos: muestra la OC a la que deben ir.
 */
export function GastoInfoCard({ info, loading, esEntrada, monto, adjustment }: {
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

   if (!esEntrada && info.aceptaPagoSalida === 0) {
      return (
         <InfoCardShell info={info} loading={loading} esEntrada={esEntrada} monto={monto} adjustment={adjustment}>
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
               Este gasto está asociado a la orden de compra{" "}
               <strong className="text-foreground">{info.ordenCompraReferencia ?? "…"}</strong>.
               Si debe hacer un pago de salida, regístrelo contra la orden de compra, no contra este gasto.
            </p>
         </InfoCardShell>
      );
   }

   const tope = esEntrada ? (info.aceptaPagoEntrada ?? 0) : info.aceptaPagoSalida;
   const pendiente = tope + adjustment;

   return (
      <InfoCardShell info={info} loading={loading} esEntrada={esEntrada} monto={monto} adjustment={adjustment}>
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Stat
               label={esEntrada ? "Monto Total Cobrable al Cliente" : "Monto Total"}
               value={`$${formatMoney(esEntrada ? info.cobrableCliente : info.montoTotal)}`}
            />
            <Stat
               label={esEntrada ? "Pendiente por Cobrar (Cliente)" : "Pendiente por Pagar (Empresa)"}
               value={`$${formatMoney(Math.max(0, pendiente))}`}
            />
            <Stat
               label="Nuevo Saldo Pendiente"
               value={`$${formatMoney(Math.max(0, pendiente - monto))}`}
               tone="good"
            />
         </div>
      </InfoCardShell>
   );
}
