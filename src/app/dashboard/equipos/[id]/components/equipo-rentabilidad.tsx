"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
   ArrowDownRight,
   ArrowUpRight,
   BarChart3,
   CalendarDays,
   ChevronDown,
   ChevronRight,
   CircleDollarSign,
   Loader2,
   ReceiptText,
   RefreshCw,
   ShoppingCart,
   TrendingDown,
   TrendingUp,
   Truck,
   Wallet,
   Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEquipoStore } from "@/stores/useEquipoStore";
import type {
   EquipoRentabilidad,
   EquipoRentabilidadMes,
} from "@/dtos/rentabilidad.dto";

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function formatMoneyCompact(value: number): string {
   const abs = Math.abs(value);
   if (abs >= 1_000_000)
      return `${(value / 1_000_000).toLocaleString("es-DO", { maximumFractionDigits: 1 })}M`;
   if (abs >= 1_000)
      return `${(value / 1_000).toLocaleString("es-DO", { maximumFractionDigits: 1 })}K`;
   return value.toLocaleString("es-DO", { maximumFractionDigits: 0 });
}

function isoLocal(d: Date): string {
   const y = d.getFullYear();
   const m = String(d.getMonth() + 1).padStart(2, "0");
   const dd = String(d.getDate()).padStart(2, "0");
   return `${y}-${m}-${dd}`;
}

const INPUT_CLASS =
   "h-9 rounded-lg border border-input bg-input/30 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

interface Preset {
   label: string;
   dias: number | null;
}

const PRESETS: Preset[] = [
   { label: "15 días", dias: 15 },
   { label: "30 días", dias: 30 },
   { label: "3 meses", dias: 90 },
   { label: "6 meses", dias: 180 },
   { label: "1 año", dias: 365 },
   { label: "Todo", dias: null },
];

export function EquipoRentabilidad({ equipoId }: { equipoId: string }) {
   const { rentabilidadData, rentabilidadLoading, rentabilidadError, GetRentabilidad } = useEquipoStore();

   // Alias para no tocar el resto del JSX (usa data/loading/error).
   const data = rentabilidadData;
   const loading = rentabilidadLoading || (rentabilidadData === null && rentabilidadError === null);
   const error = rentabilidadError;

   const [desde, setDesde] = useState("");
   const [hasta, setHasta] = useState("");
   const [appliedDesde, setAppliedDesde] = useState("");
   const [appliedHasta, setAppliedHasta] = useState("");

   const cargar = useCallback(
      (d: string, h: string, force = false) => {
         void GetRentabilidad(equipoId, d, h, force);
      },
      [equipoId, GetRentabilidad]
   );

   useEffect(() => {
      cargar("", "");
   }, [cargar]);

   function aplicar(d: string, h: string) {
      setDesde(d);
      setHasta(h);
      setAppliedDesde(d);
      setAppliedHasta(h);
      cargar(d, h, true);
   }

   const hayFiltro = appliedDesde !== "" || appliedHasta !== "";

   const resumen = data?.resumen;

   const estadoOperativa =
      resumen == null ? "cargando" : resumen.rentabilidad_operativa > 0 ? "positivo" : resumen.rentabilidad_operativa < 0 ? "negativo" : "neutro";

   const esPerdida = resumen != null && resumen.rentabilidad_neta < 0;

   return (
      <div className="flex flex-col gap-5">
         {/* ── Barra de filtros ─────────────────────────────────────────── */}
         <Card>
            <CardContent className="flex flex-col gap-3 p-4">
               <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1.5">
                     <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        Desde
                     </span>
                     <input
                        type="date"
                        value={desde}
                        max={hasta || undefined}
                        onChange={(e) => setDesde(e.target.value)}
                        className={INPUT_CLASS}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        Hasta
                     </span>
                     <input
                        type="date"
                        value={hasta}
                        min={desde || undefined}
                        onChange={(e) => setHasta(e.target.value)}
                        className={INPUT_CLASS}
                     />
                  </div>
                  <Button onClick={() => aplicar(desde, hasta)} disabled={loading}>
                     {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                     {hayFiltro ? "Actualizar" : "Analizar"}
                  </Button>
                  {hayFiltro && (
                     <Button variant="ghost" onClick={() => aplicar("", "")}>
                        Quitar filtros
                     </Button>
                  )}
               </div>
               <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rápido:</span>
                  {PRESETS.map((p) => {
                     const activo =
                        p.dias === null
                           ? !hayFiltro
                           : appliedDesde === isoLocal(subDays(new Date(), p.dias)) && appliedHasta === "";
                     return (
                        <Button
                           key={p.label}
                           variant={activo ? "default" : "outline"}
                           size="sm"
                           className="h-7 rounded-full px-3 text-xs"
                           onClick={() =>
                              p.dias === null
                                 ? aplicar("", "")
                                 : aplicar(isoLocal(subDays(new Date(), p.dias)), "")
                           }
                        >
                           {p.label}
                        </Button>
                     );
                  })}
               </div>
               {hayFiltro && (
                  <p className="text-xs text-muted-foreground">
                     Mostrando desde <span className="font-medium text-foreground">{appliedDesde}</span>
                     {appliedHasta && (
                        <>
                           {" "}
                           hasta <span className="font-medium text-foreground">{appliedHasta}</span>
                        </>
                     )}
                  </p>
               )}
            </CardContent>
         </Card>

         {loading && !data && (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-16">
               <Loader2 className="size-6 animate-spin text-brand-blue" />
            </div>
         )}

         {error && !data && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
               {error}
            </div>
         )}

         {!loading && data && resumen && (
            <>
               {/* ── Veredicto / hero ─────────────────────────────────────── */}
               <div className="relative overflow-hidden rounded-2xl bg-brand-blue p-6 text-white shadow-lg sm:p-8">
                  <div className="absolute -right-10 -top-10 size-48 rounded-full bg-brand-yellow/20 blur-2xl" />
                  <div className="absolute -bottom-16 -left-10 size-56 rounded-full bg-white/10 blur-3xl" />

                  <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                     <div className="space-y-2">
                        <p className="text-sm font-medium uppercase tracking-widest text-blue-200">
                           Utilidad neta del período
                        </p>
                        <p
                           className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${esPerdida ? "text-red-300" : "text-brand-yellow"
                              }`}
                        >
                           {esPerdida ? "−" : ""}
                           {formatMoney(Math.abs(resumen.rentabilidad_neta))}
                        </p>
                        <p className="max-w-2xl text-sm text-blue-100">
                           {data.conduces.length === 0
                              ? "Todavía no hay conduces registrados en este período."
                              : esPerdida
                                 ? `El equipo facturó ${formatMoney(resumen.ingresos)}, pero los costos del operador (${formatMoney(
                                    resumen.costo_operador
                                 )}) más gastos, mantenimiento e inversión sumaron más de lo producido.`
                                 : `Se facturaron ${formatMoney(resumen.ingresos)} en ${resumen.conduces_cobrables} conduce${resumen.conduces_cobrables === 1 ? "" : "s"
                                 } cobrable${resumen.conduces_cobrables === 1 ? "" : "s"}. El operador costó ${formatMoney(
                                    resumen.costo_operador
                                 )} y quedó ${formatMoney(resumen.rentabilidad_operativa)} de utilidad operativa.`}
                        </p>
                     </div>

                     <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-white/10 px-5 py-3 backdrop-blur">
                           <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                              Margen operativo
                           </p>
                           <p className="flex items-center gap-1 text-2xl font-bold">
                              {resumen.margen_operativo.toLocaleString("es-DO", { maximumFractionDigits: 1 })}%
                              {estadoOperativa === "positivo" ? (
                                 <TrendingUp className="size-5 text-emerald-300" />
                              ) : estadoOperativa === "negativo" ? (
                                 <TrendingDown className="size-5 text-red-300" />
                              ) : (
                                 <CircleDollarSign className="size-5 text-blue-200" />
                              )}
                           </p>
                        </div>
                        <div className="hidden rounded-xl bg-white/10 px-5 py-3 backdrop-blur sm:block">
                           <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                              Conduces
                           </p>
                           <p className="text-2xl font-bold">
                              {resumen.conduces_totales}
                              <span className="ml-1 text-xs font-normal text-blue-200">
                                 ({resumen.conduces_cobrables} cobrables)
                              </span>
                           </p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* ── KPIs ────────────────────────────────────────────────── */}
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                     label="Facturado (ingresos)"
                     value={formatMoney(resumen.ingresos)}
                     sub={`${resumen.conduces_cobrables} conduce${resumen.conduces_cobrables === 1 ? "" : "s"} cobrable${resumen.conduces_cobrables === 1 ? "" : "s"}`}
                     icon={<TrendingUp className="size-5" />}
                     tone="emerald"
                  />
                  <StatCard
                     label="Costo del operador"
                     value={formatMoney(resumen.costo_operador)}
                     sub="Pago a choferes por producción"
                     icon={<Truck className="size-5" />}
                     tone="amber"
                  />
                  <StatCard
                     label="Gastos y mantenimiento"
                     value={formatMoney(resumen.gastos + resumen.mantenimientos)}
                     sub={
                        <>
                           {formatMoney(resumen.gastos)} en gastos · {formatMoney(resumen.mantenimientos)} en mantenimiento
                        </>
                     }
                     icon={<Wrench className="size-5" />}
                     tone="rose"
                  />
                  <StatCard
                     label="Inversión en compras"
                     value={formatMoney(resumen.compras)}
                     sub="Ítems de órdenes de compra"
                     icon={<ShoppingCart className="size-5" />}
                     tone="blue"
                  />
               </div>

               {/* ── Gráficas ────────────────────────────────────────────── */}
               <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                           <BarChart3 className="size-5 text-brand-blue" />
                           Evolución mensual
                        </CardTitle>
                        <CardDescription>
                           Facturado vs. costos operativos mes a mes.
                        </CardDescription>
                     </CardHeader>
                     <CardContent>
                        {data.por_mes.length === 0 ? (
                           <EmptyChart />
                        ) : (
                           <MensualChart meses={data.por_mes} />
                        )}
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                           <ReceiptText className="size-5 text-brand-blue" />
                           Gastos por categoría
                        </CardTitle>
                        <CardDescription>Dónde se va el dinero de gastos.</CardDescription>
                     </CardHeader>
                     <CardContent>
                        {data.por_categoria_gasto.length === 0 ? (
                           <EmptyChart />
                        ) : (
                           <CategoriaChart
                              items={data.por_categoria_gasto.map((c) => ({
                                 label: c.categoria,
                                 valor: c.total,
                                 count: c.count,
                              }))}
                              colorClass="bg-brand-yellow"
                              money={true}
                           />
                        )}
                     </CardContent>
                  </Card>
               </div>

               {/* ── Producción por tarifa ───────────────────────────────── */}
               {data.por_tarifa.length > 0 && (
                  <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                           <Truck className="size-5 text-brand-blue" />
                           Producción por tarifa
                        </CardTitle>
                        <CardDescription>
                           Cuánto se factura y cuánto cuesta el operador según la tarifa aplicada.
                        </CardDescription>
                     </CardHeader>
                     <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead>
                              <tr className="border-b border-border bg-muted/40">
                                 <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tarifa</th>
                                 <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conduces</th>
                                 <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cantidad</th>
                                 <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Facturado</th>
                                 <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Costo operador</th>
                                 <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utilidad</th>
                              </tr>
                           </thead>
                           <tbody>
                              {data.por_tarifa.map((t) => (
                                 <tr key={`${t.tarifa_nombre}::${t.medida_cobro}`} className="border-b border-border/50 hover:bg-muted/20">
                                    <td className="px-3 py-2.5 font-medium">
                                       {t.tarifa_nombre}
                                       <span className="ml-1 text-xs text-muted-foreground">({t.medida_cobro})</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-muted-foreground">{t.count}</td>
                                    <td className="px-3 py-2.5 text-right text-muted-foreground">{t.cantidad}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">{formatMoney(t.subtotal_facturado)}</td>
                                    <td className="px-3 py-2.5 text-right text-amber-700 dark:text-amber-400">{formatMoney(t.costo_operador)}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold text-brand-blue">
                                       {formatMoney(t.subtotal_facturado - t.costo_operador)}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </CardContent>
                  </Card>
               )}

               {/* ── Flujo de pagos ──────────────────────────────────────── */}
               {(resumen.pagos_salida > 0 || resumen.pagos_entrada > 0) && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                     <StatCard
                        label="Pagos registrados (salida)"
                        value={formatMoney(resumen.pagos_salida)}
                        sub="Lo que se ha pagado"
                        icon={<ArrowDownRight className="size-5" />}
                        tone="rose"
                     />
                     <StatCard
                        label="Pagos recibidos (entrada)"
                        value={formatMoney(resumen.pagos_entrada)}
                        sub="Lo que se ha cobrado"
                        icon={<ArrowUpRight className="size-5" />}
                        tone="emerald"
                     />
                     <StatCard
                        label="Flujo neto de pagos"
                        value={formatMoney(resumen.pagos_entrada - resumen.pagos_salida)}
                        sub="Entradas menos salidas"
                        icon={<Wallet className="size-5" />}
                        tone="blue"
                     />
                  </div>
               )}

               {/* ── Detalles ────────────────────────────────────────────── */}
               <div className="flex flex-col gap-4">
                  <DetalleSection
                     titulo="Conduces del período"
                     descripcion="Facturado al cliente vs. lo que se le paga al operador."
                     icon={<Truck className="size-4" />}
                     count={data.conduces.length}
                     total={data.conduces.length > 0 ? formatMoneyCompact(resumen.ingresos) : undefined}
                     color="border-brand-blue"
                  >
                     <TablaConduces data={data} />
                  </DetalleSection>

                  <DetalleSection
                     titulo="Gastos"
                     descripcion="Gastos registrados directamente contra este equipo."
                     icon={<ReceiptText className="size-4" />}
                     count={data.gastos.length}
                     total={data.gastos.length > 0 ? formatMoneyCompact(resumen.gastos) : undefined}
                     color="border-brand-yellow"
                  >
                     <TablaGastos data={data} />
                  </DetalleSection>

                  <DetalleSection
                     titulo="Compras (órdenes de compra)"
                     descripcion="Ítems de órdenes de compra asignados al equipo."
                     icon={<ShoppingCart className="size-4" />}
                     count={data.compras.length}
                     total={data.compras.length > 0 ? formatMoneyCompact(resumen.compras) : undefined}
                     color="border-brand-blue"
                  >
                     <TablaCompras data={data} />
                  </DetalleSection>

                  <DetalleSection
                     titulo="Mantenimientos"
                     descripcion="Registros de mantenimiento del equipo."
                     icon={<Wrench className="size-4" />}
                     count={data.mantenimientos.length}
                     total={data.mantenimientos.length > 0 ? formatMoneyCompact(resumen.mantenimientos) : undefined}
                     color="border-brand-red"
                  >
                     <TablaMantenimientos data={data} />
                  </DetalleSection>

                  <DetalleSection
                     titulo="Pagos vinculados"
                     descripcion="Pagos hechos contra gastos, deducciones u órdenes de compra del equipo."
                     icon={<Wallet className="size-4" />}
                     count={data.pagos.length}
                     total={data.pagos.length > 0 ? formatMoneyCompact(resumen.pagos_salida + resumen.pagos_entrada) : undefined}
                     color="border-brand-blue"
                  >
                     <TablaPagos data={data} />
                  </DetalleSection>
               </div>
            </>
         )}
      </div>
   );
}

/* ─────────────────────────── Componentes auxiliares ─────────────────────── */

type Tone = "emerald" | "amber" | "rose" | "blue" | "violet";

const TONE_STYLES: Record<Tone, { icon: string; value: string }> = {
   emerald: { icon: "bg-emerald-100 text-emerald-700", value: "text-emerald-700 dark:text-emerald-400" },
   amber: { icon: "bg-amber-100 text-amber-700", value: "text-amber-700 dark:text-amber-400" },
   rose: { icon: "bg-rose-100 text-rose-700", value: "text-rose-700 dark:text-rose-400" },
   blue: { icon: "bg-blue-100 text-brand-blue", value: "text-brand-blue" },
   violet: { icon: "bg-violet-100 text-violet-700", value: "text-violet-700 dark:text-violet-400" },
};

function StatCard({
   label,
   value,
   sub,
   icon,
   tone,
}: {
   label: string;
   value: string;
   sub?: React.ReactNode;
   icon: React.ReactNode;
   tone: Tone;
}) {
   const styles = TONE_STYLES[tone];
   return (
      <Card>
         <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
               <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
               <span className={`rounded-lg p-1.5 ${styles.icon}`}>{icon}</span>
            </div>
            <p className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl ${styles.value}`}>{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
         </CardContent>
      </Card>
   );
}

function EmptyChart() {
   return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
         <BarChart3 className="size-8 opacity-30" />
         Sin datos en el período seleccionado.
      </div>
   );
}

function MensualChart({ meses }: { meses: EquipoRentabilidadMes[] }) {
   const max = Math.max(1, ...meses.map((m) => Math.max(m.ingresos, m.costos_operativos, m.compras)));
   return (
      <div>
         <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
               <span className="size-2.5 rounded-full bg-emerald-500" /> Facturado
            </span>
            <span className="flex items-center gap-1.5">
               <span className="size-2.5 rounded-full bg-rose-500" /> Costos operativos
            </span>
            <span className="flex items-center gap-1.5">
               <span className="size-2.5 rounded-full bg-brand-blue" /> Compras
            </span>
         </div>
         <div className="overflow-x-auto pb-1">
            <div className="flex min-w-[480px] items-end gap-2 border-b border-border pb-3">
               {meses.map((m) => (
                  <div key={m.mes} className="group flex flex-1 flex-col items-center gap-1" title={`${m.etiqueta}: facturado ${formatMoney(m.ingresos)}, costos ${formatMoney(m.costos_operativos)}, utilidad ${formatMoney(m.utilidad)}`}>
                     <div className="flex h-40 w-full items-end justify-center gap-1">
                        <Bar height={m.ingresos / max} color="bg-emerald-500" />
                        <Bar height={m.costos_operativos / max} color="bg-rose-500" />
                        <Bar height={m.compras / max} color="bg-brand-blue/70" />
                     </div>
                     <span className="text-[10px] font-medium uppercase text-muted-foreground">{m.etiqueta}</span>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
}

function Bar({ height, color }: { height: number; color: string }) {
   const h = Math.max(height * 100, height > 0 ? 3 : 0);
   return (
      <div className="flex h-full w-2.5 items-end">
         <div
            className={`w-full rounded-t ${color} transition-all duration-500`}
            style={{ height: `${h}%` }}
         />
      </div>
   );
}

function CategoriaChart({
   items,
   colorClass,
   money,
}: {
   items: { label: string; valor: number; count: number }[];
   colorClass: string;
   money: boolean;
}) {
   const max = Math.max(1, ...items.map((i) => i.valor));
   return (
      <div className="flex flex-col gap-3">
         {items.map((i) => (
            <div key={i.label} className="group" title={money ? formatMoney(i.valor) : undefined}>
               <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{i.label}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                     <span className="text-foreground">
                        {money ? formatMoneyCompact(i.valor) : i.valor}
                     </span>
                     {i.count > 1 && <span className="hidden sm:inline">· {i.count} reg.</span>}
                  </span>
               </div>
               <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                     className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                     style={{ width: `${Math.max((i.valor / max) * 100, i.valor > 0 ? 4 : 0)}%` }}
                  />
               </div>
            </div>
         ))}
      </div>
   );
}

function DetalleSection({
   titulo,
   descripcion,
   icon,
   count,
   total,
   color,
   children,
}: {
   titulo: string;
   descripcion: string;
   icon: React.ReactNode;
   count: number;
   total?: string;
   color: string;
   children: React.ReactNode;
}) {
   const [open, setOpen] = useState(false);
   return (
      <Card className="overflow-hidden">
         <button
            onClick={() => setOpen((o) => !o)}
            className={`flex w-full items-center justify-between gap-3 border-l-4 ${color} bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30`}
         >
            <div className="flex items-center gap-3">
               <span className="text-brand-blue">{icon}</span>
               <div>
                  <p className="text-sm font-semibold">{titulo}</p>
                  <p className="text-xs text-muted-foreground">{descripcion}</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               {count > 0 && (
                  <span className="rounded-full bg-brand-blue px-2.5 py-0.5 text-xs font-semibold text-white">
                     {count}
                     {total ? ` · ${total}` : ""}
                  </span>
               )}
               {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            </div>
         </button>
         {open && <div className="border-t border-border">{children}</div>}
      </Card>
   );
}

const TH = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const TD = "px-3 py-2.5";
const TH_RIGHT = "px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const TD_RIGHT = "px-3 py-2.5 text-right";

function EmptyDetalle({ mensaje }: { mensaje: string }) {
   return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{mensaje}</p>;
}

function TablaConduces({ data }: { data: EquipoRentabilidad }) {
   if (data.conduces.length === 0) return <EmptyDetalle mensaje="No hay conduces en el período." />;
   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                  <th className={TH}>Fecha</th>
                  <th className={TH}>Ref.</th>
                  <th className={TH}>Cliente / Proyecto</th>
                  <th className={TH}>Tarifa</th>
                  <th className={TH_RIGHT}>Cant.</th>
                  <th className={TH_RIGHT}>Facturado</th>
                  <th className={TH_RIGHT}>Costo operador</th>
                  <th className={TH_RIGHT}>Diferencia</th>
               </tr>
            </thead>
            <tbody>
               {data.conduces.map((c) => {
                  const dif = c.subtotal - c.costo_operador;
                  return (
                     <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                           {format(new Date(c.fecha), "dd MMM yy", { locale: es })}
                        </td>
                        <td className={`${TD} font-mono text-xs text-brand-blue`}>{c.numero_referencia}</td>
                        <td className={TD}>
                           <span className="font-medium">{c.cliente_nombre ?? "—"}</span>
                           {c.proyecto_nombre && <span className="block text-xs text-muted-foreground">{c.proyecto_nombre}</span>}
                        </td>
                        <td className={`${TD} text-xs`}>
                           {c.tarifa_nombre}
                           <span className="text-muted-foreground"> · {c.medida_cobro}</span>
                        </td>
                        <td className={`${TD_RIGHT} text-muted-foreground`}>{c.cantidad}</td>
                        <td className={`${TD_RIGHT} font-medium text-emerald-700 dark:text-emerald-400`}>{formatMoney(c.subtotal)}</td>
                        <td className={`${TD_RIGHT} text-amber-700 dark:text-amber-400`}>{formatMoney(c.costo_operador)}</td>
                        <td className={`${TD_RIGHT} font-semibold ${dif >= 0 ? "text-brand-blue" : "text-destructive"}`}>{formatMoney(dif)}</td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
}

function TablaGastos({ data }: { data: EquipoRentabilidad }) {
   if (data.gastos.length === 0) return <EmptyDetalle mensaje="No hay gastos registrados contra este equipo." />;
   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                  <th className={TH}>Fecha</th>
                  <th className={TH}>Referencia</th>
                  <th className={TH}>Categoría</th>
                  <th className={TH}>Concepto</th>
                  <th className={TH_RIGHT}>Monto</th>
               </tr>
            </thead>
            <tbody>
               {data.gastos.map((g) => (
                  <tr key={g.id} className="border-b border-border/50 hover:bg-muted/20">
                     <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                        {format(new Date(g.fecha), "dd MMM yy", { locale: es })}
                     </td>
                     <td className={`${TD} font-mono text-xs text-brand-blue`}>{g.codigoReferencia}</td>
                     <td className={`${TD} text-xs`}>
                        <span className="rounded-md bg-secondary px-2 py-1 font-medium">{g.categoria_gasto_nombre}</span>
                     </td>
                     <td className={`${TD} font-medium`}>{g.concepto}</td>
                     <td className={`${TD_RIGHT} font-semibold text-rose-700 dark:text-rose-400`}>{formatMoney(g.monto_total)}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}

function TablaCompras({ data }: { data: EquipoRentabilidad }) {
   if (data.compras.length === 0) return <EmptyDetalle mensaje="No hay órdenes de compra con ítems para este equipo." />;
   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                  <th className={TH}>Fecha</th>
                  <th className={TH}>Orden</th>
                  <th className={TH}>Descripción</th>
                  <th className={TH}>Estado</th>
                  <th className={TH_RIGHT}>Cant.</th>
                  <th className={TH_RIGHT}>P. Unit.</th>
                  <th className={TH_RIGHT}>Subtotal</th>
               </tr>
            </thead>
            <tbody>
               {data.compras.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                     <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                        {format(new Date(c.fecha), "dd MMM yy", { locale: es })}
                     </td>
                     <td className={`${TD} font-mono text-xs text-brand-blue`}>{c.orden_codigo}</td>
                     <td className={`${TD} font-medium`}>{c.descripcion}</td>
                     <td className={`${TD} text-xs`}>
                        <span className="rounded-md bg-secondary px-2 py-1 font-medium">{c.estado}</span>
                     </td>
                     <td className={`${TD_RIGHT} text-muted-foreground`}>{c.cantidad}</td>
                     <td className={`${TD_RIGHT} text-muted-foreground`}>{formatMoney(c.precio_unitario)}</td>
                     <td className={`${TD_RIGHT} font-semibold text-brand-blue`}>{formatMoney(c.subtotal)}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}

function TablaMantenimientos({ data }: { data: EquipoRentabilidad }) {
   if (data.mantenimientos.length === 0) return <EmptyDetalle mensaje="No hay mantenimientos en el período." />;
   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                  <th className={TH}>Inicio</th>
                  <th className={TH}>Tipo</th>
                  <th className={TH}>Estado</th>
                  <th className={TH}>Descripción</th>
                  <th className={TH_RIGHT}>Costo</th>
               </tr>
            </thead>
            <tbody>
               {data.mantenimientos.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20">
                     <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                        {format(new Date(m.fecha_inicio), "dd MMM yy", { locale: es })}
                     </td>
                     <td className={`${TD} text-xs font-medium`}>{m.tipo}</td>
                     <td className={`${TD} text-xs`}>
                        <span className="rounded-md bg-secondary px-2 py-1 font-medium">{m.estado}</span>
                     </td>
                     <td className={`${TD} font-medium`}>{m.descripcion}</td>
                     <td className={`${TD_RIGHT} font-semibold text-rose-700 dark:text-rose-400`}>
                        {m.costo != null ? formatMoney(m.costo) : "—"}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}

function TablaPagos({ data }: { data: EquipoRentabilidad }) {
   if (data.pagos.length === 0) return <EmptyDetalle mensaje="No hay pagos vinculados al equipo." />;
   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                  <th className={TH}>Fecha</th>
                  <th className={TH}>Referencia</th>
                  <th className={TH}>Concepto</th>
                  <th className={TH}>Tipo</th>
                  <th className={TH}>Destino</th>
                  <th className={TH_RIGHT}>Monto</th>
               </tr>
            </thead>
            <tbody>
               {data.pagos.map((p) => {
                  const entrada = p.tipo_movimiento === "ENTRADA";
                  return (
                     <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                           {format(new Date(p.fecha), "dd MMM yy", { locale: es })}
                        </td>
                        <td className={`${TD} font-mono text-xs text-brand-blue`}>{p.codigo_referencia}</td>
                        <td className={`${TD} font-medium`}>{p.concepto}</td>
                        <td className={TD}>
                           <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${entrada ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {entrada ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                              {p.tipo_movimiento}
                           </span>
                        </td>
                        <td className={`${TD} text-xs text-muted-foreground`}>{p.destino ?? "—"}</td>
                        <td className={`${TD_RIGHT} font-semibold ${entrada ? "text-emerald-700 dark:text-emerald-400" : "text-brand-blue"}`}>
                           {formatMoney(p.monto_pagado)}
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
}
