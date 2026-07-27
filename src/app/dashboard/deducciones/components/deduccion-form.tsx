"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectBuscadorEmployee } from "@/components/shared/selectBuscadorEmployee";
import { SelectBuscadorEquipo } from "@/components/shared/selectBuscadorEquipo";
import type { CreateDeduccionForm } from "@/dtos/deducciones.dto";
import { SelectBuscadorGasto } from "@/components/shared/SelectBuscadorGasto";

interface DeduccionFormProps {
   initialData?: any;
   predefinedValues?: Partial<CreateDeduccionForm>;
   onSubmit: (data: any) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
}

const INPUT_CLASS = "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] disabled:opacity-60 disabled:bg-muted";
const TEXTAREA_CLASS = "min-h-[80px] w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none disabled:opacity-60 disabled:bg-muted resize-none";

export function DeduccionForm({ initialData, predefinedValues, onSubmit, onCancel, loading }: DeduccionFormProps) {
   const [values, setValues] = useState({
      empleado_id: initialData?.empleado_id ?? predefinedValues?.empleado_id ?? null,
      equipo_id: initialData?.equipo_id ?? predefinedValues?.equipo_id ?? null,
      gasto_id: initialData?.gasto_id ?? predefinedValues?.gasto_id ?? null,
      monto_total: initialData?.monto_total ?? predefinedValues?.monto_total ?? "",
      balance_pendiente: initialData?.balance_pendiente ?? predefinedValues?.balance_pendiente ?? "",
      concepto: initialData?.concepto ?? predefinedValues?.concepto ?? "",
      fecha: initialData?.fecha 
         ? new Date(initialData.fecha) 
         : (predefinedValues?.fecha ? new Date(predefinedValues.fecha) : new Date()),
   });

   const [error, setError] = useState<string | null>(null);

   function set<K extends keyof typeof values>(field: K, value: typeof values[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   const isDisabled = (field: keyof CreateDeduccionForm) => {
      return loading || (predefinedValues?.[field] !== undefined);
   };

   const formatDateForInput = (date?: Date) => {
      if (!date || isNaN(date.getTime())) return "";
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
   };

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

      if (!values.empleado_id) return setError("Debe seleccionar un empleado asociado a la deducción.");
      if (Number(values.monto_total) <= 0) return setError("El monto debe ser mayor a 0.");

      try {
         await onSubmit({
            empleado_id: values.empleado_id,
            equipo_id: values.equipo_id,
            gasto_id: values.gasto_id,
            monto_total: Number(values.monto_total),
            balance_pendiente: values.balance_pendiente ? Number(values.balance_pendiente) : null,
            concepto: values.concepto,
            fecha: values.fecha,
         });
      } catch (err: any) {
         setError(err.message || "Error al procesar el formulario");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2 px-3 overflow-y-auto">

            <div className="flex flex-col gap-1.5">
                  <Label>Gasto Asociado (Opcional)</Label>
                  <SelectBuscadorGasto 
                     value={values.gasto_id}
                     initialLabel={initialData?.gasto_codigo_referencia ?? ""} 
                     onChange={(id) => set("gasto_id", id)} 
                     disabled={isDisabled("gasto_id")} 
                  />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Empleado Asociado *</Label>
                    <SelectBuscadorEmployee 
                        value={values.empleado_id}
                        initialLabel={initialData?.empleado_nombre ?? ""} 
                        onChange={(id) => set("empleado_id", id)} 
                        disabled={isDisabled("empleado_id")} 
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label>Fecha de Aplicación *</Label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Monto Total ($) *</Label>
                    <Input type="number" step="0.01" min="0.01" value={values.monto_total} onChange={(e) => set("monto_total", e.target.value)} required disabled={isDisabled("monto_total")} className={INPUT_CLASS} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label>Balance Pendiente ($)</Label>
                    <Input type="number" step="0.01" value={values.balance_pendiente} onChange={(e) => set("balance_pendiente", e.target.value)} disabled={isDisabled("balance_pendiente")} className={INPUT_CLASS} placeholder="Dejar vacío si no aplica" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Equipo Asociado (Opcional)</Label>
                    <SelectBuscadorEquipo 
                        value={values.equipo_id} 
                        initialLabel={initialData?.equipo_codigo_referencia ?? ""} 
                        onChange={(id) => set("equipo_id", id)} 
                        disabled={isDisabled("equipo_id")} 
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label>Concepto *</Label>
                <textarea 
                    value={values.concepto} 
                    onChange={(e) => set("concepto", e.target.value)} 
                    required 
                    disabled={isDisabled("concepto")} 
                    className={TEXTAREA_CLASS} 
                    placeholder="Ej: Descuento por daños en maquinaria..." 
                />
            </div>

         {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">{error}</div>}

         <div className="flex gap-2 justify-end pt-4 border-t border-border mt-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar Deducción"}</Button>
         </div>
      </form>
   );
}