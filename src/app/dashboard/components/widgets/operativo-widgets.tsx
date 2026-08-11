"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
   AlertTriangle, CalendarClock, FileSignature, FolderKanban,
   IdCard, ShoppingCart, Truck, Users,
} from "lucide-react";

import { useDashboardStore } from "@/stores/useDashboardStore";
import { cn } from "@/lib/utils";
import {
   BigStat, WidgetEstado, WidgetShell, fechaCorta, money, numero,
} from "./widget-shell";

// ── Nómina abierta ─────────────────────────────────────────────────────────
export function NominaAbiertaWidget() {
   const ciclos = useDashboardStore((s) => s.ciclosNomina);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("ciclosNomina"); }, [cargar]);

   return (
      <WidgetShell title="Nómina abierta" icon={Users} href="/dashboard/nomina">
         <WidgetEstado recurso={ciclos} vacioTexto="No hay ciclos abiertos">
            {(lista) => {
               const total = lista.reduce((s, c) => s + c.neto_total, 0);
               const inferidos = lista.reduce((s, c) => s + c.conduces_inferidos, 0);

               return (
                  <div className="flex flex-1 flex-col justify-between gap-3">
                     <BigStat
                        value={money(total)}
                        hint={`${numero(lista.length)} ciclo${lista.length === 1 ? "" : "s"} sin pagar`}
                     />

                     <ul className="flex flex-col gap-1.5">
                        {lista.slice(0, 3).map((c) => (
                           <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                              <Link
                                 href={`/dashboard/nomina/${c.id}`}
                                 className="truncate text-muted-foreground hover:text-foreground"
                              >
                                 {c.nombre}
                              </Link>
                              <span className="flex shrink-0 items-center gap-2">
                                 <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                    {c.estado}
                                 </span>
                                 <span className="tabular-nums">{money(c.neto_total)}</span>
                              </span>
                           </li>
                        ))}
                     </ul>

                     {/* Un conduce inferido es una SUPOSICIÓN del motor (se
                         atribuyó por equipo.operador_id, no por dato duro).
                         Pagar sobre eso sin revisar es pagarle a quien quizá
                         no trabajó. */}
                     {inferidos > 0 ? (
                        <p className="flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                           <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                           <span>
                              {numero(inferidos)} conduces atribuidos por suposición — revisar antes de pagar
                           </span>
                        </p>
                     ) : null}
                  </div>
               );
            }}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Deducciones pendientes ─────────────────────────────────────────────────
export function DeduccionesPendientesWidget() {
   const deducciones = useDashboardStore((s) => s.deducciones);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("deducciones"); }, [cargar]);

   return (
      <WidgetShell title="Deducciones pendientes" icon={Users} href="/dashboard/deducciones">
         <WidgetEstado recurso={deducciones} vacioTexto="Sin deducciones pendientes">
            {(lista) => (
               <div className="flex flex-col gap-2">
                  <BigStat
                     value={money(lista.reduce((s, d) => s + d.balance_pendiente, 0))}
                     hint={`${numero(lista.length)} en curso`}
                  />
                  <ul className="flex flex-col gap-1">
                     {lista.slice(0, 4).map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                           <span className="truncate text-muted-foreground">
                              {d.empleado_nombre ?? "—"} · {d.concepto}
                           </span>
                           <span className="shrink-0 tabular-nums">{money(d.balance_pendiente)}</span>
                        </li>
                     ))}
                  </ul>
               </div>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Proyectos activos ──────────────────────────────────────────────────────
/**
 * `conMontos` distingue los dos widgets registrados. El backend ya manda los
 * montos en NULL si el rol no puede leer finanzas; esto solo decide si se
 * pintan las columnas. La seguridad vive en el servidor, no acá.
 */
export function ProyectosActivosWidget({ conMontos = false }: { conMontos?: boolean }) {
   const proyectos = useDashboardStore((s) => s.proyectos);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("proyectos"); }, [cargar]);

   return (
      <WidgetShell
         title={conMontos ? "Proyectos y rentabilidad" : "Proyectos activos"}
         icon={FolderKanban}
         href="/dashboard/proyectos"
      >
         <WidgetEstado recurso={proyectos} vacioTexto="No hay proyectos en progreso">
            {(lista) => (
               <ul className="flex flex-col divide-y">
                  {lista.map((p) => {
                     const negativo = (p.rentabilidad ?? 0) < 0;
                     return (
                        <li key={p.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
                           <div className="flex min-w-0 flex-col">
                              <Link
                                 href={`/dashboard/proyectos/${p.id}`}
                                 className="truncate text-sm hover:underline"
                              >
                                 {p.nombre}
                              </Link>
                              <span className="truncate text-xs text-muted-foreground">
                                 {p.codigoReferencia} · {p.cliente_nombre ?? "Sin cliente"}
                              </span>
                           </div>

                           {conMontos ? (
                              <div className="flex shrink-0 flex-col items-end">
                                 <span
                                    className={cn(
                                       "text-sm tabular-nums",
                                       negativo
                                          ? "text-destructive"
                                          : "text-emerald-600 dark:text-emerald-400",
                                    )}
                                 >
                                    {money(p.rentabilidad)}
                                 </span>
                                 <span className="text-[10px] text-muted-foreground tabular-nums">
                                    {p.margen_pct === null ? "—" : `${p.margen_pct.toFixed(0)}% margen`}
                                 </span>
                              </div>
                           ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                 desde {fechaCorta(p.fecha_inicio)}
                              </span>
                           )}
                        </li>
                     );
                  })}
               </ul>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Estado de la flota ─────────────────────────────────────────────────────
export function FlotaWidget() {
   const flota = useDashboardStore((s) => s.flota);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("flota"); }, [cargar]);

   return (
      <WidgetShell title="Estado de la flota" icon={Truck} href="/dashboard/equipos">
         <WidgetEstado recurso={flota} vacioTexto="Sin equipos registrados">
            {(f) => (
               <div className="flex flex-1 flex-col justify-between gap-3">
                  <BigStat value={`${numero(f.activos)} / ${numero(f.total)}`} hint="Equipos activos" />
                  <div className="flex flex-col gap-1.5 text-xs">
                     <Fila label="Activos" valor={f.activos} clase="bg-emerald-500" />
                     <Fila label="En mantenimiento" valor={f.en_mantenimiento} clase="bg-amber-500" />
                     <Fila label="Inactivos" valor={f.inactivos} clase="bg-muted-foreground/40" />
                  </div>
               </div>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

function Fila({ label, valor, clase }: { label: string; valor: number; clase: string }) {
   return (
      <div className="flex items-center justify-between gap-2">
         <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className={cn("size-2 rounded-full", clase)} aria-hidden />
            {label}
         </span>
         <span className="tabular-nums">{numero(valor)}</span>
      </div>
   );
}

// ── Alertas de equipos ─────────────────────────────────────────────────────
/**
 * Deriva las alertas de fechas e historial: días sin preventivo,
 * mantenimientos que se alargan y correctivos repetidos.
 *
 * NO es un semáforo por uso — `equipo` no guarda horómetro ni kilometraje, así
 * que "le faltan 200 horas para el servicio" no se puede calcular hoy.
 */
export function AlertasEquiposWidget() {
   const alertas = useDashboardStore((s) => s.alertasEquipos);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("alertasEquipos"); }, [cargar]);

   return (
      <WidgetShell title="Alertas de equipos" icon={AlertTriangle} href="/dashboard/mantenimientos">
         <WidgetEstado recurso={alertas} vacioTexto="Ningún equipo requiere atención">
            {(lista) => (
               <ul className="flex flex-col divide-y">
                  {lista.map((a) => (
                     <li key={a.equipo_id} className="flex items-center gap-2.5 py-2 first:pt-0">
                        <span
                           className={cn(
                              "size-2 shrink-0 rounded-full",
                              a.severidad === "ROJO" ? "bg-destructive" : "bg-amber-500",
                           )}
                           aria-label={a.severidad === "ROJO" ? "Crítico" : "Advertencia"}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                           <Link
                              href={`/dashboard/equipos/${a.equipo_id}`}
                              className="truncate text-sm hover:underline"
                           >
                              {a.nombre}
                              {a.placa ? (
                                 <span className="text-muted-foreground"> · {a.placa}</span>
                              ) : null}
                           </Link>
                           <span className="truncate text-xs text-muted-foreground">{a.detalle}</span>
                        </div>
                     </li>
                  ))}
               </ul>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Conduces sin firmar ────────────────────────────────────────────────────
export function ConducesSinFirmarWidget() {
   const conduces = useDashboardStore((s) => s.conducesSinFirmar);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("conducesSinFirmar"); }, [cargar]);

   return (
      <WidgetShell title="Conduces sin firmar" icon={FileSignature} href="/dashboard/conduces">
         <WidgetEstado recurso={conduces} vacioTexto="Todos los conduces están firmados">
            {(lista) => (
               <div className="flex flex-col gap-2">
                  {/* Sin firma del cliente el conduce no se puede cobrar: por
                      eso el monto trabado va primero. */}
                  <BigStat
                     value={money(lista.reduce((s, c) => s + c.subtotal, 0))}
                     tone="warning"
                     hint={`${numero(lista.length)} conduces trabados`}
                  />
                  <ul className="flex flex-col divide-y">
                     {lista.slice(0, 4).map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                           <div className="flex min-w-0 flex-col">
                              <span className="truncate">
                                 #{c.numero_referencia} · {c.cliente_nombre ?? "Sin cliente"}
                              </span>
                              <span className="text-muted-foreground">
                                 falta {c.falta_firma_recibido ? "recibido" : ""}
                                 {c.falta_firma_recibido && c.falta_firma_chofer ? " y " : ""}
                                 {c.falta_firma_chofer ? "chofer" : ""}
                              </span>
                           </div>
                           <span className="shrink-0 text-muted-foreground tabular-nums">
                              {numero(c.dias_pendiente)} d
                           </span>
                        </li>
                     ))}
                  </ul>
               </div>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Licencias por vencer ───────────────────────────────────────────────────
export function LicenciasPorVencerWidget() {
   const licencias = useDashboardStore((s) => s.licencias);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("licencias"); }, [cargar]);

   return (
      <WidgetShell title="Licencias por vencer" icon={IdCard} href="/dashboard/empleados">
         <WidgetEstado recurso={licencias} vacioTexto="Ninguna licencia próxima a vencer">
            {(lista) => (
               <ul className="flex flex-col divide-y">
                  {lista.map((l) => {
                     const vencida = l.dias_para_vencer < 0;
                     return (
                        <li key={l.operador_id} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0">
                           <Link
                              href={`/dashboard/empleados/${l.empleado_id}`}
                              className="truncate hover:underline"
                           >
                              {l.empleado_nombre}
                           </Link>
                           <span
                              className={cn(
                                 "shrink-0 text-xs tabular-nums",
                                 vencida ? "font-medium text-destructive" : "text-amber-600 dark:text-amber-400",
                              )}
                           >
                              {vencida
                                 ? `vencida hace ${numero(Math.abs(l.dias_para_vencer))} d`
                                 : `en ${numero(l.dias_para_vencer)} d`}
                           </span>
                        </li>
                     );
                  })}
               </ul>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Órdenes de compra pendientes ───────────────────────────────────────────
export function OrdenesPendientesWidget() {
   const ordenes = useDashboardStore((s) => s.ordenes);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("ordenes"); }, [cargar]);

   return (
      <WidgetShell title="Órdenes por aprobar" icon={ShoppingCart} href="/dashboard/compras">
         <WidgetEstado recurso={ordenes} vacioTexto="Sin órdenes por aprobar">
            {(lista) => (
               <div className="flex flex-col gap-2">
                  <BigStat
                     value={money(lista.reduce((s, o) => s + o.total, 0))}
                     hint={`${numero(lista.length)} órdenes esperando`}
                  />
                  <ul className="flex flex-col divide-y">
                     {lista.slice(0, 4).map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                           <span className="truncate">
                              {o.codigoReferencia} · {o.proveedor_nombre ?? "Sin proveedor"}
                           </span>
                           <span className="shrink-0 tabular-nums">{money(o.total)}</span>
                        </li>
                     ))}
                  </ul>
               </div>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}

// ── Citas próximas ─────────────────────────────────────────────────────────
export function CitasProximasWidget() {
   const citas = useDashboardStore((s) => s.citas);
   const cargar = useDashboardStore((s) => s.cargar);

   useEffect(() => { void cargar("citas"); }, [cargar]);

   return (
      <WidgetShell title="Citas de la semana" icon={CalendarClock} href="/dashboard/citas">
         <WidgetEstado recurso={citas} vacioTexto="Sin citas próximas">
            {(lista) => (
               <ul className="flex flex-col divide-y">
                  {lista.map((c) => (
                     <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0">
                        <div className="flex min-w-0 flex-col">
                           <span className="truncate">{c.cliente_nombre ?? "Sin cliente"}</span>
                           <span className="truncate text-xs text-muted-foreground">
                              {c.motivo ?? "Sin motivo"}
                           </span>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                           {fechaCorta(c.fecha)}
                        </span>
                     </li>
                  ))}
               </ul>
            )}
         </WidgetEstado>
      </WidgetShell>
   );
}
