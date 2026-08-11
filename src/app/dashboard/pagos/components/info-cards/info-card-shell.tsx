"use client";

import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Loader2 } from "lucide-react";
import { InfoDestinoPago, TipoDestinoPago } from "@/dtos/pagos.dto";

export const formatMoney = (value: number): string =>
   value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const TIPO_DESTINO_LABEL: Record<TipoDestinoPago, string> = {
   GASTO: "Gasto",
   DEDUCCION: "Deducción",
   PROYECTO: "Proyecto",
   ORDEN_COMPRA: "Orden de Compra",
};

export function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "warn" | "muted" }) {
   const toneClass =
      tone === "good" ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn" ? "text-amber-600 dark:text-amber-400"
      : tone === "muted" ? "text-muted-foreground"
      : "text-foreground";
   return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
         <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
         <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </div>
   );
}

/**
 * Marco común de los cards de destino: encabezado con referencia y badge de
 * movimiento, estados de carga/error y la advertencia cuando el monto excede
 * el saldo disponible del destino. El contenido depende del tipo (cada card).
 */
export function InfoCardShell({ info, loading, esEntrada, monto, adjustment, children }: {
   info: InfoDestinoPago | null;
   loading: boolean;
   esEntrada: boolean;
   monto: number;
   adjustment: number;
   children: ReactNode;
}) {
   if (loading && !info) {
      return (
         <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brand-blue" />
            Consultando el balance del destino…
         </div>
      );
   }

   if (!info) {
      return (
         <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
            <Info className="size-4 text-brand-blue" />
            No se pudo obtener la información del destino seleccionado.
         </div>
      );
   }

   const tope = esEntrada ? info.aceptaPagoEntrada : info.aceptaPagoSalida;
   const topeBase = tope === null ? null : tope + adjustment;
   const excede = topeBase !== null && monto > topeBase + 0.01;

   return (
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 space-y-3">
         <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
               <Info className="size-4 text-brand-blue shrink-0" />
               <p className="text-sm font-semibold text-foreground truncate">
                  {TIPO_DESTINO_LABEL[info.tipo]}: {info.referencia}
               </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${esEntrada ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"}`}>
               {esEntrada ? <ArrowUpRight className="size-3.5 inline mr-1" /> : <ArrowDownRight className="size-3.5 inline mr-1" />}
               {esEntrada ? "Entrada" : "Salida"}
            </span>
         </div>

         {children}

         {excede && (
            <p className="text-xs font-medium text-destructive bg-destructive/10 p-2 rounded-md">
               El monto supera el saldo disponible del destino (RD$ {formatMoney(Math.max(0, topeBase))}).
            </p>
         )}
      </div>
   );
}
