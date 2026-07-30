"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
} from "@/components/ui/accordion";
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
      <Accordion type="multiple" className="space-y-2">
         <AccordionItem value="servicio" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline">
               Tarifa del Servicio
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
               <p className="mb-3 text-sm text-muted-foreground">
                  Precio del servicio general para este proyecto (opcional).
               </p>
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
            </AccordionContent>
         </AccordionItem>

         <AccordionItem value="categorias" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline">
               Tarifas por Categoría de Equipo
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
               <p className="mb-3 text-sm text-muted-foreground">
                  Precios negociados para este proyecto que sobreescriben las tarifas globales
                  (ej. botes, viajes de camiones, horas de equipo pesado).
               </p>
               <ProyectoTarifasCard proyectoId={proyectoId} />
            </AccordionContent>
         </AccordionItem>

         <AccordionItem value="operadores" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline">
               Pago a Operadores por este Proyecto
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
               <p className="mb-3 text-sm text-muted-foreground">
                  Sobreescribe lo que gana cada operador para una tarifa específica dentro de este
                  proyecto. Si no se configura, se usa la tarifa global del empleado.
               </p>
               <ProyectoEmpleadoTarifasCard proyectoId={proyectoId} />
            </AccordionContent>
         </AccordionItem>
      </Accordion>
   );
}
