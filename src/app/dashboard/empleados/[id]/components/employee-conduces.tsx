"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Truck, HardHat, Loader2, CalendarSearch } from "lucide-react";
import { useConduceStore } from "@/stores/useConduceStores";

interface EmployeeConducesProps {
   empleadoId: string;
   ocultarProyecto?: boolean;
}

export function EmployeeConduces({ empleadoId, ocultarProyecto = false }: EmployeeConducesProps) {
   const { conduces, loading, GetConduces, DeleteConduce } = useConduceStore();

   // Filtros de fecha para la quincena/mensualidad
   const [fechaDesde, setFechaDesde] = useState("");
   const [fechaHasta, setFechaHasta] = useState("");
   const [deletingId, setDeletingId] = useState<string | null>(null);

   // Fetch automático al cambiar fechas o cargar el componente
   useEffect(() => {
      GetConduces({
         empleado_id: empleadoId, // Ajusta a empleado_id si tu backend lo requiere así
         fecha_desde: fechaDesde || undefined,
         fecha_hasta: fechaHasta || undefined,
         pageSize: 10, // Ajusta la paginación si es necesario
      });
   }, [empleadoId, fechaDesde, fechaHasta, GetConduces]);

   // Cálculo dinámico de totales basado en los conduces filtrados
   const resumen = useMemo(() => {
      let totalViajes = 0;
      let totalHoras = 0;
      let produccionBruta = 0;

      conduces.forEach((c) => {
         if (c.tipo_conduce === "CAMION") {
            totalViajes += c.cantidad;
         } else {
            totalHoras += c.total_horas;
         }
         produccionBruta += c.subtotal;
      });

      return { totalViajes, totalHoras, produccionBruta };
   }, [conduces]);

   const handleDelete = async (id: string) => {
      if (!confirm("¿Eliminar este conduce? Esta acción no se puede deshacer.")) return;
      setDeletingId(id);
      await DeleteConduce(id);
      setDeletingId(null);
      // Refrescar lista tras eliminar
      GetConduces({ empleado_id: empleadoId, fecha_desde: fechaDesde || undefined, fecha_hasta: fechaHasta || undefined });
   };

   return (
      <div className="space-y-4">
         {/* ── BARRA DE FILTROS Y RESUMEN ── */}
         <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-4">
               <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Desde</label>
                  <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                  <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
               </div>
               <div className="flex items-end pb-1">
                  {(fechaDesde || fechaHasta) && (
                     <Button variant="ghost" size="sm" onClick={() => { setFechaDesde(""); setFechaHasta(""); }}>
                        Limpiar
                     </Button>
                  )}
               </div>
            </div>

            <div className="flex flex-wrap gap-6 rounded-lg bg-background p-3 shadow-sm border">
               <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Viajes / Metros</p>
                  <p className="text-lg font-bold">{resumen.totalViajes}</p>
               </div>
               <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Horas Trabajadas</p>
                  <p className="text-lg font-bold">{resumen.totalHoras.toFixed(2)}</p>
               </div>
               <div className="border-l pl-4">
                  <p className="text-[10px] font-semibold uppercase text-brand-blue">Producción Bruta</p>
                  <p className="text-lg font-bold text-brand-blue">
                     RD$ {resumen.produccionBruta.toLocaleString("es-DO")}
                  </p>
               </div>
            </div>
         </div>

         {/* ── TABLA DE CONDUCES ── */}
         {loading ? (
            <div className="flex items-center justify-center py-12">
               <Loader2 className="size-6 animate-spin text-brand-blue" />
            </div>
         ) : conduces.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground border rounded-xl border-dashed">
               <CalendarSearch className="size-8 opacity-20" />
               <p className="text-sm">No hay conduces registrados en este período.</p>
            </div>
         ) : (
            <div className="overflow-x-auto rounded-xl border">
               <table className="w-full text-sm">
                  {/* El thead y tbody se mantienen exactamente igual a tu código original */}
                  <thead>
                     <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Referencia</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Fecha</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Cliente</th>
                        {!ocultarProyecto && (
                           <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Proyecto</th>
                        )}
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Equipo</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Detalle</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Cant./Horas</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Cobrable</th>
                        <th className="px-3 py-3" />
                     </tr>
                  </thead>
                  <tbody>
                     {conduces.map((c) => (
                        <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                           <td className="px-3 py-3">
                              {c.tipo_conduce === "CAMION" ? (
                                 <Badge className="border-0 bg-blue-100 text-blue-800 text-xs gap-1">
                                    <Truck className="size-3" /> Camión
                                 </Badge>
                              ) : (
                                 <Badge className="border-0 bg-orange-100 text-orange-800 text-xs gap-1">
                                    <HardHat className="size-3" /> Equipo
                                 </Badge>
                              )}
                           </td>
                           <td className="px-3 py-3 font-medium">{c.numero_referencia}</td>
                           <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                              {new Date(c.fecha).toLocaleDateString("es-DO")}
                           </td>
                           <td className="px-3 py-3">
                              {c.cliente_nombre ?? "—"}
                              {c.cliente_telefono && <div className="text-xs text-muted-foreground">{c.cliente_telefono}</div>}
                           </td>
                           {!ocultarProyecto && (
                              <td className="px-3 py-3">
                                 {c.proyecto_id ? (
                                    <Link href={`/dashboard/proyectos/${c.proyecto_id}`} className="text-blue-600 hover:underline">
                                       {c.proyecto_nombre ?? "Ver proyecto"}
                                    </Link>
                                 ) : (
                                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Sin asignar</Badge>
                                 )}
                              </td>
                           )}
                           <td className="px-3 py-3">{c.equipo_nombre ?? "—"}</td>
                           <td className="px-3 py-3 text-xs text-muted-foreground max-w-[220px]">
                              {c.tipo_conduce === "CAMION" ? (
                                 <span>{c.categoria_equipo_tarifa_nombre ?? "—"} · {c.procedencia} → {c.destino}</span>
                              ) : (
                                 <span>
                                    {c.horario_manana_inicio && c.horario_manana_fin ? `AM ${c.horario_manana_inicio}-${c.horario_manana_fin}` : "AM —"}
                                    {" / "}
                                    {c.horario_tarde_inicio && c.horario_tarde_fin ? `PM ${c.horario_tarde_inicio}-${c.horario_tarde_fin}` : "PM —"}
                                    {c.combustible_pagado_cliente && " · combustible cliente"}
                                 </span>
                              )}
                           </td>
                           <td className="px-3 py-3 text-right whitespace-nowrap">
                              {c.tipo_conduce === "CAMION" ? `${c.categoria_equipo_tarifa_nombre} ${c.medida_cobro_nombre ?? ""}` : `${c.total_horas.toFixed(2)} h`}
                           </td>
                           <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                              RD$ {c.subtotal.toLocaleString("es-DO")}
                           </td>
                           <td className="px-3 py-3 text-center">
                              {c.es_cobrable ? (
                                 <Badge className="border-0 bg-green-100 text-green-800 text-xs">Sí</Badge>
                              ) : (
                                 <Badge className="border-0 bg-gray-100 text-gray-600 text-xs">No</Badge>
                              )}
                           </td>
                           <td className="px-3 py-3 text-right">
                              <Button
                                 type="button"
                                 variant="ghost"
                                 size="icon"
                                 className="size-7 text-muted-foreground hover:text-destructive"
                                 disabled={deletingId === c.id}
                                 onClick={() => handleDelete(c.id)}
                              >
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>
   );
}