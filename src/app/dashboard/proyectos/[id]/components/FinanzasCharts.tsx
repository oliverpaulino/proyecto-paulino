"use client";

import {
   Bar,
   BarChart,
   CartesianGrid,
   Cell,
   Pie,
   PieChart,
   ResponsiveContainer,
   Tooltip,
   XAxis,
   YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { formatMoney } from "./formatMoney";

const BRAND_BLUE = "#003B96";
const BRAND_YELLOW = "#FBBF24";
const GREEN = "#16A34A";
const ORANGE = "#F97316";
const RED = "#DC2626";
const PURPLE = "#8B5CF6";
const GRAY = "#9CA3AF";

const TOOLTIP_BOX = {
   borderRadius: 8,
   border: `1px solid ${BRAND_BLUE}`,
   boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
   fontSize: 12,
};

function fmtFecha(fecha: string): string {
   const d = new Date(`${fecha.slice(0, 10)}T12:00:00`);
   if (isNaN(d.getTime())) return fecha;
   return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit" });
}

function MoneyTooltip({ active, payload, label }: any) {
   if (!active || !payload?.length) return null;
   return (
      <div
         style={{
            backgroundColor: "white",
            padding: "8px 12px",
            ...TOOLTIP_BOX,
            color: "#141414",
         }}
      >
         {label != null && <p className="mb-1 font-semibold">{label}</p>}
         {payload.map((p: any) => (
            <p key={p.name} className="flex items-center gap-2">
               <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: p.color ?? p.payload?.fill }}
               />
               <span className="text-muted-foreground">{p.name}:</span>
               <span className="font-semibold">{formatMoney(Number(p.value))}</span>
            </p>
         ))}
      </div>
   );
}

function Donut({ title, description, data, centro }: { title: string; description: string; data: { name: string; value: number; color: string }[]; centro: number }) {
   const total = data.reduce((s, d) => s + d.value, 0);
   return (
      <Card className="min-w-0">
         <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
         </CardHeader>
         <CardContent>
            {data.length === 0 ? (
               <p className="py-10 text-center text-sm text-muted-foreground">Sin datos para mostrar.</p>
            ) : (
               <div className="relative h-52">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={data}
                           dataKey="value"
                           nameKey="name"
                           innerRadius={58}
                           outerRadius={82}
                           paddingAngle={2}
                           strokeWidth={0}
                           animationDuration={600}
                        >
                           {data.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                           ))}
                        </Pie>
                        <Tooltip content={<MoneyTooltip />} />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-lg font-bold text-foreground">{formatMoney(centro)}</span>
                     <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
                  </div>
               </div>
            )}
            {data.length > 0 && (
               <ul className="mt-2 space-y-1.5">
                  {data.map((d) => (
                     <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                           <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                           <span className="truncate text-muted-foreground">{d.name}</span>
                        </span>
                        <span className="shrink-0 font-semibold">{formatMoney(d.value)}</span>
                     </li>
                  ))}
               </ul>
            )}
         </CardContent>
      </Card>
   );
}

export function FinanzasCharts({ proyecto }: { proyecto: Proyecto }) {
   const tarifa = Number(proyecto.tarifa_servicio ?? 0);

   // Gastos del módulo Gastos vinculados al proyecto.
   const gastosModulo = proyecto.gastos ?? [];
   const gastosCobrables = gastosModulo.filter((g) => g.cobrable_proyecto && g.cobrable_monto != null);
   const totalGastosCobrables = gastosCobrables.reduce((s, g) => s + Number(g.cobrable_monto), 0);
   const totalGastosInternos = gastosModulo
      .filter((g) => !g.cobrable_proyecto)
      .reduce((s, g) => s + Number(g.monto_total), 0);

   const conduces = proyecto.conduces ?? [];

   const totalConducesCobrables = conduces
      .filter((c) => c.es_cobrable)
      .reduce((s, c) => s + Number(c.subtotal), 0);

   const ingresos = [
      { name: "Tarifa del servicio", value: tarifa, color: BRAND_BLUE },
      { name: "Conduces cobrables", value: totalConducesCobrables, color: BRAND_YELLOW },
      { name: "Gastos cobrables", value: totalGastosCobrables, color: PURPLE },
   ].filter((d) => d.value > 0);

   // Lo que cuesta el proyecto de verdad. Los conduces NO cobrables son solo
   // historial (no se facturan y no cuentan como gasto), así que NO entran
   // aquí. Los gastos cobrables tampoco: se le facturan al cliente y ya están
   // en el donut de ingresos.
   const gastos = [
      { name: "Costo de operadores", value: Number(proyecto.total_costo_operador ?? 0), color: ORANGE },
      { name: "Gastos incobrables", value: totalGastosInternos, color: RED },
   ].filter((d) => d.value > 0);

   // Ingresos cobrables por fecha (serie temporal).
   const porFecha = new Map<string, number>();
   for (const c of conduces) {
      if (!c.es_cobrable) continue;
      const key = c.fecha.slice(0, 10);
      porFecha.set(key, (porFecha.get(key) ?? 0) + Number(c.subtotal));
   }
   const serieFecha = [...porFecha.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-15)
      .map(([fecha, total]) => ({ fecha: fmtFecha(fecha), fechaKey: fecha, total }));

   // Top equipos por subtotal facturado.
   const porEquipo = new Map<string, number>();
   for (const c of conduces) {
      if (!c.es_cobrable) continue;
      const nombre = c.equipo_nombre ?? "Equipo";
      porEquipo.set(nombre, (porEquipo.get(nombre) ?? 0) + Number(c.subtotal));
   }
   const topEquipos = [...porEquipo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nombre, total]) => ({ nombre: nombre.length > 18 ? `${nombre.slice(0, 18)}…` : nombre, total }));

   const totalCobrable = Number(proyecto.total_cobrable ?? 0);
   const totalCostoOperador = Number(proyecto.total_costo_operador ?? 0);
   // Costo total = gastos internos del módulo + pago a los operadores por TODO
   // su trabajo. Los conduces no cobrables no son gasto (solo historial).
   const costosTotales = totalCostoOperador + totalGastosInternos;
   const rentabilidad = Number(proyecto.rentabilidad ?? 0);
   const pctGastos = totalCobrable > 0 ? Math.min(100, (costosTotales / totalCobrable) * 100) : 0;

   return (
      <div className="space-y-6">
         {/* Balance del proyecto: ingresos vs gastos, efecto neto en rentabilidad */}
         <Card>
            <CardHeader>
               <CardTitle className="text-base">Balance del proyecto</CardTitle>
               <CardDescription>
                  Cuánto se factura (cobrables) frente a cuánto cuesta (costo de operadores + gastos
                  incobrables del módulo Gastos). El resto es la rentabilidad.
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                     <p className="text-xs uppercase tracking-wide text-green-600">Ingresos (cobrables)</p>
                     <p className="mt-1 text-lg font-bold text-foreground">{formatMoney(totalCobrable)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                     <p className="text-xs uppercase tracking-wide text-red-500">Gastos</p>
                     <p className="mt-1 text-lg font-bold text-foreground">{formatMoney(costosTotales)}</p>
                  </div>
                  <div className="rounded-lg border p-3" style={{ borderColor: rentabilidad >= 0 ? GREEN : RED, backgroundColor: rentabilidad >= 0 ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)" }}>
                     <p className="text-xs uppercase tracking-wide" style={{ color: rentabilidad >= 0 ? GREEN : RED }}>
                        Rentabilidad
                     </p>
                     <p className="mt-1 text-lg font-bold" style={{ color: rentabilidad >= 0 ? GREEN : RED }}>
                        {formatMoney(rentabilidad)}
                     </p>
                  </div>
               </div>

               {totalCobrable > 0 && (
                  <div>
                     <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: "100%", backgroundColor: GREEN, opacity: 0.9 }} />
                        <div
                           className="absolute inset-y-0 left-0 rounded-full"
                           style={{ width: `${pctGastos}%`, backgroundColor: RED, opacity: 0.85 }}
                        />
                     </div>
                     <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                           <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: GREEN }} />
                           Ingresos {formatMoney(totalCobrable)}
                        </span>
                        <span className="flex items-center gap-1">
                           <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: RED }} />
                           Gastos {formatMoney(costosTotales)} ({Math.round(pctGastos)}% de los ingresos)
                        </span>
                        <span className="flex items-center gap-1 font-semibold" style={{ color: rentabilidad >= 0 ? GREEN : RED }}>
                           {rentabilidad >= 0 ? "Ganancia" : "Pérdida"} {formatMoney(Math.abs(rentabilidad))}
                        </span>
                     </div>
                  </div>
               )}
            </CardContent>
         </Card>

         <div className="grid gap-4 lg:grid-cols-2">
            <Donut
               title="Composición de lo cobrable"
               description="De dónde sale lo que se le factura al cliente."
               data={ingresos}
               centro={Number(proyecto.total_cobrable ?? 0)}
            />
            <Donut
               title="Composición de gastos"
               description="Costo de operadores y gastos incobrables (corren por cuenta de la empresa)."
               data={gastos}
               centro={costosTotales}
            />
         </div>

         <Card>
            <CardHeader>
               <CardTitle className="text-base">Ingresos cobrables por día</CardTitle>
               <CardDescription>
                  Subtotal facturado de conduces cobrables, día por día.
               </CardDescription>
            </CardHeader>
            <CardContent>
               {serieFecha.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                     No hay conduces cobrables para graficar.
                  </p>
               ) : (
                  <div className="h-56">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={serieFecha} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                           <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                           <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fill: "#6B7280" }}
                              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                              width={40}
                           />
                           <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(0,59,150,0.06)" }} />
                           <Bar dataKey="total" name="Cobrable" fill={BRAND_BLUE} radius={[4, 4, 0, 0]} animationDuration={600} maxBarSize={40} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               )}
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
               <CardTitle className="text-base">Top equipos facturados</CardTitle>
               <CardDescription>Subtotal cobrable por equipo del proyecto.</CardDescription>
            </CardHeader>
            <CardContent>
               {topEquipos.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                     No hay conduces cobrables para graficar.
                  </p>
               ) : (
                  <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={topEquipos}
                           layout="vertical"
                           margin={{ top: 0, right: 12, left: 8, bottom: 0 }}
                        >
                           <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                           <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
                           <YAxis
                              type="category"
                              dataKey="nombre"
                              width={120}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fill: "#374151" }}
                           />
                           <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(251,191,36,0.10)" }} />
                           <Bar dataKey="total" name="Cobrable" fill={BRAND_YELLOW} radius={[0, 4, 4, 0]} animationDuration={600} maxBarSize={24} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               )}
            </CardContent>
         </Card>
      </div>
   );
}
