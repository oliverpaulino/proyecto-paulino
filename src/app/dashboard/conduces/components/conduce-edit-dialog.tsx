"use client";

import { useEffect, useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useConduceStore } from "@/stores/useConduceStores";
import { SelectBuscadorClient } from "@/components/shared/selectBuscadorClient";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";
import type { ConduceDTO } from "@/dtos/conduce.dto";

interface Props {
   conduce: ConduceDTO | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   /** Se dispara tras guardar con éxito (para refrescar listas/totales). */
   onSaved?: () => void;
}

/**
 * Edición de un conduce. Cliente y proyecto SÍ se pueden cambiar aquí (usan
 * los mismos buscadores que la barra de filtros). Equipo y tipo de conduce
 * se dejan fuera a propósito — cambiar el equipo afecta la categoría/tarifa
 * snapshoteada y conviene manejarlo aparte si algún día se necesita (el
 * backend, conduce.infraestructure.ts update(), ya soporta cambiar
 * equipo_id y recalcula categoria_equipo_id solo, por si luego lo agregas).
 */
export function ConduceEditDialog({ conduce, open, onOpenChange, onSaved }: Props) {
   const { UpdateConduce } = useConduceStore();
   const [guardando, setGuardando] = useState(false);
   const [error, setError] = useState<string | null>(null);

   // Cliente / Proyecto
   const [clienteId, setClienteId] = useState("");
   const [clienteNombreInicial, setClienteNombreInicial] = useState("");
   const [proyectoId, setProyectoId] = useState<string | undefined>(undefined);
   const [proyectoNombreInicial, setProyectoNombreInicial] = useState("");

   // Campos comunes
   const [numeroReferencia, setNumeroReferencia] = useState("");
   const [fecha, setFecha] = useState("");
   const [clienteTelefono, setClienteTelefono] = useState("");
   const [observaciones, setObservaciones] = useState("");
   const [precioUnitario, setPrecioUnitario] = useState(0);
   const [esCobrable, setEsCobrable] = useState(true);

   // CAMION
   const [procedencia, setProcedencia] = useState("");
   const [destino, setDestino] = useState("");
   const [cantidad, setCantidad] = useState(0);

   // EQUIPO_PESADO
   const [horarioMananaInicio, setHorarioMananaInicio] = useState("");
   const [horarioMananaFin, setHorarioMananaFin] = useState("");
   const [horarioTardeInicio, setHorarioTardeInicio] = useState("");
   const [horarioTardeFin, setHorarioTardeFin] = useState("");
   const [totalHoras, setTotalHoras] = useState(0);
   const [combustiblePagadoCliente, setCombustiblePagadoCliente] = useState(false);

   useEffect(() => {
      if (!conduce) return;
      setError(null);

      setClienteId(conduce.cliente_id);
      setClienteNombreInicial(conduce.cliente_nombre ?? "");
      setProyectoId(conduce.proyecto_id ?? undefined);
      setProyectoNombreInicial(conduce.proyecto_nombre ?? "");

      setNumeroReferencia(conduce.numero_referencia);
      setFecha(new Date(conduce.fecha).toISOString().slice(0, 10));
      setClienteTelefono(conduce.cliente_telefono ?? "");
      setObservaciones(conduce.observaciones ?? "");
      setPrecioUnitario(conduce.precio_unitario);
      setEsCobrable(conduce.es_cobrable);

      if (conduce.tipo_conduce === "CAMION") {
         setProcedencia(conduce.procedencia);
         setDestino(conduce.destino);
         setCantidad(conduce.cantidad);
      } else {
         setHorarioMananaInicio(conduce.horario_manana_inicio ?? "");
         setHorarioMananaFin(conduce.horario_manana_fin ?? "");
         setHorarioTardeInicio(conduce.horario_tarde_inicio ?? "");
         setHorarioTardeFin(conduce.horario_tarde_fin ?? "");
         setTotalHoras(conduce.total_horas);
         setCombustiblePagadoCliente(conduce.combustible_pagado_cliente);
      }
   }, [conduce]);

   if (!conduce) return null;

   const handleGuardar = async () => {
      setError(null);

      if (!clienteId) return setError("El cliente es requerido");
      if (!numeroReferencia.trim()) return setError("El número de referencia es requerido");
      if (!fecha) return setError("La fecha es requerida");
      if (precioUnitario < 0) return setError("El precio unitario debe ser mayor o igual a 0");
      if (conduce.tipo_conduce === "CAMION") {
         if (cantidad <= 0) return setError("Los metros/viajes deben ser mayor a 0");
      } else {
         if (totalHoras <= 0) return setError("El total de horas trabajadas debe ser mayor a 0");
      }

      setGuardando(true);
      try {
         const form: Record<string, unknown> = {
            cliente_id: clienteId,
            proyecto_id: proyectoId ?? null,
            numero_referencia: numeroReferencia.trim(),
            fecha,
            cliente_telefono: clienteTelefono.trim() || null,
            observaciones: observaciones.trim() || null,
            precio_unitario: precioUnitario,
            es_cobrable: esCobrable,
         };

         if (conduce.tipo_conduce === "CAMION") {
            form.procedencia = procedencia.trim();
            form.destino = destino.trim();
            form.cantidad = cantidad;
         } else {
            form.horario_manana_inicio = horarioMananaInicio || null;
            form.horario_manana_fin = horarioMananaFin || null;
            form.horario_tarde_inicio = horarioTardeInicio || null;
            form.horario_tarde_fin = horarioTardeFin || null;
            form.total_horas = totalHoras;
            form.combustible_pagado_cliente = combustiblePagadoCliente;
         }

         // Se pasa el proyecto ORIGINAL (antes de este cambio) para que el
         // backend recalcule los totales tanto del proyecto anterior como
         // del nuevo si el conduce se reasignó.
         const result = await UpdateConduce(conduce.id, form as any, conduce.proyecto_id ?? null);
          if (result instanceof Error) {
             setError(result.message);
             return;
          }
          onOpenChange(false);
          onSaved?.();
       } finally {
         setGuardando(false);
      }
   };

   return (
      <Dialog open={open} onOpenChange={(v) => !guardando && onOpenChange(v)}>
         <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>Editar conduce {conduce.numero_referencia}</DialogTitle>
               <DialogDescription>
                  Equipo y tipo de conduce no se editan aquí.
               </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-2">
               <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                  <SelectBuscadorClient
                     value={clienteId}
                     initialLabel={clienteNombreInicial}
                     placeholder="Selecciona un cliente..."
                     onChange={(id) => {
                        setClienteId(id ?? "");
                        // Si cambia el cliente, se desvincula el proyecto por
                        // coherencia (un proyecto pertenece a un cliente específico).
                        setProyectoId(undefined);
                        setProyectoNombreInicial("");
                     }}
                  />
               </div>

               <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
                  <SelectBuscadorProyecto
                     value={proyectoId}
                     initialLabel={proyectoNombreInicial}
                     clienteId={clienteId}
                     placeholder="Sin asignar..."
                     onChange={(id) => setProyectoId(id || undefined)}
                  />
               </div>

               <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Número de referencia</label>
                  <Input value={numeroReferencia} onChange={(e) => setNumeroReferencia(e.target.value)} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
               </div>

               <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Teléfono cliente</label>
                  <Input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} />
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Precio unitario</label>
                  <Input
                     type="number"
                     min={0}
                     step="0.01"
                     value={precioUnitario}
                     onChange={(e) => setPrecioUnitario(Number(e.target.value))}
                  />
               </div>

               {conduce.tipo_conduce === "CAMION" ? (
                  <>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Procedencia</label>
                        <Input value={procedencia} onChange={(e) => setProcedencia(e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Destino</label>
                        <Input value={destino} onChange={(e) => setDestino(e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                        <Input
                           type="number"
                           min={0}
                           step="0.01"
                           value={cantidad}
                           onChange={(e) => setCantidad(Number(e.target.value))}
                        />
                     </div>
                  </>
               ) : (
                  <>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">AM inicio</label>
                        <Input type="time" value={horarioMananaInicio} onChange={(e) => setHorarioMananaInicio(e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">AM fin</label>
                        <Input type="time" value={horarioMananaFin} onChange={(e) => setHorarioMananaFin(e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">PM inicio</label>
                        <Input type="time" value={horarioTardeInicio} onChange={(e) => setHorarioTardeInicio(e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">PM fin</label>
                        <Input type="time" value={horarioTardeFin} onChange={(e) => setHorarioTardeFin(e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Total horas</label>
                        <Input
                           type="number"
                           min={0}
                           step="0.01"
                           value={totalHoras}
                           onChange={(e) => setTotalHoras(Number(e.target.value))}
                        />
                     </div>
                     <div className="flex items-end gap-2 pb-1.5">
                        <input
                           id="combustible_pagado_cliente"
                           type="checkbox"
                           checked={combustiblePagadoCliente}
                           onChange={(e) => setCombustiblePagadoCliente(e.target.checked)}
                           className="size-4"
                        />
                        <label htmlFor="combustible_pagado_cliente" className="text-xs font-medium text-muted-foreground">
                           Combustible pagado por cliente
                        </label>
                     </div>
                  </>
               )}

               <div className="col-span-2 flex items-center gap-2">
                  <input
                     id="es_cobrable"
                     type="checkbox"
                     checked={esCobrable}
                     onChange={(e) => setEsCobrable(e.target.checked)}
                     className="size-4"
                  />
                  <label htmlFor="es_cobrable" className="text-xs font-medium text-muted-foreground">
                     Es cobrable
                  </label>
               </div>

               <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Observaciones</label>
                  <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="min-h-16" />
               </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
               <Button type="button" variant="ghost" disabled={guardando} onClick={() => onOpenChange(false)}>
                  Cancelar
               </Button>
               <Button type="button" disabled={guardando} onClick={handleGuardar}>
                  {guardando ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                  Guardar cambios
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}