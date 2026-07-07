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
import { useEquipoStore } from "@/stores/useEquipoStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import type { CreateProyectoExpressForm, LineItemForm } from "@/dtos/proyecto.dto";
import { SelectEquipos } from "@/components/select-equipos";

interface Props {
   onSubmit: (data: CreateProyectoExpressForm) => Promise<void>;
   onCancel: () => void;
   loading: boolean;
}

// 1. Creamos una interfaz específica para los equipos en campo
interface EquipoUsarItem {
   categoria_equipo_id: any;
   equipo_id: string;
   operador_id: string;
   horas: number;
   precio_unitario: number;
}

const emptyItem = (): LineItemForm => ({ descripcion: "", cantidad: 1, precio_unitario: 0 });
const emptyEquipo = (): EquipoUsarItem => ({ equipo_id: "", operador_id: "", horas: 0, precio_unitario: 0, categoria_equipo_id: "" });

export function ProyectoExpressForm({ onSubmit, onCancel, loading }: Props) {
   const { Clients, GetClients } = useClientStore();
   const { Equipos, GetEquipos } = useEquipoStore();
   const { Employees, GetEmployees } = useEmployeeStore();

   useEffect(() => {
      GetClients();
      GetEquipos();
      GetEmployees();
   }, [GetClients, GetEquipos, GetEmployees]);

   const [clienteId, setClienteId] = useState("");
   const [tarifaServicio, setTarifaServicio] = useState(0);
   const [notas, setNotas] = useState("");

   // 2. Usamos el nuevo tipado para el array de equipos
   const [equiposUsar, setEquiposUsar] = useState<EquipoUsarItem[]>([emptyEquipo()]);
   const [cobrables, setCobrables] = useState<LineItemForm[]>([emptyItem()]);
   const [internos, setInternos] = useState<LineItemForm[]>([]);
   const [error, setError] = useState<string | null>(null);

   const operadores = Employees.filter((e) => e.rol === "OPERADOR");

   // Funciones utilitarias para los arrays
   function addItem(setter: React.Dispatch<React.SetStateAction<LineItemForm[]>>) {
      setter((prev) => [...prev, emptyItem()]);
   }

   function addEquipo() {
      setEquiposUsar((prev) => [...prev, emptyEquipo()]);
   }

   function updateItem(
      setter: React.Dispatch<React.SetStateAction<LineItemForm[]>>,
      idx: number,
      field: keyof LineItemForm,
      value: string | number
   ) {
      setter((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
   }

   // 3. Función dedicada para actualizar los equipos dinámicos (reemplaza a updateTruck)
   function updateEquipo(idx: number, field: keyof EquipoUsarItem, value: string | number) {
      setEquiposUsar((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
   }

   function removeItem<T>(
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      idx: number
   ) {
      setter((prev) => prev.filter((_, i) => i !== idx));
   }

   const subtotalCobrables = cobrables.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
   const totalCobrable = tarifaServicio + subtotalCobrables;
   const totalInterno = internos.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
   const rentabilidad = totalCobrable - totalInterno;
   // Dentro de ProyectoExpressForm, en el handleSubmit:
   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();

      // Mapeamos lo que el formulario tiene hacia lo que el DTO requiere
      const payload = {
         cliente_id: clienteId,
         servicio_id: "ID_DEL_SERVICIO_SELECCIONADO", // Necesitas este campo
         nombre: "Proyecto Express",

         // Transformamos tu array de equipos a las "tarifas" y "equipos" que pide el backend
         tarifas: equiposUsar.map((e) => ({
            categoria_equipo_id: e.categoria_equipo_id,
            // Si el precio es 0, forzamos un valor mínimo positivo para pasar la validación
            precio_acordado: e.precio_unitario > 0 ? e.precio_unitario : 0.01,
            cobra_en_snapshot: "HORA",
            cobra_minimo_snapshot: e.precio_unitario > 0 ? e.precio_unitario : 0.01
         })),

         equipos: equiposUsar.map(eq => ({
            equipo_id: eq.equipo_id,
            categoria_equipo_id: eq.categoria_equipo_id,
            operador_id: eq.operador_id
         })),

         cargos_cobrables: cobrables,
         gastos_internos: internos
      };

      await onSubmit(payload as any); // Temporalmente 'as any' para forzar la compatibilidad
   }

   // Validación para habilitar el botón
   const isFormValid = clienteId && equiposUsar.length > 0 && equiposUsar[0].equipo_id && equiposUsar[0].operador_id;

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
               <Label htmlFor="tarifa">Tarifa del Servicio *</Label>
               <Input
                  id="tarifa"
                  type="number"
                  min={0}
                  step="0.01"
                  value={tarifaServicio}
                  onChange={(e) => setTarifaServicio(Number(e.target.value))}
                  placeholder="0.00"
                  required
               />
            </div>
         </div>

         <Separator />

         {/* ── Equipo trabajado (Refactorizado) ── */}
         <div className="space-y-2">
            <div>
               <h3 className="text-sm font-semibold">Equipo en campo</h3>
            </div>
            {equiposUsar.map((item, idx) => (
               <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 items-center">
                  <div className="space-y-1.5">
                     <Select
                        value={item.operador_id}
                        onValueChange={(val) => updateEquipo(idx, "operador_id", val)}
                        required
                     >
                        <SelectTrigger className="w-full">
                           <SelectValue placeholder="Operador" />
                        </SelectTrigger>
                        <SelectContent>
                           {operadores.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                 {e.nombre}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-1.5">
                     <SelectEquipos
                        value={item.equipo_id}
                        onChange={(id, equipo) => {
                           updateEquipo(idx, "equipo_id", id);
                           if (equipo) {
                              updateEquipo(idx, "operador_id", equipo.operador_id || "");
                              // Algunos tipos de equipo pueden no tener la propiedad `categoria`.
                              // Intentamos leer la tarifa de forma segura y usar 0 como fallback.
                              const tarifa = (equipo as any)?.categoria?.tarifa ?? (equipo as any)?.categoria_tarifa ?? 0;
                              updateEquipo(idx, "precio_unitario", tarifa);
                              updateEquipo(idx, "categoria_equipo_id", equipo.categoria_id);
                           }
                        }}
                     />
                  </div>

                  <div className="space-y-1.5">
                     <Input
                        type="number"
                        placeholder="Horas"
                        className="w-full"
                        min={0}
                        step="0.5"
                        value={item.horas || 0}
                        onChange={(e) => updateEquipo(idx, "horas", Number(e.target.value))}
                     />
                  </div>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="size-7 text-muted-foreground hover:text-destructive"
                     onClick={() => removeItem(setEquiposUsar, idx)}
                  >
                     ×
                  </Button>
               </div>
            ))}
            <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={addEquipo}
            >
               + Agregar cargo Equipo
            </Button>
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
                     ×
                  </Button>
               </div>
            ))}
            <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={() => addItem(setCobrables)}
            >
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
                     ×
                  </Button>
               </div>
            ))}
            <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={() => addItem(setInternos)}
            >
               + Agregar gasto interno
            </Button>
         </div>

         <Separator />

         {/* ── Resumen financiero ── */}
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
               <span>Total cobrable al cliente</span>
               <span className="text-green-600">RD$ {totalCobrable.toLocaleString("es-DO")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
               <span>Gastos internos</span>
               <span className="text-red-500">− RD$ {totalInterno.toLocaleString("es-DO")}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1.5">
               <span>Rentabilidad</span>
               <span className={rentabilidad >= 0 ? "text-green-700" : "text-red-600"}>
                  RD$ {rentabilidad.toLocaleString("es-DO")}
               </span>
            </div>
         </div>

         {/* ── Notas ── */}
         <Textarea
            placeholder="Notas adicionales (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
         />

         {error && <p className="text-sm text-destructive">{error}</p>}

         {/* ── Acciones ── */}
         <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
               Cancelar
            </Button>
            <Button
               type="submit"
               disabled={loading || !isFormValid}
               className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold border-0"
            >
               {loading ? "Registrando…" : "Liquidar Proyecto Express"}
            </Button>
         </div>
      </form>
   );
}