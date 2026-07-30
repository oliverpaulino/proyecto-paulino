"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { ProyectoTarifasCard } from "./proyecto-tarifa-card";
import { ProyectoEmpleadoTarifasCard } from "./proyecto-empleado-tarifa-card";

export default function ConfiguracionTab({ proyectoId }: { proyectoId: string }) {
   const { proyecto, GetProyectoById } = useProyectoStore();

   const [tarifaServicio, setTarifaServicio] = useState(0);
   const [guardandoServicio, setGuardandoServicio] = useState(false);

   useEffect(() => {
      GetProyectoById(proyectoId);
   }, [GetProyectoById, proyectoId]);

   useEffect(() => {
      if (proyecto) {
         setTarifaServicio(proyecto.tarifa_servicio ?? 0);
      }
   }, [proyecto]);

   async function handleGuardarTarifaServicio() {
      setGuardandoServicio(true);
      try {
         const res = await fetch(`/api/proyectos/${proyectoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tarifa_servicio: tarifaServicio }),
         });
         if (!res.ok) throw new Error("Error al guardar");
         await GetProyectoById(proyectoId);
      } catch (e) {
         console.error(e);
      } finally {
         setGuardandoServicio(false);
      }
   }

   if (!proyecto) return <div>Cargando...</div>;

   return (
      <div className="space-y-6">
         {/* Tarifa del Servicio */}
         <Card>
            <CardHeader>
               <CardTitle>Tarifa del Servicio</CardTitle>
               <CardDescription>
                  Precio del servicio general para este proyecto (opcional).
               </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-end gap-3">
                  <div className="space-y-1.5 max-w-xs">
                     <Label className="text-xs">Tarifa de servicio RD$</Label>
                     <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={tarifaServicio}
                        onChange={(e) => setTarifaServicio(Number(e.target.value))}
                     />
                  </div>
                  <Button
                     type="button"
                     size="sm"
                     onClick={handleGuardarTarifaServicio}
                     disabled={guardandoServicio}
                  >
                     {guardandoServicio ? "Guardando..." : "Guardar"}
                  </Button>
               </div>
            </CardContent>
         </Card>

         <Separator />

         {/* Tarifas de Categorías de Equipo */}
         <Card>
            <CardHeader>
               <CardTitle>Tarifas por Categoría de Equipo</CardTitle>
               <CardDescription>
                  Precios negociados para este proyecto que sobreescriben las tarifas globales
                  (ej. botes, viajes de camiones, horas de equipo pesado).
               </CardDescription>
            </CardHeader>
            <CardContent>
               <ProyectoTarifasCard proyectoId={proyectoId} />
            </CardContent>
         </Card>

         <Separator />

         {/* Tarifas de Empleado por Proyecto */}
         <Card>
            <CardHeader>
               <CardTitle>Pago a Operadores por este Proyecto</CardTitle>
               <CardDescription>
                  Sobreescribe lo que gana cada operador para una tarifa específica dentro de este
                  proyecto. Si no se configura, se usa la tarifa global del empleado.
               </CardDescription>
            </CardHeader>
            <CardContent>
               <ProyectoEmpleadoTarifasCard proyectoId={proyectoId} />
            </CardContent>
         </Card>
      </div>
   );
}
