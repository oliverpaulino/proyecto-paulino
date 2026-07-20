"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectBuscadorCategoriaGasto } from "@/components/shared/selectBuscadorCategoriaGasto";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";
import { SelectBuscadorOrdenCompra } from "@/components/shared/selectBuscadorOrdenCompra";
import { SelectBuscadorEquipo } from "@/components/shared/selectBuscadorEquipo";
import type { CreateGastoForm } from "@/dtos/gastos.dto";

interface GastoFormProps {
   initialData?: any;
   predefinedValues?: Partial<CreateGastoForm>;
   onSubmit: (data: any) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
}

const INPUT_CLASS = "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] disabled:opacity-60 disabled:bg-muted";
const TEXTAREA_CLASS = "min-h-[80px] w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none disabled:opacity-60 disabled:bg-muted resize-none";

export function GastoForm({ initialData, predefinedValues, onSubmit, onCancel, loading }: GastoFormProps) {
   const [values, setValues] = useState({
      monto_total: initialData?.monto_total ?? predefinedValues?.monto_total ?? "",
      concepto: initialData?.concepto ?? predefinedValues?.concepto ?? "",
      ncf: initialData?.ncf ?? predefinedValues?.ncf ?? "",
      fecha: initialData?.fecha 
         ? new Date(initialData.fecha) 
         : (predefinedValues?.fecha ? new Date(predefinedValues.fecha) : new Date()),
      categoria_gasto_id: initialData?.categoria_gasto_id ?? predefinedValues?.categoria_gasto_id ?? null,
      orden_compra_id: initialData?.orden_compra_id ?? predefinedValues?.orden_compra_id ?? null,
      proyecto_id: initialData?.proyecto_id ?? predefinedValues?.proyecto_id ?? null,
      equipo_id: initialData?.equipo_id ?? predefinedValues?.equipo_id ?? null,
   });

   const [error, setError] = useState<string | null>(null);

   function set<K extends keyof typeof values>(field: K, value: typeof values[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   const isDisabled = (field: keyof CreateGastoForm) => {
      return loading || (predefinedValues?.[field] !== undefined);
   };

   // Formatea la fecha usando componentes locales para evitar desfases UTC
   const formatDateForInput = (date?: Date) => {
      if (!date || isNaN(date.getTime())) return "";
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
   };

   // Genera la fecha en hora local exacta según la selección del usuario
   const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      const [year, month, day] = val.split("-").map(Number);
      if (year && month && day) {
         set("fecha", new Date(year, month - 1, day));
      }
   };

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);

      if (!values.categoria_gasto_id) return setError("Debe seleccionar una categoría de gasto.");
      if (Number(values.monto_total) <= 0) return setError("El monto debe ser mayor a 0.");

      try {
         await onSubmit({
            monto_total: Number(values.monto_total),
            concepto: values.concepto,
            ncf: values.ncf,
            fecha: values.fecha,
            categoria_gasto_id: values.categoria_gasto_id,
            orden_compra_id: values.orden_compra_id,
            proyecto_id: values.proyecto_id,
            equipo_id: values.equipo_id,
         });
      } catch (err: any) {
         setError(err.message || "Error al procesar el formulario");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2 px-3 overflow-y-auto">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Categoría de Gasto *</Label>
                    <SelectBuscadorCategoriaGasto 
                    value={values.categoria_gasto_id} 
                    initialLabel={initialData?.categoria_gasto_nombre ?? ""} 
                    onChange={(id) => set("categoria_gasto_id", id)} 
                    disabled={isDisabled("categoria_gasto_id")} 
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                <Label>Monto Total ($) *</Label>
                <Input type="number" step="0.01" min="0.01" value={values.monto_total} onChange={(e) => set("monto_total", e.target.value)} required disabled={isDisabled("monto_total")} className={INPUT_CLASS} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                <Label>Número de comprobante fiscal *</Label>
                <Input value={values.ncf} onChange={(e) => set("ncf", e.target.value)} required disabled={isDisabled("ncf")} className={INPUT_CLASS} placeholder="B01..." />
                </div>
                <div className="flex flex-col gap-1.5">
                <Label>Fecha del Comprobante *</Label>
                <Input 
                   type="date" 
                   value={formatDateForInput(values.fecha)} 
                   onChange={handleDateChange} 
                   required 
                   disabled={isDisabled("fecha")} 
                   className={INPUT_CLASS} 
                />
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Proyecto Asociado</Label>
                    <SelectBuscadorProyecto 
                        value={values.proyecto_id}
                        initialLabel={initialData?.proyecto_codigo_referencia ?? ""} 
                        onChange={(id) => set("proyecto_id", id)} 
                        disabled={isDisabled("proyecto_id")} 
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label>Orden de Compra</Label>
                    <SelectBuscadorOrdenCompra 
                        value={values.orden_compra_id} 
                        initialLabel={initialData?.orden_compra_codigo_referencia ?? ""} 
                        onChange={(id) => set("orden_compra_id", id)} 
                        disabled={isDisabled("orden_compra_id")} 
                    />
                </div>


                <div className="flex flex-col gap-1.5">
                    <Label>Equipo Asociado</Label>
                    <SelectBuscadorEquipo 
                        value={values.equipo_id} 
                        initialLabel={initialData?.equipo_codigo_referencia ?? ""} 
                        onChange={(id) => set("equipo_id", id)} 
                        disabled={isDisabled("equipo_id")} 
                    />
                </div>  
            </div>

            <div className="flex flex-col gap-1.5">
            <Label>Concepto del Gasto *</Label>
            <textarea 
               value={values.concepto} 
               onChange={(e) => set("concepto", e.target.value)} 
               required 
               disabled={isDisabled("concepto")} 
               className={TEXTAREA_CLASS} 
               placeholder="Ej: Compra de material de oficina" 
            />
            </div>

         {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">{error}</div>}

         <div className="flex gap-2 justify-end pt-4 border-t border-border mt-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar Gasto"}</Button>
         </div>
      </form>
   );
}