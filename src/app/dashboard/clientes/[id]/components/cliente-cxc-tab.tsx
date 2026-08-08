"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, Zap } from "lucide-react";
import { MiniStat, EmptyState } from "./cliente-tab-ui";
import {
   PagoRapidoDialog,
} from "../../../cuentas-por-cobrar/components/pago-rapido-dialog";
import type { EstadoCuentaDetalle } from "../../../cuentas-por-cobrar/components/estado-cuenta-pdf";
import { useCuentasPorCobrarStore } from "@/stores/useCuentasPorCobrarStore";

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fecha = (s: string) =>
   s
      ? new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO", {
           day: "2-digit",
           month: "short",
           year: "numeric",
        })
      : "—";

const ESTADO_STYLE: Record<string, string> = {
   PENDIENTE: "bg-red-100 text-red-800",
   PARCIAL: "bg-amber-100 text-amber-800",
   PAGADO: "bg-green-100 text-green-800",
};

interface ClienteCxcTabProps {
   clientId: string;
   clienteNombre: string;
}

/** Pestaña "Cuentas por cobrar" del detalle de un cliente, con datos reales. */
export function ClienteCxcTab({ clientId, clienteNombre }: ClienteCxcTabProps) {
   const [detalle, setDetalle] = useState<EstadoCuentaDetalle | null>(null);
   const [loading, setLoading] = useState(true);
   const [pagoDialog, setPagoDialog] = useState(false);
   const GetDetalleCliente = useCuentasPorCobrarStore((s) => s.GetDetalleCliente);

   const fetchDetalle = useCallback(async () => {
      setLoading(true);
      try {
         setDetalle(await GetDetalleCliente(clientId));
      } finally {
         setLoading(false);
      }
   }, [clientId, GetDetalleCliente]);

   useEffect(() => {
      fetchDetalle();
   }, [fetchDetalle]);

   if (loading && !detalle) {
      return (
         <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!detalle) {
      return (
         <div className="space-y-4">
            <EmptyState
               title="Sin cuentas por cobrar"
               description="No se pudo cargar el estado de cuenta de este cliente."
            />
            <Button variant="outline" onClick={fetchDetalle}>
               Reintentar
            </Button>
         </div>
      );
   }

   const { resumen, cuentas, historial_pagos } = detalle;
   const pendientes = cuentas.filter((c) => c.pendiente > 0.01);

   return (
      <div className="space-y-4">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
               <MiniStat label="Facturado" value={money(resumen.facturado)} />
               <MiniStat label="Cobrado" value={money(resumen.pagado)} />
               <MiniStat
                  label="Pendiente"
                  value={money(resumen.pendiente)}
                  accent={resumen.pendiente > 0 ? "text-red-600" : "text-green-600"}
               />
               <MiniStat label="Documentos" value={String(resumen.cantidad_documentos)} />
            </div>
         </div>

         <div className="flex gap-2">
            <Button size="sm" className="gap-2" onClick={() => setPagoDialog(true)}>
               <Zap className="size-4" /> Pago rápido
            </Button>
            <Link href={`/dashboard/cuentas-por-cobrar/${clientId}`}>
               <Button size="sm" variant="outline">
                  Ver estado de cuenta completo
               </Button>
            </Link>
         </div>

         {pendientes.length === 0 ? (
            <EmptyState
               title="Cliente sin deuda pendiente"
               description="Todos los folios cobrables de este cliente están saldados."
            />
         ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Folio</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Detalle</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Facturado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Estado</th>
                     </tr>
                  </thead>
                  <tbody>
                     {pendientes.map((c) => (
                        <tr key={c.id} className="border-b border-border/50 transition-colors hover:bg-brand-blue/5">
                           <td className="px-4 py-3">
                              <span className="font-mono font-medium text-brand-blue">
                                 {c.numero_referencia}
                              </span>
                              {c.tipo === "PROYECTO" && c.conduces_count > 0 && (
                                 <div className="text-[10px] text-muted-foreground">
                                    {c.conduces_count} conduce{c.conduces_count === 1 ? "" : "s"}
                                 </div>
                              )}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                              {fecha(c.fecha)}
                           </td>
                           <td className="max-w-[220px] truncate px-4 py-3">
                              {c.nombre ?? "Conduce suelto"}
                              {c.tipo === "PROYECTO" && c.tarifa_servicio > 0 && (
                                 <span className="ml-1 text-xs text-muted-foreground">
                                    · Tarifa {money(c.tarifa_servicio)}
                                 </span>
                              )}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                              {money(c.monto_total)}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-600">
                              {money(c.pendiente)}
                           </td>
                           <td className="px-4 py-3 text-center">
                              <Badge className={`border-0 text-[10px] ${ESTADO_STYLE[c.estado]}`}>
                                 {c.estado}
                              </Badge>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {historial_pagos.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
               <Receipt className="size-3.5" />
               {historial_pagos.length} pago{historial_pagos.length === 1 ? "" : "s"} registrado
               {historial_pagos.length === 1 ? "" : "s"} · Ver el historial completo en el estado de cuenta.
            </p>
         )}

         <PagoRapidoDialog
            open={pagoDialog}
            clienteInicialId={clientId}
            clienteInicialLabel={clienteNombre}
            onClose={() => {
               setPagoDialog(false);
               fetchDetalle();
            }}
         />
      </div>
   );
}
