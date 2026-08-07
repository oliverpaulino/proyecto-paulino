"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
   ArrowLeft,
   Loader2,
   Phone,
   Mail,
   Receipt,
   Zap,
   Wallet,
   TriangleAlert,
   ShieldCheck,
   ChevronDown,
   ChevronRight,
} from "lucide-react";
import { MetodoPago } from "@/dtos/pagos.dto";
import {
   PagoRapidoDialog,
} from "../components/pago-rapido-dialog";
import {
   EstadoCuentaPdfButton,
   type EstadoCuentaDetalle,
} from "../components/estado-cuenta-pdf";
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

function Tarjeta({
   label,
   valor,
   acento,
}: {
   label: string;
   valor: string;
   acento?: string;
}) {
   return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
         <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
         <p className={`text-xl font-bold ${acento ?? "text-brand-blue dark:text-blue-400"}`}>
            {valor}
         </p>
      </div>
   );
}

export default function DetalleClienteCxcPage() {

   useEffect(() => {
      document.title = "Cargando cuenta por cobrar ";
   }, [])

   const params = useParams();
   const router = useRouter();
   const [detalle, setDetalle] = useState<EstadoCuentaDetalle | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [pagoDialog, setPagoDialog] = useState(false);
   const [folioCobrar, setFolioCobrar] = useState<string | null>(null);
   const [expandido, setExpandido] = useState<string | null>(null);
   const GetDetalleCliente = useCuentasPorCobrarStore((s) => s.GetDetalleCliente);

   const fetchDetalle = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const data = await GetDetalleCliente(String(params.id));
         document.title = `${data.cliente.nombre ?? "Cliente"} - Cuentas por cobrar`;
         setDetalle(data);
      } catch (e: any) {
         setError(e.message ?? "No se pudo cargar el detalle");
      } finally {
         setLoading(false);
      }
   }, [params.id, GetDetalleCliente]);

   useEffect(() => {
      fetchDetalle();

   }, [fetchDetalle]);

   if (loading) {
      return (
         <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-brand-blue" />
            <p>Cargando estado de cuenta...</p>
         </div>
      );
   }

   if (!detalle) {
      return (
         <div className="flex flex-col items-center gap-4 p-8">
            <h2 className="text-xl font-bold">{error ?? "Cliente no encontrado"}</h2>
            <Button variant="outline" onClick={() => router.push("/dashboard/cuentas-por-cobrar")}>
               Volver a cuentas por cobrar
            </Button>
         </div>
      );
   }

   const { cliente, resumen, cuentas, historial_pagos } = detalle;
   const pendientes = cuentas.filter((c) => c.pendiente > 0.01);

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* ── Encabezado ── */}
         <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
               <Link
                  href="/dashboard/cuentas-por-cobrar"
                  className="mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
                  title="Volver"
               >
                  <ArrowLeft className="size-5" />
               </Link>
               <div>
                  <div className="flex items-center gap-3">
                     <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
                     <h1 className="text-3xl font-bold tracking-tight text-brand-blue dark:text-white">
                        {cliente.nombre}
                     </h1>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 pl-[calc(0.375rem+0.75rem)] text-sm text-muted-foreground">
                     <span className="font-mono">{cliente.identificacion}</span>
                     {cliente.telefono && (
                        <span className="flex items-center gap-1">
                           <Phone className="size-3.5" /> {cliente.telefono}
                        </span>
                     )}
                     {cliente.email && (
                        <span className="flex items-center gap-1">
                           <Mail className="size-3.5" /> {cliente.email}
                        </span>
                     )}
                  </div>
               </div>
            </div>
            <div className="flex gap-2">
               <EstadoCuentaPdfButton detalle={detalle} clienteNombre={cliente.nombre} />
               <Button onClick={() => setPagoDialog(true)} className="gap-2">
                  <Zap className="size-4" /> Pago rápido
               </Button>
            </div>
         </div>

         {/* ── Resumen ── */}
         <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tarjeta label="Facturado" valor={money(resumen.facturado)} />
            <Tarjeta
               label="Cobrado"
               valor={money(resumen.pagado)}
               acento="text-green-600"
            />
            <Tarjeta
               label="Pendiente"
               valor={money(resumen.pendiente)}
               acento="text-red-600"
            />
            <Tarjeta
               label="Documentos"
               valor={`${resumen.cantidad_documentos}`}
               acento="text-foreground"
            />
         </div>

         {/* ── Antigüedad ── */}
         {resumen.pendiente > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
               <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                  Antigüedad de lo pendiente
               </p>
               <div className="grid gap-3 sm:grid-cols-4">
                  {[
                     ["Hasta 30 días", resumen.antiguedad.hasta_30, "text-foreground"],
                     ["31 a 60 días", resumen.antiguedad.de_31_a_60, "text-amber-600"],
                     ["61 a 90 días", resumen.antiguedad.de_61_a_90, "text-orange-600"],
                     ["Más de 90 días", resumen.antiguedad.mas_de_90, "text-red-600"],
                  ].map(([label, valor, color]) => (
                     <div key={label as string}>
                        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
                        <p className={`text-sm font-bold ${color}`}>{money(valor as number)}</p>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* ── Folios ── */}
         <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
               Folios por cobrar ({cuentas.length})
            </h2>
            {cuentas.length === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground">
                  <Receipt className="size-10 opacity-30" />
                  <span>El cliente no tiene cuentas cobrables.</span>
               </div>
            ) : (
               <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="bg-brand-blue">
                           <th className="w-10 px-2 py-3 text-center text-xs font-semibold uppercase text-blue-200">
                              <ChevronRight className="mx-auto size-3.5" />
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Folio</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Facturado</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Cobrado</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Estado</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Cobrar</th>
                        </tr>
                     </thead>
                     <tbody>
                        {cuentas.map((c) => (
                           <Fragment key={c.id}>
                              <tr className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-blue/5">
                                 <td className="px-2 py-3 text-center">
                                    <button
                                       type="button"
                                       onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                                       className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
                                       title={expandido === c.id ? "Ocultar desglose" : "Ver desglose de precios"}
                                    >
                                       {expandido === c.id ? (
                                          <ChevronDown className="size-4" />
                                       ) : (
                                          <ChevronRight className="size-4" />
                                       )}
                                    </button>
                                 </td>
                                 <td className="px-4 py-3">
                                    <button
                                       type="button"
                                       onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                                       className="text-left"
                                    >
                                       <span className="font-mono font-medium text-brand-blue">
                                          {c.numero_referencia}
                                       </span>
                                       {c.nombre && (
                                          <div className="max-w-[180px] truncate text-xs text-muted-foreground" title={c.nombre}>
                                             {c.nombre}
                                          </div>
                                       )}
                                       {c.cantidad_pagos > 0 && (
                                          <div className="text-[10px] text-muted-foreground">
                                             {c.cantidad_pagos} pago{c.cantidad_pagos === 1 ? "" : "s"}
                                          </div>
                                       )}
                                    </button>
                                 </td>
                                 <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                    {fecha(c.fecha)}
                                    {c.estado !== "PAGADO" && c.dias_transcurridos > 60 && (
                                       <div className="flex items-center gap-1 text-[10px] text-red-600">
                                          <TriangleAlert className="size-3" />
                                          {c.dias_transcurridos} días
                                       </div>
                                    )}
                                 </td>
                                 <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                    {money(c.monto_total)}
                                 </td>
                                 <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                                    {c.pagado > 0 ? money(c.pagado) : "—"}
                                 </td>
                                 <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-600">
                                    {c.pendiente > 0 ? money(c.pendiente) : "—"}
                                 </td>
                                 <td className="px-4 py-3 text-center">
                                    <Badge className={`border-0 text-[10px] ${ESTADO_STYLE[c.estado]}`}>
                                       {c.estado}
                                    </Badge>
                                 </td>
                                 <td className="px-4 py-3 text-center">
                                    <Button
                                       size="sm"
                                       variant={c.pendiente > 0.01 ? "outline" : "ghost"}
                                       disabled={c.pendiente <= 0.01}
                                       onClick={() => {
                                          setFolioCobrar(c.id);
                                          setPagoDialog(true);
                                       }}
                                    >
                                       {c.pendiente > 0.01 ? (
                                          <Wallet className="size-4 text-brand-blue" />
                                       ) : (
                                          <ShieldCheck className="size-4 text-green-600" />
                                       )}
                                    </Button>
                                 </td>
                              </tr>
                              {expandido === c.id && (
                                 <tr className="border-b border-border/50 bg-brand-blue/[0.03]">
                                    <td colSpan={8} className="px-4 py-3">
                                       <div className="flex flex-col gap-3">
                                          <div className="grid gap-3 lg:grid-cols-3">
                                             <div className="rounded-lg border border-border/60 bg-card p-3">
                                                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                                                   Tarifa del servicio
                                                </p>
                                                <p className="text-lg font-bold text-brand-blue dark:text-blue-400">
                                                   {c.tarifa_servicio > 0 ? money(c.tarifa_servicio) : "—"}
                                                </p>
                                                {c.tipo === "PROYECTO" && c.pendiente_tarifa_cargos > 0 && (
                                                   <p className="text-[10px] font-medium text-red-600">
                                                      {money(c.pendiente_tarifa_cargos)} pendientes
                                                   </p>
                                                )}
                                             </div>
                                             <div className="rounded-lg border border-border/60 bg-card p-3">
                                                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                                                   Cargos cobrables
                                                </p>
                                                <p className="text-lg font-bold">
                                                   {c.cargos_cobrables > 0 ? money(c.cargos_cobrables) : "—"}
                                                </p>
                                                {c.tipo === "PROYECTO" && (
                                                   <p className="text-[10px] text-muted-foreground">
                                                      Detalles cobrables del proyecto
                                                   </p>
                                                )}
                                             </div>
                                             <div className="rounded-lg border border-border/60 bg-card p-3">
                                                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                                                   Conduces ({c.conduces_count})
                                                </p>
                                                <p className="text-lg font-bold">
                                                   {c.conduces_cobrables > 0 ? money(c.conduces_cobrables) : "—"}
                                                </p>
                                                {c.conduces.length === 0 && (
                                                   <p className="text-[10px] text-muted-foreground">
                                                      Sin conduces cobrables.
                                                   </p>
                                                )}
                                             </div>
                                          </div>

                                          {c.conduces.length > 0 && (
                                             <div className="rounded-lg border border-border/60 bg-card">
                                                <div className="max-h-56 overflow-y-auto">
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
                                                         {c.conduces.map((cc) => (
                                                            <tr
                                                               key={cc.id}
                                                               className="border-b border-border/40 last:border-0"
                                                            >
                                                               <td className="whitespace-nowrap px-3 py-1.5 font-mono font-medium text-brand-blue">
                                                                  {cc.numero_referencia}
                                                               </td>
                                                               <td
                                                                  className="max-w-[260px] truncate px-3 py-1.5 text-muted-foreground"
                                                                  title={cc.tipo_conduce}
                                                               >
                                                                  {cc.tipo_conduce}
                                                               </td>
                                                               <td className="whitespace-nowrap px-3 py-1.5 text-right">
                                                                  {money(cc.monto_total)}
                                                               </td>
                                                               <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold text-red-600">
                                                                  {money(cc.pendiente)}
                                                               </td>
                                                            </tr>
                                                         ))}
                                                      </tbody>
                                                      <tfoot>
                                                         <tr className="sticky bottom-0 border-t border-border/60 bg-muted/40 font-semibold">
                                                            <td className="px-3 py-2" colSpan={2}>
                                                               {c.conduces_count} conduces
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-2 text-right">
                                                               {money(c.conduces_cobrables)}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-2 text-right text-red-600">
                                                               {money(
                                                                  c.conduces.reduce(
                                                                     (acc, cc) => acc + cc.pendiente,
                                                                     0
                                                                  )
                                                               )}
                                                            </td>
                                                         </tr>
                                                      </tfoot>
                                                   </table>
                                                </div>
                                             </div>
                                          )}

                                          <div className="flex items-center justify-end gap-4 text-xs">
                                             <span className="text-muted-foreground">
                                                Tarifa + Cargos + Conduces
                                             </span>
                                             <span className="font-bold text-brand-blue">
                                                {money(c.monto_total)}
                                             </span>
                                          </div>
                                       </div>
                                    </td>
                                 </tr>
                              )}
                           </Fragment>
                        ))}
                     </tbody>
                     <tfoot>
                        <tr className="border-t-2 bg-muted/30 font-bold">
                           <td className="px-2 py-3" />
                           <td className="px-4 py-3" colSpan={2}>
                              Total ({cuentas.length} folios, {pendientes.length} pendientes)
                           </td>
                           <td className="px-4 py-3 text-right">{money(resumen.facturado)}</td>
                           <td className="px-4 py-3 text-right">{money(resumen.pagado)}</td>
                           <td className="px-4 py-3 text-right text-red-600">
                              {money(resumen.pendiente)}
                           </td>
                           <td className="px-4 py-3" colSpan={2} />
                        </tr>
                     </tfoot>
                  </table>
               </div>
            )}
         </div>

         {/* ── Historial de pagos ── */}
         <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
               Historial de pagos ({historial_pagos.length})
            </h2>
            {historial_pagos.length === 0 ? (
               <div className="rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-8 text-center text-sm text-muted-foreground">
                  <ShieldCheck className="mx-auto mb-2 size-8 opacity-30" />
                  Sin pagos registrados para este cliente.
               </div>
            ) : (
               <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="bg-brand-blue">
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Folio</th>
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
                              <td className="px-4 py-3">
                                 <span className="font-mono font-medium text-brand-blue">
                                    {p.codigoReferencia}
                                 </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                 {fecha(p.fecha)}
                              </td>
                              <td className="px-4 py-3">
                                 <span className="font-mono text-xs">
                                    {p.conduce_numero_referencia ?? p.proyecto_codigo_referencia ?? "—"}
                                 </span>
                              </td>
                              <td className="max-w-[240px] truncate px-4 py-3" title={p.concepto}>
                                 {p.concepto}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                 {MetodoPago[p.metodo_pago as keyof typeof MetodoPago] ?? p.metodo_pago}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-600">
                                 {money(p.monto_pagado)}
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
                              {money(historial_pagos.reduce((acc, p) => acc + p.monto_pagado, 0))}
                           </td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            )}
         </div>

         <PagoRapidoDialog
            open={pagoDialog}
            clienteInicialId={cliente.id}
            clienteInicialLabel={cliente.nombre}
            folioInicialId={folioCobrar ?? undefined}
            onClose={() => {
               setPagoDialog(false);
               setFolioCobrar(null);
               fetchDetalle();
            }}
         />
      </div>
   );
}
