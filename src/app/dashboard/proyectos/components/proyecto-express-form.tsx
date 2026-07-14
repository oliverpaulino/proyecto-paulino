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
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import type { CreateProyectoExpressForm, LineItemForm } from "@/dtos/proyecto.dto";
import { SelectBuscarEquipos } from "@/components/select-equipos";
import { Equipo } from "@/dtos/equipo.dto";
import { X } from "lucide-react";
import { SelectBuscadorOperator } from "@/components/select-operator";

interface Props {
   onSubmit: (data: CreateProyectoExpressForm) => Promise<void>;
   onCancel: () => void;
   loading: boolean;
}

export interface EquipoUsarItem {
   categoria_equipo_id: any;
   equipo_id: string;
   operador_id: string;   // = empleado_id (para que matchee el <Select> de operadores)
   cantidad: number;
   unidad_medida: string; // categoria.cobra_en
   precio_unitario: number; // categoria.precio_unitario — solo lectura
   cobro_minimo_snapshot: number; // snapshot de la categoría al momento de crear el proyecto
   es_cobrable: boolean;    // si se incluye en el cobro al cliente
}

const emptyEquipo = (): EquipoUsarItem => ({
   equipo_id: "",
   operador_id: "",
   cantidad: 0,
   unidad_medida: "",
   precio_unitario: 0,
   categoria_equipo_id: "",
   cobro_minimo_snapshot: 0,
   es_cobrable: true,
});

const emptyItem = (): LineItemForm => ({ descripcion: "", cantidad: 1, precio_unitario: 0 });

export function ProyectoExpressForm({ onSubmit, onCancel, loading }: Props) {
   const { Clients, GetClients } = useClientStore();
   const { Equipos, GetEquipos, GetOperadorByEquipoId } = useEquipoStore();
   const { Employees, GetEmployees } = useEmployeeStore();
   const { CategoriaEquipos, GetCategoriaEquipos } = useCategoriaEquipoStore();

   useEffect(() => {
      GetClients();
      GetEquipos();
      GetEmployees();
      GetCategoriaEquipos();
   }, [GetClients, GetEquipos, GetEmployees, GetCategoriaEquipos]);

   const [clienteId, setClienteId] = useState("");
   const [tarifaServicio, setTarifaServicio] = useState(0);
   const [notas, setNotas] = useState("");

   const [equiposUsar, setEquiposUsar] = useState<EquipoUsarItem[]>([]);
   const [cobrables, setCobrables] = useState<LineItemForm[]>([]);
   const [internos, setInternos] = useState<LineItemForm[]>([]);
   const [error, setError] = useState<string | null>(null);
   // idx que está resolviendo el operador (para mostrar loader puntual en esa fila)
   const [resolvingOperador, setResolvingOperador] = useState<number | null>(null);

   const operadores = Employees.filter((e) => e.rol === "OPERADOR");

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

   function updateEquipo(idx: number, field: keyof EquipoUsarItem, value: string | number | boolean) {
      setEquiposUsar((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
   }

   function updateEquipoFields(idx: number, fields: Partial<EquipoUsarItem>) {
      setEquiposUsar((prev) => prev.map((item, i) => (i === idx ? { ...item, ...fields } : item)));
   }

   function removeItem<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number) {
      setter((prev) => prev.filter((_, i) => i !== idx));
   }

   // ── Selección de equipo: autocompleta operador, categoría, unidad y precio ──
   async function handleSelectEquipo(idx: number, id: string | number | null, equipo: Equipo | null) {
      if (!equipo) {
         updateEquipoFields(idx, {
            equipo_id: "",
            operador_id: "",
            categoria_equipo_id: "",
            unidad_medida: "",
            precio_unitario: 0,
         });
         return;
      }


      const categoria = CategoriaEquipos.find((c) => c.id === equipo.categoria_id);

      // Precarga inmediata de lo que sí tenemos, sin esperar la llamada de red
      updateEquipoFields(idx, {
         equipo_id: String(id ?? ""),
         categoria_equipo_id: equipo.categoria_id,
         unidad_medida: categoria?.cobra_en ?? "",
         precio_unitario: categoria?.precio_unitario ?? 0,
         cantidad: categoria?.cobra_minimo ?? 0,
      });

      if (!equipo.operador_id) {
         updateEquipo(idx, "operador_id", "");
         return;
      }

      setResolvingOperador(idx);
      try {
         const operadorAsignable = await GetOperadorByEquipoId(equipo.id);
         // OperadorAsignable.id === empleado_id, matchea directo con el <Select> de operadores
         console.log(operadorAsignable, "hola");
         if (operadorAsignable && !(operadorAsignable instanceof Error)) {
            updateEquipo(idx, "operador_id", operadorAsignable.id);
         } else {
            updateEquipo(idx, "operador_id", "");
         }
      } catch {
         updateEquipo(idx, "operador_id", "");
      } finally {
         setResolvingOperador(null);
      }
   }

   const subtotalCobrables = cobrables.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
   const subtotalEquipos = equiposUsar
      .filter((i) => i.es_cobrable)
      .reduce((s, i) => s + (i.cantidad || 0) * (i.precio_unitario || 0), 0);
   const totalCobrable = tarifaServicio + subtotalCobrables + subtotalEquipos;
   const totalInterno = internos.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
   const rentabilidad = totalCobrable - totalInterno;

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!clienteId) {
         setError("El cliente es requerido");
         return;
      }
      if (equiposUsar.length === 0 || !equiposUsar[0].equipo_id || !equiposUsar[0].operador_id) {
         setError("Se requiere al menos un equipo con operador");
         return;
      }
      if (tarifaServicio < 0) {
         setError("La tarifa del servicio debe ser mayor o igual a 0");
         return;
      }
      if (operadores.length === 0) {
         setError("No hay operadores disponibles para asignar al proyecto");
         return;
      }
      if (equiposUsar.some((eq) => eq.cantidad < 0)) {
         setError("La cantidad trabajada por equipo debe ser mayor o igual a 0");
         return;
      }
      if (equiposUsar.some((eq) => eq.precio_unitario < 0)) {
         setError("El precio unitario de los equipos debe ser mayor o igual a 0");
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
      if (rentabilidad < 0) {
         const confirm = window.confirm("La rentabilidad es negativa. ¿Desea continuar con la liquidación?");
         if (!confirm) return;
      }

      const payload = {
         cliente_id: clienteId,
         servicio_id: null,
         nombre: "Proyecto Express",

         tarifas: Object.values(
            equiposUsar.reduce((acc, e) => {
               if (!acc[e.categoria_equipo_id]) {
                  acc[e.categoria_equipo_id] = {
                     categoria_equipo_id: e.categoria_equipo_id,
                     precio_acordado: e.precio_unitario > 0 ? e.precio_unitario : 0.01,
                     cobra_en_snapshot: e.unidad_medida || "no tiene",
                     cobra_minimo_snapshot: e.cobro_minimo_snapshot || 0,
                  };
               }
               return acc;
            }, {} as Record<string, any>)
         ),

         // Se manda SIEMPRE todo el equipo usado (cobrable o no) para conservar
         // el historial de trabajo por equipo/operador. `es_cobrable` decide
         // si entra en el total facturado (ver notas de backend).
         equipos: equiposUsar.map((eq) => ({
            equipo_id: eq.equipo_id,
            categoria_equipo_id: eq.categoria_equipo_id,
            operador_id: eq.operador_id,
            cantidad: eq.cantidad,
            es_cobrable: eq.es_cobrable,
         })),

         cargos_cobrables: cobrables,
         gastos_internos: internos,
         tarifa_servicio: tarifaServicio,
      };

      await onSubmit(payload as any);
   }

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

         {/* ── Equipo trabajado ── */}
         <div className="space-y-2">
            <h3 className="text-sm font-semibold">Equipo en campo</h3>

            {equiposUsar.map((item, idx) => (
               <div
                  key={idx}
                  className="grid grid-cols-[28px_1.2fr_1fr_90px_100px_28px] gap-2 items-center mt-4"
               >
                  <input
                     type="checkbox"
                     checked={item.es_cobrable}
                     onChange={(e) => updateEquipo(idx, "es_cobrable", e.target.checked)}
                     title="Incluir en el cobro al cliente (si se destilda, solo queda en el historial)"
                     className="size-4 justify-self-center accent-brand-blue"
                  />
                  <div className="space-y-1.5">
                     <SelectBuscarEquipos
                        value={item.equipo_id ?? null}
                        onChange={(id, equipo) => handleSelectEquipo(idx, id, equipo)}
                        exclude={equiposUsar}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <SelectBuscadorOperator
                        value={item.operador_id ?? null}
                        onChange={(id) => updateEquipo(idx, "operador_id", id ?? "")} />

                  </div>

                  <div className="relative">
                     <span className="absolute -top-4 left-1 text-[10px] font-semibold text-muted-foreground">
                        {item.unidad_medida || "Unidad"}
                     </span>

                     <Input
                        type="number"
                        placeholder={item.unidad_medida || "Cant."}
                        className="w-full bg-muted/50 text-muted-foreground "
                        min={0}
                        step="0.5"
                        value={item.cantidad + item.cobro_minimo_snapshot || 0}
                        onChange={(e) => updateEquipo(idx, "cantidad", Number(e.target.value))}
                     />
                  </div>

                  <div className="space-y-1.5">
                     <Input
                        type="number"
                        placeholder="P. Unit."
                        className="w-full bg-muted/50 text-muted-foreground "
                        min={0}
                        step="0.01"
                        value={item.precio_unitario || 0}
                        onChange={(e) => updateEquipo(idx, "precio_unitario", Number(e.target.value))}
                        // readOnly
                        // disabled
                        title="Precio definido por la categoría del equipo"
                     />
                  </div>



                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="size-7 text-muted-foreground hover:text-destructive"
                     onClick={() => removeItem(setEquiposUsar, idx)}
                  >
                     <X className="h-4 w-4" />
                  </Button>
               </div>
            ))}

            <div className="flex items-center gap-3">
               <Button type="button" variant="outline" size="sm" onClick={addEquipo}>
                  + Agregar cargo Equipo
               </Button>
               <p className="text-xs text-muted-foreground">
                  Desmarca la casilla para registrar el trabajo del equipo sin incluirlo en el cobro al cliente.
               </p>
            </div>
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
                     ×
                  </Button>
               </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addItem(setInternos)}>
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
               <span className="text-muted-foreground">Subtotal equipos (cobrables)</span>
               <span>RD$ {subtotalEquipos.toLocaleString("es-DO")}</span>
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
               {loading ? "Registrando…" : "Liquidar Proyecto Express"}
            </Button>
         </div>
      </form>
   );
}