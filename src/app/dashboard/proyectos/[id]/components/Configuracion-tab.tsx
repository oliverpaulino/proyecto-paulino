"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
} from "@/components/ui/accordion";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { EstadoProyectoArray, UpdateProyectoForm, type EstadoProyecto } from "@/dtos/proyecto.dto";
import { ProyectoTarifasCard } from "./proyecto-tarifa-card";
import { ProyectoEmpleadoTarifasCard } from "./proyecto-empleado-tarifa-card";
import { SelectBuscadorClient } from "@/components/shared/selectBuscadorClient";

function toDateInputValue(d: string | null | undefined): string {
   if (!d) return "";
   const date = new Date(d);
   if (isNaN(date.getTime())) return "";
   // La columna es DATE (sin hora): se guarda como medianoche UTC. Se formatea
   // en UTC para no retroceder un día según la zona horaria local (RD es UTC-4).
   const y = date.getUTCFullYear();
   const m = String(date.getUTCMonth() + 1).padStart(2, "0");
   const day = String(date.getUTCDate()).padStart(2, "0");
   return `${y}-${m}-${day}`;
}

export default function ConfiguracionTab({ proyectoId, onProyectoChange }: { proyectoId: string; onProyectoChange?: () => Promise<void> | void }) {
   const { proyecto, GetProyectoById, UpdateProyecto } = useProyectoStore();

   const [nombre, setNombre] = useState("");
   const [clienteId, setClienteId] = useState("");
   const [tarifaServicio, setTarifaServicio] = useState(0);
   const [notas, setNotas] = useState("");
   const [fechaInicio, setFechaInicio] = useState("");
   const [fechaFin, setFechaFin] = useState("");
   const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoProyecto>("BORRADOR");

   const [guardando, setGuardando] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [exito, setExito] = useState(false);

   useEffect(() => {
      GetProyectoById(proyectoId);
   }, [GetProyectoById, proyectoId]);

   useEffect(() => {
      if (proyecto) {
         setNombre(proyecto.nombre);
         setClienteId(proyecto.cliente_id);
         setTarifaServicio(proyecto.tarifa_servicio ?? 0);
         setNotas(proyecto.notas ?? "");
         setFechaInicio(toDateInputValue(proyecto.fecha_inicio));
         setFechaFin(toDateInputValue(proyecto.fecha_fin));
         setEstadoSeleccionado(proyecto.estado);
      }
   }, [proyecto]);

   async function handleGuardarGeneral() {
      if (!clienteId) {
         setError("El cliente es requerido");
         return;
      }
      if (!nombre.trim()) {
         setError("El nombre del proyecto es requerido");
         return;
      }
      if (tarifaServicio < 0) {
         setError("La tarifa del servicio debe ser mayor o igual a 0");
         return;
      }

      setGuardando(true);
      setError(null);
      setExito(false);

      const payload: UpdateProyectoForm = {
         nombre: nombre.trim(),
         cliente_id: clienteId,
         tarifa_servicio: tarifaServicio,
         notas: notas || null,
         estado: estadoSeleccionado,
         fecha_inicio: fechaInicio || undefined,
         fecha_fin: fechaFin || null,
      };

      const result = await UpdateProyecto(proyectoId, payload);
      if (result instanceof Error) {
         setError(result.message);
      } else {
         await onProyectoChange?.();
         setExito(true);
      }
      setGuardando(false);
   }

   if (!proyecto) return <div>Cargando...</div>;

   return (
      <Accordion type="multiple" className="space-y-2">
         <AccordionItem value="general" className="rounded-lg border bg-card">
            <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline">
               Configuración General
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
               <p className="mb-3 text-sm text-muted-foreground">
                  Datos básicos del proyecto: cliente, nombre, tarifa, fechas, estado y notas.
               </p>
               <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                     <Label className="text-xs">Cliente *</Label>
                     <SelectBuscadorClient
                        value={clienteId}
                        onChange={(id) => setClienteId(id ?? "")}
                        initialLabel={proyecto.cliente_nombre ?? ""}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-xs">Nombre del Proyecto *</Label>
                     <Input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre del proyecto"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-xs">Tarifa del Servicio RD$</Label>
                     <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={tarifaServicio}
                        onChange={(e) => setTarifaServicio(Number(e.target.value))}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-xs">Estado</Label>
                     <Select
                        value={estadoSeleccionado}
                        onValueChange={(value) => setEstadoSeleccionado(value as EstadoProyecto)}
                     >
                        <SelectTrigger>
                           <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                        <SelectContent>
                           {EstadoProyectoArray.map((estado) => (
                              <SelectItem key={estado} value={estado}>
                                 {estado}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-xs">Fecha de inicio</Label>
                     <Input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-xs">Fecha de fin</Label>
                     <Input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                     />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                     <Label className="text-xs">Notas</Label>
                     <Textarea
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        rows={3}
                        placeholder="Notas adicionales (opcional)"
                     />
                  </div>
               </div>
               <div className="mt-4 flex items-center gap-3">
                  <Button
                     type="button"
                     onClick={handleGuardarGeneral}
                     disabled={guardando}
                     className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold border-0"
                  >
                     {guardando ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {exito && !error && <p className="text-sm text-green-600">Cambios guardados correctamente.</p>}
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
