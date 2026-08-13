"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useClientStore } from "@/stores/useClientStore";
import type { CreateProyectoForm } from "@/dtos/proyecto.dto";
import { fechaRD } from "@/lib/utils";

interface Props {
   initialData?: Partial<CreateProyectoForm>; // Permite pasar datos iniciales al formulario
   onSubmit: (data: CreateProyectoForm) => Promise<void>;
   onCancel: () => void;
   loading: boolean;
}

// NOTA 1: la sección "Equipo en campo" que existía aquí se eliminó. El equipo,
// operador y precio ya no se registran al crear el proyecto — se agregan
// después, uno por uno, como Conduces desde la página de detalle del
// proyecto (ver components/conduce-form.tsx).
// NOTA 2: la sección de Cargos Cobrables / Gastos Internos también se eliminó.
// Esos ítems se registran como Gastos desde los tabs Cobrables/Incobrables del
// detalle del proyecto (antes generaban doble conteo con la tabla gasto).
export function ProyectoForm({ initialData, onSubmit, onCancel, loading }: Props) {
   const { Clients, GetClients } = useClientStore();

   useEffect(() => {
      GetClients();
   }, [GetClients]);

   useEffect(() => {
      if (initialData) {
         setClienteId(initialData.cliente_id || "");
         setNombreProyecto(initialData.nombre || "");
         setTarifaServicio(initialData.tarifa_servicio || 0);
         setNotas(initialData.notas || "");
      }
   }, [initialData]);

   const [clienteId, setClienteId] = useState(initialData?.cliente_id || "");
   const [nombreProyecto, setNombreProyecto] = useState(initialData?.nombre || "");
   const [tarifaServicio, setTarifaServicio] = useState(0);
   const [notas, setNotas] = useState("");
   const [error, setError] = useState<string | null>(null);

   const handleClickCompleteNombreProyecto = () => {
      setNombreProyecto(`Proyecto a ${Clients.find((c) => c.id === clienteId)?.nombre ?? "cliente"} ${fechaRD("day")}/${fechaRD("month")}/${fechaRD("year")}`);
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!clienteId) {
         setError("El cliente es requerido");
         return;
      }
      if (!nombreProyecto.trim()) {
         setError("El nombre del proyecto es requerido");
         return;
      }
      if (tarifaServicio < 0) {
         setError("La tarifa del servicio debe ser mayor o igual a 0");
         return;
      }

      setError(null);

      const payload: CreateProyectoForm = {
         cliente_id: clienteId,
         nombre: nombreProyecto,
         tarifa_servicio: tarifaServicio,
         notas: notas || null,
      };

      await onSubmit(payload);
   }

   const isFormValid = Boolean(clienteId && nombreProyecto.trim());

   return (
      <form onSubmit={handleSubmit} className="space-y-5 ">
         {/* ── Cliente + Tarifa ── */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
               <Label htmlFor="cliente">Cliente *</Label>
               <Select value={clienteId} onValueChange={setClienteId} required>
                  <SelectTrigger id="cliente">
                     <SelectValue placeholder="Seleccionar cliente…" />
                  </SelectTrigger>
                  <SelectContent>
                     {Clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                           {c.nombre}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>

            <div className="space-y-1.5">
               <Label htmlFor="tarifa-servicio">Tarifa del Servicio</Label>
               <Input
                  id="tarifa-servicio"
                  type="number"
                  min={0}
                  step="0.01"
                  value={tarifaServicio}
                  onChange={(e) => setTarifaServicio(Number(e.target.value))}
                  placeholder="0.00"
               />
            </div>
         </div>

         <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
               <Label htmlFor="nombre-proyecto">Nombre del Proyecto *</Label>
               <button
                  type="button"
                  className="text-sm text-blue-500 hover:underline"
                  onClick={handleClickCompleteNombreProyecto}
               >
                  Autocompletar nombre del proyecto
               </button>
            </div>
            <Input
               id="nombre-proyecto"
               type="text"
               value={nombreProyecto}
               onChange={(e) => setNombreProyecto(e.target.value)}
               placeholder={`Proyecto a ${Clients.find((c) => c.id === clienteId)?.nombre ?? "cliente"} ${fechaRD("day")}/${fechaRD("month")}/${fechaRD("year")}`}
               required
            />
         </div>

         <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            El equipo utilizado se registra después, uno por uno, como <strong>Conduces</strong> desde
            la página de detalle de este proyecto.
         </div>

         <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Los <strong>gastos</strong> (cobrables e incobrables) se registran después desde los tabs
            <strong> Cobrables</strong> y <strong>Incobrables</strong> del detalle de este proyecto.
         </div>

         <Separator />

         {/* ── Resumen financiero (parcial — conduces y gastos se agregan después) ── */}
         <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
               <span className="text-muted-foreground">Tarifa del servicio</span>
               <span>RD$ {tarifaServicio.toLocaleString("es-DO")}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1.5">
               <span>Total cobrable (parcial)</span>
               <span className="text-green-600">RD$ {tarifaServicio.toLocaleString("es-DO")}</span>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-1.5">
               Los conduces y gastos se sumarán automáticamente al total del proyecto
               conforme se registren en el detalle.
            </p>
         </div>

         <Textarea
            placeholder="Notas adicionales (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
         />

         {error && <p className="text-sm text-destructive">{error}</p>}

         <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
               Cancelar
            </Button>
            <Button
               type="submit"
               disabled={loading || !isFormValid}
               className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold border-0"
            >
               {loading ? "Registrando…" : "Registrar Proyecto"}
            </Button>
         </div>
      </form>
   );
}