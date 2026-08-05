"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HardHat, Loader2 } from "lucide-react";
import { useSubcontratacionStore } from "@/stores/useSubcontratacionStore";
import type { EstadoPago, EstadoTrabajo } from "@/dtos/subcontratacion.dto";

const ESTADO_TRABAJO_STYLE: Record<EstadoTrabajo, string> = {
   PENDIENTE: "bg-red-100 text-red-800",
   EN_PROGRESO: "bg-blue-100 text-blue-800",
   TERMINADA: "bg-green-100 text-green-800",
   CANCELADA: "bg-gray-100 text-gray-600",
   PARADO: "bg-amber-100 text-amber-800",
};

const ESTADO_TRABAJO_LABEL: Record<EstadoTrabajo, string> = {
   PENDIENTE: "Pendiente",
   EN_PROGRESO: "En progreso",
   TERMINADA: "Terminada",
   CANCELADA: "Cancelada",
   PARADO: "Parada",
};

const ESTADO_PAGO_STYLE: Record<EstadoPago, string> = {
   PENDIENTE: "bg-red-100 text-red-800",
   PARCIAL: "bg-amber-100 text-amber-800",
   PAGADO: "bg-green-100 text-green-800",
};

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fecha = (s: string | Date) =>
   new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
   });

/**
 * Tab de subcontrataciones de la ficha de equipo. Se monta solo cuando el
 * usuario entra al tab, así que la data se pide en ese momento y no al cargar
 * la página; el store cachea por filtros para no re-pedir al remontar.
 */
export function EquipoSubcontrataciones({ equipoId }: { equipoId: string }) {
   const router = useRouter();
   const { subcontrataciones, loading: subLoading, GetSubcontrataciones } = useSubcontratacionStore();
   const [loaded, setLoaded] = useState(false);
   const [busqueda, setBusqueda] = useState("");
   const [desde, setDesde] = useState("");
   const [hasta, setHasta] = useState("");
   const [estadoPago, setEstadoPago] = useState<EstadoPago | "">("");

   useEffect(() => {
      let active = true;
      GetSubcontrataciones({ equipo_id: equipoId, incluir_pagadas: true, pageSize: 1000 }).then(() => {
         if (active) setLoaded(true);
      });
      return () => {
         active = false;
      };
   }, [equipoId, GetSubcontrataciones]);

   const filtradas = useMemo(() => {
      const q = busqueda.trim().toLowerCase();
      return subcontrataciones.filter((s) => {
         if (estadoPago && s.estado_pago !== estadoPago) return false;
         const d = new Date(`${String(s.fecha_deuda).slice(0, 10)}T12:00:00`);
         if (desde && d < new Date(`${desde}T12:00:00`)) return false;
         if (hasta && d > new Date(`${hasta}T12:00:00`)) return false;
         if (q) {
            const hay =
               `${s.codigoReferencia} ${s.trabajo_descripcion ?? ""} ${s.proveedor_nombre ?? ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
         }
         return true;
      });
   }, [subcontrataciones, busqueda, desde, hasta, estadoPago]);

   const loading = subLoading || !loaded;
   const conFiltros = Boolean(busqueda || desde || hasta || estadoPago);

   return (
      <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <HardHat className="size-5 text-brand-blue" />
               Subcontrataciones
            </CardTitle>
            <CardDescription>
               Trabajos de subcontratistas asignados a este equipo y su deuda.
            </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
               <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                     Buscar por referencia o trabajo
                  </label>
                  <Input
                     placeholder="Ej: SUB-001 o soldadura..."
                     value={busqueda}
                     onChange={(e) => setBusqueda(e.target.value)}
                  />
               </div>
               <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
                  <Input
                     type="date"
                     className="h-10 w-40"
                     value={desde}
                     onChange={(e) => setDesde(e.target.value)}
                  />
               </div>
               <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
                  <Input
                     type="date"
                     className="h-10 w-40"
                     value={hasta}
                     onChange={(e) => setHasta(e.target.value)}
                  />
               </div>
               <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado pago</label>
                  <div className="flex gap-1 flex-wrap">
                     {([
                        { value: "", label: "Todos" },
                        { value: "PENDIENTE", label: "Sin pagos" },
                        { value: "PARCIAL", label: "Parcial" },
                        { value: "PAGADO", label: "Pagadas" },
                     ] as { value: EstadoPago | ""; label: string }[]).map((op) => (
                        <Button
                           key={op.value || "todos"}
                           size="sm"
                           variant={estadoPago === op.value ? "default" : "outline"}
                           onClick={() => setEstadoPago(op.value)}
                        >
                           {op.label}
                        </Button>
                     ))}
                  </div>
               </div>
               {conFiltros && (
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => {
                        setBusqueda("");
                        setDesde("");
                        setHasta("");
                        setEstadoPago("");
                     }}
                  >
                     Limpiar
                  </Button>
               )}
            </div>

            {loading ? (
               <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
               </div>
            ) : filtradas.length === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <HardHat className="size-8 opacity-30" />
                  <p className="text-sm">Sin subcontrataciones para este equipo.</p>
               </div>
            ) : (
               <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="bg-brand-blue">
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Ref.</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Subcontratista</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha deuda</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Pago</th>
                        </tr>
                     </thead>
                     <tbody>
                        {filtradas.map((s) => (
                           <tr
                              key={s.id}
                              onClick={() => router.push(`/dashboard/subcontrataciones/${s.id}`)}
                              className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-blue/5"
                           >
                              <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-brand-blue">
                                 {s.codigoReferencia}
                              </td>
                              <td className="px-4 py-3">{s.proveedor_nombre ?? "—"}</td>
                              <td className="max-w-[260px] px-4 py-3">
                                 <div className="truncate">{s.trabajo_descripcion ?? "—"}</div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fecha(s.fecha_deuda)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">{money(s.monto_total)}</td>
                              <td
                                 className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                                    s.pendiente > 0 ? "text-destructive" : "text-muted-foreground"
                                 }`}
                              >
                                 {money(s.pendiente)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                 <Badge className={`border-0 text-[10px] ${ESTADO_TRABAJO_STYLE[s.estado_trabajo]}`}>
                                    {ESTADO_TRABAJO_LABEL[s.estado_trabajo]}
                                 </Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                 <Badge className={`border-0 text-[10px] ${ESTADO_PAGO_STYLE[s.estado_pago]}`}>
                                    {s.estado_pago}
                                 </Badge>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </CardContent>
      </Card>
   );
}
