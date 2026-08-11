"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { StatBox } from "./StatBox";
import { FinanzasCharts } from "./FinanzasCharts";
import { formatMoney } from "./formatMoney";

export function GeneralTab({
   proyecto,
   locked,
   onProyectoChange,
}: {
   proyecto: Proyecto;
   locked: boolean;
   onProyectoChange?: () => void | Promise<void>;
}) {
   const { UpdateProyecto } = useProyectoStore();

   const [porcentaje, setPorcentaje] = useState(proyecto.porcentaje_avance ?? 0);
   const [avanceGuardando, setAvanceGuardando] = useState(false);
   const [avanceError, setAvanceError] = useState<string | null>(null);

   // Sincroniza el slider con el valor persistido (cuando cambia desde otro
   // tab o tras un guardado) sin pisar el arrastre en curso.
   useEffect(() => {
      setPorcentaje(proyecto.porcentaje_avance ?? 0);
   }, [proyecto.porcentaje_avance]);

   // Solo persiste al soltar el thumb (onValueCommit), no en cada movimiento:
   // un proyecto no se actualiza 100 veces mientras el usuario arrastra.
   async function handleAvanceCommit(values: number[]) {
      const nuevo = values[0];
      setPorcentaje(nuevo);
      if (nuevo === (proyecto.porcentaje_avance ?? 0) || locked) return;

      setAvanceGuardando(true);
      setAvanceError(null);
      try {
         const result = await UpdateProyecto(proyecto.id, { porcentaje_avance: nuevo });
         if (result instanceof Error) throw result;
         await onProyectoChange?.();
      } catch (err) {
         setAvanceError(err instanceof Error ? err.message : "No se pudo guardar el avance");
         setPorcentaje(proyecto.porcentaje_avance ?? 0);
      } finally {
         setAvanceGuardando(false);
      }
   }

   return (
      <div className="space-y-6">
         {/* Estadísticas */}
         <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatBox label="Tarifa del servicio" value={formatMoney(proyecto.tarifa_servicio)} />
            <StatBox label="Total cobrable" value={formatMoney(proyecto.total_cobrable)} accent="text-green-600" />
            <StatBox label="Gastos internos" value={formatMoney(proyecto.total_gasto_interno)} accent="text-red-500" />
            <StatBox
               label="Costo de operadores"
               value={formatMoney(proyecto.total_costo_operador ?? 0)}
               accent="text-orange-600"
            />
            <StatBox
               label="Rentabilidad"
               value={formatMoney(proyecto.rentabilidad)}
               accent={proyecto.rentabilidad >= 0 ? "text-green-700" : "text-red-600"}
            />
         </div>

         {/* Gráficas financieras interactivas */}
         <FinanzasCharts proyecto={proyecto} />

         {/* Avance de obra */}
         <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
               <div>
                  <CardTitle>Avance de obra</CardTitle>
                  <CardDescription>
                     Porcentaje de avance del proyecto. Se ajusta manualmente y se fuerza a 100% al
                     completar.
                  </CardDescription>
               </div>
               <span className="text-2xl font-bold text-brand-blue">{porcentaje}%</span>
            </CardHeader>
            <CardContent className="space-y-3">
               <Slider
                  value={[porcentaje]}
                  min={0}
                  max={100}
                  step={1}
                  disabled={locked || avanceGuardando}
                  onValueChange={(v) => setPorcentaje(v[0])}
                  onValueCommit={handleAvanceCommit}
                  aria-label="Porcentaje de avance"
               />
               <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>
                     {avanceGuardando && <Loader2 className="mr-1 inline size-3 animate-spin" />}
                     {avanceGuardando ? "Guardando..." : locked ? "Bloqueado: proyecto COMPLETADO" : "Arrastra para ajustar"}
                  </span>
                  <span>100%</span>
               </div>
               {avanceError && <p className="text-sm text-destructive">{avanceError}</p>}
            </CardContent>
         </Card>

         {proyecto.notas && (
            <Card>
               <CardHeader>
                  <CardTitle>Notas</CardTitle>
               </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground">{proyecto.notas}</p>
            </CardContent>
         </Card>
      )}
   </div>
   );
}
