"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarSearch } from "lucide-react";
import { useConduceStore } from "@/stores/useConduceStores";
import { ConduceTable } from "../../../conduces/components/conduce-table";

interface Props {
   /** Cuál campo de ConduceFiltros se usa para acotar la lista a esta entidad. */
   filtroKey: "empleado_id" | "equipo_id";
   filtroValue: string;
   ocultarProyecto?: boolean;
}

/**
 * Resumen (viajes/horas/producción) + tabla de conduces acotados a una
 * entidad (un empleado/operador o un equipo), con filtro de rango de
 * fechas. EmployeeConduces y EquipoConduces son wrappers delgados de este
 * componente — así el filtro "por equipo" queda igual al "por empleado" sin
 * duplicar la tabla dos veces.
 */
export function ConduceEntityConduces({ filtroKey, filtroValue, ocultarProyecto = false }: Props) {
   const { conduces, loading, GetConduces } = useConduceStore();

   // Antes esto arrancaba con fechaDesde = fechaHasta = "hoy", así que salvo
   // que hubiera conduces registrados justo ese día, la vista se veía vacía
   // al entrar. Por defecto ahora no se filtra por fecha (se ve todo el
   // historial de la entidad) y el usuario acota el rango si lo necesita.
   const [fechaDesde, setFechaDesde] = useState<string>("");
   const [fechaHasta, setFechaHasta] = useState<string>("");

   useEffect(() => {
      GetConduces({
         [filtroKey]: filtroValue,
         fecha_desde: fechaDesde || undefined,
         fecha_hasta: fechaHasta || undefined,
         pageSize: 50,
      } as any);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [filtroKey, filtroValue, fechaDesde, fechaHasta]);

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
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Viajes / Botes </p>
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
            <div className="rounded-xl border">
               <ConduceTable conduces={conduces} ocultarProyecto={ocultarProyecto} />
            </div>
         )}
      </div>
   );
}