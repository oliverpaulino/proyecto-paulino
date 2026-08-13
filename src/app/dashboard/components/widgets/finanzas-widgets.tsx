"use client";

import { useEffect } from "react";
import {
   Banknote, TrendingDown, TrendingUp, Wallet, Receipt,
} from "lucide-react";

import { useDashboardStore } from "@/stores/useDashboardStore";
import { useCuentasPorCobrarStore } from "@/stores/useCuentasPorCobrarStore";
import { useCuentasPorPagarStore } from "@/stores/useCuentasPorPagarStore";
import { cn } from "@/lib/utils";
import {
   BigStat, WidgetEstado, WidgetShell, fechaCorta, money, numero,
} from "./widget-shell";
import { COLOR_COBRADO, COLOR_GASTADO, LineChart } from "./line-chart";

/** "2026-08" → "ago 26". El eje necesita algo corto y legible. */
function etiquetaMes(mes: string): string {
   const [anio, m] = mes.split("-").map(Number);
   const d = new Date(anio, (m ?? 1) - 1, 1);
   if (Number.isNaN(d.getTime())) return mes;
   const nombre = new Intl.DateTimeFormat("es-DO", { month: "short" }).format(d);
   return `${nombre} ${String(anio).slice(2)}`;
}

// ── Facturación de la semana ───────────────────────────────────────────────
export function FacturacionSemanalWidget() {
   const facturacion = useDashboardStore((s) => s.facturacion);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("facturacion"); }, [cargar]);

   return (
      <WidgetShell title="Facturado esta semana" icon={Receipt} href="/dashboard/conduces">
         <WidgetEstado recurso={facturacion} vacioTexto="Sin conduces cobrables esta semana">
            {(d) => {
               const sube = (d.variacion_pct ?? 0) >= 0;
               const maximo = Math.max(...d.serie.map((x) => x.monto), 1);

               return (
                  <div className="flex flex-1 flex-col justify-between gap-3">
                     <BigStat
                        value={money(d.total_semana)}
                        hint={
                           <span className="flex items-center gap-1">
                              {d.variacion_pct === null ? (
                                 "Sin semana anterior para comparar"
                              ) : (
                                 <>
                                    {sube ? (
                                       <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                    ) : (
                                       <TrendingDown className="size-3 text-destructive" aria-hidden />
                                    )}
                                    <span className={cn(sube ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                                       {sube ? "+" : ""}{d.variacion_pct.toFixed(0)}%
                                    </span>
                                    <span>vs. semana anterior</span>
                                 </>
                              )}
                           </span>
                        }
                     />

                     {/* Sparkline en CSS: no vale traer una librería de charts
                         para 7 barras. */}
                     <div className="flex h-12 items-end gap-1" aria-hidden>
                        {d.serie.map((dia) => (
                           <div
                              key={dia.fecha}
                              className="flex-1 rounded-sm bg-primary/20 transition-colors hover:bg-primary/40"
                              style={{ height: `${Math.max((dia.monto / maximo) * 100, 3)}%` }}
                              title={`${fechaCorta(dia.fecha)}: ${money(dia.monto)}`}
                           />
                        ))}
                     </div>

                     <p className="text-xs text-muted-foreground">
                        {numero(d.cantidad_conduces)} conduces facturados al cliente
                     </p>
                  </div>
               );
            }}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Cobros vs. gastos ──────────────────────────────────────────────────────
export function FlujoMensualWidget() {
   const flujo = useDashboardStore((s) => s.flujo);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("flujo"); }, [cargar]);

   return (
      <WidgetShell title="Cobros vs. gastos (6 meses)" icon={Banknote} href="/dashboard/pagos">
         <WidgetEstado recurso={flujo} vacioTexto="Sin movimientos en el período">
            {(serie) => {
               const totalCobrado = serie.reduce((s, m) => s + m.cobrado, 0);
               const totalGastado = serie.reduce((s, m) => s + m.gastado, 0);
               const neto = totalCobrado - totalGastado;

               return (
                  <div className="flex flex-1 flex-col gap-4">
                     <div className="flex flex-wrap gap-6">
                        <BigStat
                           value={money(neto)}
                           tone={neto >= 0 ? "positive" : "negative"}
                           hint="Neto del período"
                        />
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                           <span>Cobrado {money(totalCobrado)}</span>
                           <span>Gastado {money(totalGastado)}</span>
                        </div>
                     </div>

                     <LineChart
                        etiquetas={serie.map((m) => etiquetaMes(m.mes))}
                        series={[
                           {
                              key: "cobrado",
                              label: "Cobrado",
                              color: COLOR_COBRADO,
                              valores: serie.map((m) => m.cobrado),
                           },
                           {
                              key: "gastado",
                              label: "Gastado",
                              color: COLOR_GASTADO,
                              valores: serie.map((m) => m.gastado),
                           },
                        ]}
                        formato={money}
                     />
                  </div>
               );
            }}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Cuentas por cobrar ─────────────────────────────────────────────────────
/**
 * Reusa el store de CxC en vez de un endpoint nuevo: `listar` ya devuelve el
 * `resumen` con pendiente y antigüedad, y duplicar esa agregación en el panel
 * abriría la puerta a que las dos pantallas muestren números distintos.
 */
export function CuentasPorCobrarWidget() {
   const { resumen, loading, GetCuentas } = useCuentasPorCobrarStore();

   useEffect(() => { void GetCuentas({ page: 1, pageSize: 1 }); }, [GetCuentas]);

   return (
      <WidgetShell title="Cuentas por cobrar" icon={Wallet} href="/dashboard/cuentas-por-cobrar">
         <WidgetEstado
            recurso={{ data: resumen, loading, denegado: false, error: null }}
            vacioTexto="Nada pendiente de cobro"
         >
            {(r) => (
               <div className="flex flex-1 flex-col justify-between gap-3">
                  <BigStat
                     value={money(r.total_pendiente)}
                     hint={`${numero(r.documentos_pendientes ?? 0)} documentos pendientes`}
                  />
                  <AntiguedadBarra antiguedad={r.antiguedad} />
               </div>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Cuentas por pagar ──────────────────────────────────────────────────────
export function CuentasPorPagarWidget() {
   const { resumen, loading, GetCuentas } = useCuentasPorPagarStore();

   useEffect(() => { void GetCuentas({ page: 1, pageSize: 1 }); }, [GetCuentas]);

   return (
      <WidgetShell title="Cuentas por pagar" icon={Wallet} href="/dashboard/cuentas-por-pagar">
         <WidgetEstado
            recurso={{ data: resumen, loading, denegado: false, error: null }}
            vacioTexto="Nada pendiente de pago"
         >
            {(r) => (
               <div className="flex flex-1 flex-col justify-between gap-3">
                  <BigStat
                     value={money(r.total_pendiente)}
                     tone="warning"
                     hint={`${numero(r.pendientes + r.parciales)} documentos pendientes`}
                  />
                  <AntiguedadBarra antiguedad={r.antiguedad} />
               </div>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

/**
 * Barra de antigüedad. Lo viejo se pinta más fuerte: en cobros y pagos, la
 * edad de la deuda es la señal, no el monto total.
 */
function AntiguedadBarra({
   antiguedad,
}: {
   antiguedad?: {
      hasta_30: number;
      de_31_a_60: number;
      de_61_a_90: number;
      mas_de_90: number;
   } | null;
}) {
   if (!antiguedad) return null;

   const tramos = [
      { label: "0-30 d", valor: antiguedad.hasta_30, clase: "bg-emerald-500/70" },
      { label: "31-60 d", valor: antiguedad.de_31_a_60, clase: "bg-amber-400/80" },
      { label: "61-90 d", valor: antiguedad.de_61_a_90, clase: "bg-orange-500/80" },
      { label: "+90 d", valor: antiguedad.mas_de_90, clase: "bg-destructive/80" },
   ];
   const total = tramos.reduce((s, t) => s + t.valor, 0);
   if (total <= 0) return null;

   return (
      <div className="flex flex-col gap-1.5">
         <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            {tramos.map((t) =>
               t.valor > 0 ? (
                  <div
                     key={t.label}
                     className={t.clase}
                     style={{ width: `${(t.valor / total) * 100}%` }}
                     title={`${t.label}: ${money(t.valor)}`}
                  />
               ) : null,
            )}
         </div>
         <div className="flex justify-between gap-2 text-[10px] text-muted-foreground">
            <span className="truncate">0-30 d</span>
            <span className={cn("shrink-0 whitespace-nowrap", antiguedad.mas_de_90 > 0 && "font-medium text-destructive")}>
               +90 d: {money(antiguedad.mas_de_90)}
            </span>
         </div>
      </div>
   );
}
