"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
   Receipt,
   ChevronLeft,
   ChevronRight,
   Loader2,
   Eye,
   TriangleAlert,
   Zap,
   Phone,
} from "lucide-react";
import {
   useCuentasPorCobrarStore,
   type EstadoCxc,
} from "@/stores/useCuentasPorCobrarStore";
import { SelectBuscadorClient } from "@/components/shared/selectBuscadorClient";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";
import { PagoRapidoDialog } from "./components/pago-rapido-dialog";

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

const ESTADO_STYLE: Record<EstadoCxc, string> = {
   PENDIENTE: "bg-red-100 text-red-800",
   PARCIAL: "bg-amber-100 text-amber-800",
   PAGADO: "bg-green-100 text-green-800",
};

function Tarjeta({
   label,
   valor,
   detalle,
   acento,
}: {
   label: string;
   valor: string;
   detalle?: string;
   acento?: string;
}) {
   return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
         <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
         <p className={`text-xl font-bold ${acento ?? "text-brand-blue dark:text-blue-400"}`}>
            {valor}
         </p>
         {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
      </div>
   );
}

export default function CuentasPorCobrarPage() {

   useEffect(() => {
      document.title = "Cuentas por cobrar"
   }, [])

   const {
      cuentas,
      resumen,
      total,
      page,
      pageSize,
      filtros,
      loading,
      error,
      GetCuentas,
      SetFiltros,
      NextPage,
      PrevPage,
   } = useCuentasPorCobrarStore();
   const [pagoDialog, setPagoDialog] = useState(false);

   useEffect(() => {
      GetCuentas();
   }, [GetCuentas]);

   const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
   const hasta = Math.min(page * pageSize, total);
   const conFiltros = !!(filtros.busqueda || filtros.cliente_id || filtros.estado || filtros.fecha_desde || filtros.fecha_hasta);

   return (
      <div className="flex flex-col gap-6 p-6">
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Receipt className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold tracking-tight text-brand-blue dark:text-white">
                  Cuentas por cobrar
               </h1>
            </div>
            <p className="mt-1 pl-[calc(0.375rem+0.75rem)] text-sm text-muted-foreground">
               Lo que los clientes deben por folios. El pendiente se calcula restando los pagos
               registrados a cada folio.
            </p>
         </div>

         {/* ── Resumen ── */}
         <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tarjeta
               label="Total por cobrar"
               valor={money(resumen.total_pendiente)}
               detalle={`${resumen.total_documentos} documento${resumen.total_documentos === 1 ? "" : "s"}`}
               acento="text-red-600"
            />
            <Tarjeta
               label="Clientes con deuda"
               valor={String(resumen.clientes_con_deuda)}
               detalle={`${resumen.total_clientes} clientes con conduces`}
            />
            <Tarjeta
               label="Sin ningún pago"
               valor={String(resumen.pendientes)}
               detalle={`${resumen.parciales} con abono parcial`}
            />
            <Tarjeta label="Facturado total" valor={money(resumen.total_facturado)} />
         </div>

         {/* ── Antigüedad ── */}
         {resumen.total_pendiente > 0 && (
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

         {/* ── Filtros ── */}
         <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="min-w-[200px] flex-1">
               <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Buscar
               </label>
               <Input
                  placeholder="Nombre o referencia del cliente"
                  defaultValue={filtros.busqueda ?? ""}
                  onKeyDown={(e) => {
                     if (e.key === "Enter") SetFiltros({ busqueda: e.currentTarget.value });
                  }}
                  onBlur={(e) => {
                     if ((filtros.busqueda ?? "") !== e.target.value)
                        SetFiltros({ busqueda: e.target.value });
                  }}
               />
            </div>

            <div className="min-w-[220px] flex-1">
               <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Cliente
               </label>
               <SelectBuscadorClient
                  value={filtros.cliente_id}
                  initialLabel={filtros.cliente_id ? "" : ""}
                  onChange={(id) => SetFiltros({ cliente_id: id ?? undefined })}
               />
            </div>

            <div className="min-w-[200px] flex-1">
               <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Proyecto
               </label>
               <SelectBuscadorProyecto
                  value={filtros.proyecto_id}
                  onChange={(id) => SetFiltros({ proyecto_id: id ?? undefined })}
               />
            </div>

            <div>
               <label className="mb-1 block text-xs font-medium text-muted-foreground">
                   Fecha del folio
               </label>
               <div className="flex items-center gap-1">
                  <Input
                     type="date"
                     value={filtros.fecha_desde ?? ""}
                     onChange={(e) => SetFiltros({ fecha_desde: e.target.value || undefined })}
                     className="h-9 w-[140px]"
                  />
                  <span className="text-xs text-muted-foreground">a</span>
                  <Input
                     type="date"
                     value={filtros.fecha_hasta ?? ""}
                     onChange={(e) => SetFiltros({ fecha_hasta: e.target.value || undefined })}
                     className="h-9 w-[140px]"
                  />
               </div>
            </div>

            <div>
               <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Estado
               </label>
               <div className="flex gap-1">
                  {([undefined, "PENDIENTE", "PARCIAL"] as (EstadoCxc | undefined)[]).map((e) => (
                     <Button
                        key={e ?? "todos"}
                        size="sm"
                        variant={filtros.estado === e ? "default" : "outline"}
                        onClick={() => SetFiltros({ estado: e })}
                     >
                        {e === undefined ? "Por cobrar" : e === "PENDIENTE" ? "Sin pagos" : "Parcial"}
                     </Button>
                  ))}
                  <Button
                     size="sm"
                     variant={filtros.incluir_pagadas ? "default" : "outline"}
                     onClick={() =>
                        SetFiltros({ incluir_pagadas: !filtros.incluir_pagadas, estado: undefined })
                     }
                     title="Incluir también los clientes ya saldados"
                  >
                     Ver pagadas
                  </Button>
               </div>
            </div>
         </div>

         {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
               {error}
            </div>
         )}

         {/* ── Botón de pago rápido ── */}
         <div className="flex justify-end">
            <Button onClick={() => setPagoDialog(true)} className="gap-2">
               <Zap className="size-4" /> Pago rápido
            </Button>
         </div>

         {/* ── Tabla ── */}
         {loading ? (
            <div className="flex items-center justify-center py-16">
               <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
         ) : cuentas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground">
               <Receipt className="size-10 opacity-30" />
               <span>
                  {conFiltros
                     ? "No hay cuentas con los filtros actuales."
                     : "No hay cuentas pendientes de cobro."}
               </span>
            </div>
         ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">
                           Cliente
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">
                           Documentos
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">
                           Facturado
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">
                           Cobrado
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">
                           Pendiente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">
                           Antigüedad
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">
                           Estado
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">
                           Ver
                        </th>
                     </tr>
                  </thead>
                  <tbody>
                     {cuentas.map((c) => (
                        <tr
                           key={c.cliente_id}
                           className="border-b border-border/50 transition-colors hover:bg-brand-blue/5"
                        >
                           <td className="max-w-[240px] px-4 py-3">
                              <div className="truncate font-medium" title={c.cliente_nombre}>
                                 {c.cliente_nombre}
                              </div>
                              {c.cliente_telefono && (
                                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Phone className="size-3" />
                                    {c.cliente_telefono}
                                 </div>
                              )}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-center">
                              <span className="font-semibold">{c.cantidad_documentos}</span>
                              <div className="text-[10px] text-muted-foreground">
                                 {c.documentos_pendientes} pendiente
                                 {c.documentos_pendientes === 1 ? "" : "s"}
                              </div>
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                              {money(c.total_facturado)}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                              {c.total_pagado > 0 ? money(c.total_pagado) : "—"}
                              {c.ultimo_pago_fecha && (
                                 <div className="text-[10px]">{fecha(c.ultimo_pago_fecha)}</div>
                              )}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-600">
                              {c.saldo_pendiente > 0 ? money(c.saldo_pendiente) : "—"}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3">
                              {c.dias_transcurridos > 0 && c.estado !== "PAGADO" ? (
                                 <span
                                    className={`flex items-center gap-1 text-[10px] ${c.dias_transcurridos > 60 ? "text-red-600" : "text-muted-foreground"
                                       }`}
                                 >
                                    <TriangleAlert className="size-3" />
                                    {c.dias_transcurridos} días
                                 </span>
                              ) : (
                                 <span className="text-xs text-muted-foreground">—</span>
                              )}
                           </td>
                           <td className="px-4 py-3 text-center">
                              <Badge className={`border-0 text-[10px] ${ESTADO_STYLE[c.estado]}`}>
                                 {c.estado}
                              </Badge>
                           </td>
                           <td className="px-4 py-3 text-center">
                              <Link href={`/dashboard/cuentas-por-cobrar/${c.cliente_id}`}>
                                 <button
                                    className="rounded-md p-1.5 text-brand-blue transition-colors hover:bg-brand-blue/10"
                                    title="Ver detalle del cliente"
                                 >
                                    <Eye className="size-4" />
                                 </button>
                              </Link>
                           </td>
                        </tr>
                     ))}
                  </tbody>
                  <tfoot>
                     <tr className="border-t-2 bg-muted/30 font-bold">
                        <td className="px-4 py-3" colSpan={2}>
                           Total filtrado ({resumen.total_clientes} clientes)
                        </td>
                        <td className="px-4 py-3 text-right">{money(resumen.total_facturado)}</td>
                        <td className="px-4 py-3 text-right">{money(resumen.total_pagado)}</td>
                        <td className="px-4 py-3 text-right text-red-600">
                           {money(resumen.total_pendiente)}
                        </td>
                        <td className="px-4 py-3" colSpan={3} />
                     </tr>
                  </tfoot>
               </table>
            </div>
         )}

         {/* ── Paginación ── */}
         {total > pageSize && (
            <div className="flex items-center justify-between">
               <p className="text-xs text-muted-foreground">
                  Mostrando {desde}–{hasta} de {total}
               </p>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={PrevPage}>
                     <ChevronLeft className="size-4" /> Anterior
                  </Button>
                  <Button
                     variant="outline"
                     size="sm"
                     disabled={page * pageSize >= total}
                     onClick={NextPage}
                  >
                     Siguiente <ChevronRight className="size-4" />
                  </Button>
               </div>
            </div>
         )}

         <PagoRapidoDialog open={pagoDialog} onClose={() => setPagoDialog(false)} />
      </div>
   );
}
