"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Receipt, ShieldCheck, TriangleAlert, Zap } from "lucide-react";
import { MetodoPago } from "@/dtos/pagos.dto";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { PagoRapidoDialog } from "../../../cuentas-por-cobrar/components/pago-rapido-dialog";
import {
   useCuentasPorCobrarStore,
   type FolioProyectoCxc,
} from "@/stores/useCuentasPorCobrarStore";
import { formatMoney } from "./formatMoney";

const fecha = (s: string) =>
   s
      ? new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO", {
           day: "2-digit",
           month: "short",
           year: "numeric",
        })
      : "—";

const ESTADO_STYLE: Record<string, string> = {
   PENDIENTE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
   PARCIAL: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
   PAGADO: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

function Tarjeta({ label, valor, acento }: { label: string; valor: string; acento?: string }) {
   return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
         <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
         <p className={`text-xl font-bold ${acento ?? "text-brand-blue dark:text-blue-400"}`}>
            {valor}
         </p>
      </div>
   );
}

/** Pestaña "Cobranza" del detalle de un proyecto: su folio y sus pagos. */
export function CobranzaTab({ proyecto }: { proyecto: Proyecto }) {
   const GetProyectoCxc = useCuentasPorCobrarStore((s) => s.GetProyectoCxc);
   const [detalle, setDetalle] = useState<FolioProyectoCxc | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [pagoDialog, setPagoDialog] = useState(false);

   const fetchDetalle = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         setDetalle(await GetProyectoCxc(proyecto.id));
      } catch (e: any) {
         setError(e.message ?? "No se pudo cargar la cobranza del proyecto");
      } finally {
         setLoading(false);
      }
   }, [proyecto.id, GetProyectoCxc]);

   useEffect(() => {
      fetchDetalle();
   }, [fetchDetalle]);

   if (loading && !detalle) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
            Cargando cobranza del proyecto…
         </div>
      );
   }

   if (!detalle) {
      return (
         <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center text-sm text-muted-foreground">
               <TriangleAlert className="size-8 opacity-40" />
               <p>{error ?? "No se pudo cargar la cobranza de este proyecto."}</p>
               <Button variant="outline" onClick={fetchDetalle}>
                  Reintentar
               </Button>
            </CardContent>
         </Card>
      );
   }

   const { folio, resumen, historial_pagos } = detalle;
   const pendiente = resumen.pendiente > 0.01;

   return (
      <div className="flex flex-col gap-4">
         <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
               <h2 className="text-lg font-semibold">Cobranza de {detalle.proyecto.codigoReferencia}</h2>
               <p className="text-sm text-muted-foreground">
                  Lo facturado al cliente por este proyecto (tarifa + cargos + conduces), lo cobrado y
                  lo pendiente.
               </p>
            </div>
            <div className="flex flex-wrap gap-2">
               <Link href={`/dashboard/cuentas-por-cobrar/${proyecto.cliente_id}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                     Estado de cuenta del cliente
                  </Button>
               </Link>
               <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => setPagoDialog(true)}
                  disabled={!pendiente}
               >
                  <Zap className="size-4" /> Pago rápido
               </Button>
            </div>
         </div>

         <div className="grid gap-3 sm:grid-cols-3">
            <Tarjeta label="Facturado" valor={formatMoney(resumen.facturado)} />
            <Tarjeta label="Cobrado" valor={formatMoney(resumen.pagado)} acento="text-green-600" />
            <Tarjeta label="Pendiente" valor={formatMoney(resumen.pendiente)} acento="text-red-600" />
         </div>

         {!folio ? (
            <Card>
               <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                  <Receipt className="size-10 opacity-30" />
                  <p>
                     Este proyecto no tiene nada cobrable: sin tarifa, sin gastos cobrables y sin
                     conduces cobrables.
                  </p>
               </CardContent>
            </Card>
         ) : (
            <>
               <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                     <div>
                        <CardTitle className="text-base">Folio {folio.numero_referencia}</CardTitle>
                        <CardDescription>
                           {folio.conduces_count} conduce{folio.conduces_count === 1 ? "" : "s"} cobrable
                           {folio.conduces_count === 1 ? "" : "s"} · {folio.nombre ?? "Proyecto"}
                        </CardDescription>
                     </div>
                     <Badge className={`border-0 text-[10px] ${ESTADO_STYLE[folio.estado]}`}>
                        {folio.estado}
                     </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                     <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-border/60 bg-card p-3">
                           <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                              Tarifa del servicio
                           </p>
                           <p className="text-lg font-bold text-brand-blue dark:text-blue-400">
                              {folio.tarifa_servicio > 0 ? formatMoney(folio.tarifa_servicio) : "—"}
                           </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-card p-3">
                           <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                              Cargos cobrables
                           </p>
                           <p className="text-lg font-bold">
                              {folio.cargos_cobrables > 0 ? formatMoney(folio.cargos_cobrables) : "—"}
                           </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-card p-3">
                           <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                              Conduces cobrables
                           </p>
                           <p className="text-lg font-bold">
                              {folio.conduces_cobrables > 0 ? formatMoney(folio.conduces_cobrables) : "—"}
                           </p>
                        </div>
                     </div>

                     {folio.conduces.length > 0 && (
                        <div className="rounded-lg border border-border/60">
                           <div className="max-h-52 overflow-y-auto">
                              <table className="w-full text-xs">
                                 <thead>
                                    <tr className="sticky top-0 border-b border-border/60 bg-muted/40">
                                       <th className="px-3 py-2 text-left font-semibold uppercase text-muted-foreground">
                                          Conduce
                                       </th>
                                       <th className="px-3 py-2 text-left font-semibold uppercase text-muted-foreground">
                                          Tipo
                                       </th>
                                       <th className="px-3 py-2 text-right font-semibold uppercase text-muted-foreground">
                                          Facturado
                                       </th>
                                       <th className="px-3 py-2 text-right font-semibold uppercase text-muted-foreground">
                                          Pendiente
                                       </th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {folio.conduces.map((cc) => (
                                       <tr key={cc.id} className="border-b border-border/40 last:border-0">
                                          <td className="whitespace-nowrap px-3 py-1.5 font-mono font-medium text-brand-blue">
                                             {cc.numero_referencia}
                                          </td>
                                          <td
                                             className="max-w-[240px] truncate px-3 py-1.5 text-muted-foreground"
                                             title={cc.tipo_conduce}
                                          >
                                             {cc.tipo_conduce}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-1.5 text-right">
                                             {formatMoney(cc.monto_total)}
                                          </td>
                                          <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold text-red-600">
                                             {cc.pendiente > 0 ? formatMoney(cc.pendiente) : "—"}
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}

                     <div className="flex items-center justify-end gap-4 text-sm">
                        <span className="text-muted-foreground">Tarifa + Cargos + Conduces</span>
                        <span className="font-bold text-brand-blue">{formatMoney(folio.monto_total)}</span>
                     </div>
                  </CardContent>
               </Card>

               <Card>
                  <CardHeader>
                     <CardTitle className="text-base">Historial de pagos ({historial_pagos.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                     {historial_pagos.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                           <ShieldCheck className="size-8 opacity-30" />
                           Sin pagos registrados para este proyecto.
                        </div>
                     ) : (
                        <div className="overflow-x-auto">
                           <table className="w-full text-sm">
                              <thead>
                                 <tr className="bg-brand-blue">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Pago</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Destino</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Concepto</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Método</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {historial_pagos.map((p) => (
                                    <tr key={p.id} className="border-b border-border/50 transition-colors hover:bg-brand-blue/5">
                                       <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                          {p.codigoReferencia}
                                       </td>
                                       <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                          {fecha(p.fecha)}
                                       </td>
                                       <td className="px-4 py-3 font-mono text-xs">
                                          {p.conduce_numero_referencia ?? p.proyecto_codigo_referencia ?? "—"}
                                       </td>
                                       <td className="max-w-[260px] truncate px-4 py-3" title={p.concepto}>
                                          {p.concepto}
                                       </td>
                                       <td className="px-4 py-3 text-muted-foreground">
                                          {MetodoPago[p.metodo_pago as keyof typeof MetodoPago] ?? p.metodo_pago}
                                       </td>
                                       <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-600">
                                          {formatMoney(p.monto_pagado)}
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                              <tfoot>
                                 <tr className="border-t-2 bg-muted/30 font-bold">
                                    <td className="px-4 py-3" colSpan={5}>
                                       Total cobrado
                                    </td>
                                    <td className="px-4 py-3 text-right text-green-600">
                                       {formatMoney(
                                          historial_pagos.reduce((acc, p) => acc + p.monto_pagado, 0)
                                       )}
                                    </td>
                                 </tr>
                              </tfoot>
                           </table>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </>
         )}

         <PagoRapidoDialog
            open={pagoDialog}
            clienteInicialId={proyecto.cliente_id}
            clienteInicialLabel={proyecto.cliente_nombre ?? ""}
            folioInicialId={proyecto.id}
            onClose={() => {
               setPagoDialog(false);
               fetchDetalle();
            }}
         />
      </div>
   );
}
