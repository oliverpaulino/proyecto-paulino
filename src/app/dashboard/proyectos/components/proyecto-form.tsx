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
import type { CreateProyectoExpressForm, LineItemForm } from "@/dtos/proyecto.dto";
import { X } from "lucide-react";
import { fechaRD } from "@/lib/utils";

interface Props {
   onSubmit: (data: CreateProyectoExpressForm) => Promise<void>;
   onCancel: () => void;
   loading: boolean;
}

const emptyItem = (): LineItemForm => ({ descripcion: "", cantidad: 1, precio_unitario: 0 });

// NOTA: la sección "Equipo en campo" que existía aquí se eliminó. El equipo,
// operador y precio ya no se registran al crear el proyecto — se agregan
// después, uno por uno, como Conduces desde la página de detalle del
// proyecto (ver components/conduce-form.tsx).
export function ProyectoForm({ onSubmit, onCancel, loading }: Props) {
   const { Clients, GetClients } = useClientStore();

   useEffect(() => {
      GetClients();
   }, [GetClients]);

   const [clienteId, setClienteId] = useState("");
   const [nombreProyecto, setNombreProyecto] = useState("");
   const [tarifaServicio, setTarifaServicio] = useState(0);
   const [notas, setNotas] = useState("");

   const [cobrables, setCobrables] = useState<LineItemForm[]>([]);
   const [internos, setInternos] = useState<LineItemForm[]>([]);
   const [error, setError] = useState<string | null>(null);

   function addItem(setter: React.Dispatch<React.SetStateAction<LineItemForm[]>>) {
      setter((prev) => [...prev, emptyItem()]);
   }

   function updateItem(
      setter: React.Dispatch<React.SetStateAction<LineItemForm[]>>,
      idx: number,
      field: keyof LineItemForm,
      value: string | number
   ) {
      setter((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
   }

   function removeItem<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number) {
      setter((prev) => prev.filter((_, i) => i !== idx));
   }

   const handleClickCompleteNombreProyecto = () => {
      setNombreProyecto(`Proyecto a ${Clients.find((c) => c.id === clienteId)?.nombre ?? "cliente"} ${fechaRD("day")}/${fechaRD("month")}/${fechaRD("year")}`);
   }

   const subtotalCobrables = cobrables.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
   const totalCobrable = tarifaServicio + subtotalCobrables;
   const totalInterno = internos.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
   const rentabilidad = totalCobrable - totalInterno;

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
      if (cobrables.some((c) => c.cantidad <= 0 || c.precio_unitario < 0)) {
         setError("Los cargos cobrables deben tener cantidad > 0 y precio unitario >= 0");
         return;
      }
      if (internos.some((i) => i.cantidad <= 0 || i.precio_unitario < 0)) {
         setError("Los gastos internos deben tener cantidad > 0 y precio unitario >= 0");
         return;
      }

      setError(null);

      const payload: CreateProyectoExpressForm = {
         cliente_id: clienteId,
         servicio_id: null,
         nombre: nombreProyecto,
         tarifa_servicio: tarifaServicio,
         cargos_cobrables: cobrables,
         gastos_internos: internos,
         notas: notas || null,
      };

      await onSubmit(payload);
   }

   const isFormValid = Boolean(clienteId && nombreProyecto.trim());

   return (
      <form onSubmit={handleSubmit} className="space-y-5">
         {/* ── Cliente + Tarifa ── */}
         <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-center justify-between">
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

         <Separator />

         {/* ── Cargos Cobrables ── */}
         <div className="space-y-2">
            <div>
               <h3 className="text-sm font-semibold">Cargos Cobrables</h3>
               <p className="text-xs text-muted-foreground">
                  Se incluyen en la factura del cliente (<code>es_cobrable = true</code>)
               </p>
            </div>
            {cobrables.map((item, idx) => (
               <div key={idx} className="grid grid-cols-[1fr_72px_100px_28px] gap-2 items-center">
                  <Input
                     placeholder="Descripción"
                     value={item.descripcion}
                     onChange={(e) => updateItem(setCobrables, idx, "descripcion", e.target.value)}
                  />
                  <Input
                     type="number"
                     min={0}
                     step="1"
                     placeholder="Cant."
                     value={item.cantidad || 1}
                     onChange={(e) => updateItem(setCobrables, idx, "cantidad", Number(e.target.value))}
                  />
                  <Input
                     type="number"
                     min={0}
                     step="0.01"
                     placeholder="P. Unit."
                     value={item.precio_unitario || 0}
                     onChange={(e) => updateItem(setCobrables, idx, "precio_unitario", Number(e.target.value))}
                  />
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="size-7 text-muted-foreground hover:text-destructive"
                     onClick={() => removeItem(setCobrables, idx)}
                  >
                     <X className="h-4 w-4" />
                  </Button>
               </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addItem(setCobrables)}>
               + Agregar cargo cobrable
            </Button>
         </div>

         <Separator />

         {/* ── Gastos Internos No Cobrables ── */}
         <div className="space-y-2">
            <div>
               <h3 className="text-sm font-semibold">Gastos Internos No Cobrables</h3>
               <p className="text-xs text-muted-foreground">
                  Solo afectan la rentabilidad interna (<code>es_cobrable = false</code>)
               </p>
            </div>
            {internos.map((item, idx) => (
               <div key={idx} className="grid grid-cols-[1fr_72px_100px_28px] gap-2 items-center">
                  <Input
                     placeholder="Ej. combustible, peajes"
                     value={item.descripcion}
                     onChange={(e) => updateItem(setInternos, idx, "descripcion", e.target.value)}
                  />
                  <Input
                     type="number"
                     min={0}
                     step="1"
                     placeholder="Cant."
                     value={item.cantidad || 1}
                     onChange={(e) => updateItem(setInternos, idx, "cantidad", Number(e.target.value))}
                  />
                  <Input
                     type="number"
                     min={0}
                     step="0.01"
                     placeholder="P. Unit."
                     value={item.precio_unitario || 0}
                     onChange={(e) => updateItem(setInternos, idx, "precio_unitario", Number(e.target.value))}
                  />
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="size-7 text-muted-foreground hover:text-destructive"
                     onClick={() => removeItem(setInternos, idx)}
                  >
                     <X className="h-4 w-4" />
                  </Button>
               </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addItem(setInternos)}>
               + Agregar gasto interno
            </Button>
         </div>

         <Separator />

         {/* ── Resumen financiero (estimado — no incluye equipos, se agregan después) ── */}
         <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
               <span className="text-muted-foreground">Tarifa del servicio</span>
               <span>RD$ {tarifaServicio.toLocaleString("es-DO")}</span>
            </div>
            <div className="flex justify-between">
               <span className="text-muted-foreground">Cargos cobrables</span>
               <span>RD$ {subtotalCobrables.toLocaleString("es-DO")}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1.5">
               <span>Total cobrable (sin equipos aún)</span>
               <span className="text-green-600">RD$ {totalCobrable.toLocaleString("es-DO")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
               <span>Gastos internos</span>
               <span className="text-red-500">− RD$ {totalInterno.toLocaleString("es-DO")}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1.5">
               <span>Rentabilidad estimada</span>
               <span className={rentabilidad >= 0 ? "text-green-700" : "text-red-600"}>
                  RD$ {rentabilidad.toLocaleString("es-DO")}
               </span>
            </div>
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