"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { StatBox } from "./StatBox";
import { formatMoney } from "./formatMoney";

export function GeneralTab({ proyecto }: { proyecto: Proyecto }) {
   return (
      <div className="space-y-6">
         <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatBox label="Tarifa del servicio" value={formatMoney(proyecto.tarifa_servicio)} />
            <StatBox label="Total cobrable" value={formatMoney(proyecto.total_cobrable)} accent="text-green-600" />
            <StatBox label="Gastos internos" value={formatMoney(proyecto.total_gasto_interno)} accent="text-red-500" />
            <StatBox
               label="Rentabilidad"
               value={formatMoney(proyecto.rentabilidad)}
               accent={proyecto.rentabilidad >= 0 ? "text-green-700" : "text-red-600"}
            />
         </div>

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
