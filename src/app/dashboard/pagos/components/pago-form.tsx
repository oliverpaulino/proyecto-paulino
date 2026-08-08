"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectBuscadorGasto } from "@/components/shared/SelectBuscadorGasto";
import { SelectBuscadorDeduccion } from "@/components/shared/SelectBuscadorDeduccion";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";
import { SelectBuscadorOrdenCompra } from "@/components/shared/selectBuscadorOrdenCompra";
import { 
   CreatePagoForm, 
   MetodoPago, 
   TipoMovimiento 
} from "@/dtos/pagos.dto";

interface PagoFormProps {
   initialData?: any;
   predefinedValues?: Partial<CreatePagoForm>;
   /** Código visible de la OC cuando viene predefinida (pago rápido), para que
    * el selector muestre la referencia aunque esté bloqueado. */
   predefinedOrdenCompraLabel?: string;
   onSubmit: (data: any) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
}

const INPUT_CLASS = "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] disabled:opacity-60 disabled:bg-muted";
const TEXTAREA_CLASS = "min-h-[80px] w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none disabled:opacity-60 disabled:bg-muted resize-none";

const metodoPagoOptions = Object.entries(MetodoPago).map(([key, value]) => ({
   value: key as keyof typeof MetodoPago,
   label: value,
}));

const tipoMovimientoOptions = Object.entries(TipoMovimiento).map(([key, value]) => ({
   value: key as keyof typeof TipoMovimiento,
   label: value,
}));

export function PagoForm({ initialData, predefinedValues, predefinedOrdenCompraLabel, onSubmit, onCancel, loading }: PagoFormProps) {
   // Determinar estado inicial del tipo de destino basado en la data inicial
   const getInitialDestino = () => {
      if (initialData?.gasto_empresa_id || predefinedValues?.gasto_empresa_id) return 'GASTO';
      if (initialData?.deduccion_empleado_id || predefinedValues?.deduccion_empleado_id) return 'DEDUCCION';
      if (initialData?.proyecto_id || predefinedValues?.proyecto_id) return 'PROYECTO';
      if (initialData?.orden_compra_id || predefinedValues?.orden_compra_id) return 'ORDEN_COMPRA';
      return '';
   };

   const [destinoTipo, setDestinoTipo] = useState<string>(getInitialDestino());

   const [values, setValues] = useState({
      metodo_pago: initialData?.metodo_pago ?? predefinedValues?.metodo_pago ?? "TRANSFERENCIA",
      tipo_movimiento: initialData?.tipo_movimiento ?? predefinedValues?.tipo_movimiento ?? "SALIDA",
      monto_pagado: initialData?.monto_pagado ?? predefinedValues?.monto_pagado ?? "",
      concepto: initialData?.concepto ?? predefinedValues?.concepto ?? "",
      fecha: initialData?.fecha 
         ? new Date(initialData.fecha) 
         : (predefinedValues?.fecha ? new Date(predefinedValues.fecha) : new Date()),
      
      gasto_empresa_id: initialData?.gasto_empresa_id ?? predefinedValues?.gasto_empresa_id ?? null,
      deduccion_empleado_id: initialData?.deduccion_empleado_id ?? predefinedValues?.deduccion_empleado_id ?? null,
      proyecto_id: initialData?.proyecto_id ?? predefinedValues?.proyecto_id ?? null,
      orden_compra_id: initialData?.orden_compra_id ?? predefinedValues?.orden_compra_id ?? null,
   });

   const [error, setError] = useState<string | null>(null);

   function set<K extends keyof typeof values>(field: K, value: typeof values[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   const handleDestinoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value;
      setDestinoTipo(type);
      // Limpiar los IDs cuando cambie el destino para mantener la exclusividad
      setValues((prev) => ({
         ...prev,
         gasto_empresa_id: null,
         deduccion_empleado_id: null,
         proyecto_id: null,
         orden_compra_id: null,
      }));
   };

   const isDisabled = (field: keyof CreatePagoForm) => {
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

      if (Number(values.monto_pagado) <= 0) return setError("El monto debe ser mayor a 0.");
      
      const count = [values.gasto_empresa_id, values.deduccion_empleado_id, values.proyecto_id, values.orden_compra_id].filter(Boolean).length;
      if (count !== 1) {
         return setError("Debe proveer exactamente una referencia de destino válida (Gasto, Deducción, Proyecto u Orden de Compra).");
      }

      try {
         await onSubmit({
            metodo_pago: values.metodo_pago,
            tipo_movimiento: values.tipo_movimiento,
            monto_pagado: Number(values.monto_pagado),
            concepto: values.concepto,
            fecha: values.fecha,
            gasto_empresa_id: values.gasto_empresa_id,
            deduccion_empleado_id: values.deduccion_empleado_id,
            proyecto_id: values.proyecto_id,
            orden_compra_id: values.orden_compra_id,
         });
      } catch (err: any) {
         setError(err.message || "Error al procesar el formulario");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2 px-3 overflow-y-auto">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Método de Pago *</Label>
                    <select 
                        value={values.metodo_pago} 
                        onChange={(e) => set("metodo_pago", e.target.value)}
                        disabled={isDisabled("metodo_pago")}
                        className={INPUT_CLASS}
                    >
                        {metodoPagoOptions.map((m) => (
                           <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label>Tipo de Movimiento *</Label>
                    <select 
                        value={values.tipo_movimiento} 
                        onChange={(e) => set("tipo_movimiento", e.target.value)}
                        disabled={isDisabled("tipo_movimiento")}
                        className={INPUT_CLASS}
                    >
                        {tipoMovimientoOptions.map((t) => (
                           <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Monto (RD$) *</Label>
                    <Input type="number" step="0.01" min="0.01" value={values.monto_pagado} onChange={(e) => set("monto_pagado", e.target.value)} required disabled={isDisabled("monto_pagado")} className={INPUT_CLASS} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label>Fecha del Pago *</Label>
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

            <div className="mt-2 h-px bg-border" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Destino *</Label>
                    <select 
                        value={destinoTipo} 
                        onChange={handleDestinoChange}
                        disabled={loading || !!initialData || (!!predefinedValues?.orden_compra_id)} 
                        className={INPUT_CLASS}
                        required
                    >
                        <option value="" disabled>Seleccione el tipo...</option>
                        <option value="GASTO">Gasto</option>
                        <option value="DEDUCCION">Deducción</option>
                        <option value="PROYECTO">Proyecto</option>
                        <option value="ORDEN_COMPRA">Orden de Compra</option>
                    </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                    <Label>Referencia de Destino *</Label>
                    {!destinoTipo && (
                        <div className="h-9 flex items-center text-sm text-muted-foreground italic px-3 rounded-md bg-muted/30 border border-input/30">
                            Seleccione un tipo primero...
                        </div>
                    )}
                    {destinoTipo === 'GASTO' && (
                        <SelectBuscadorGasto 
                           value={values.gasto_empresa_id}
                           initialLabel={initialData?.gasto_codigo_referencia ?? ""} 
                           onChange={(id) => set("gasto_empresa_id", id)} 
                           disabled={isDisabled("gasto_empresa_id")} 
                        />
                    )}
                    {destinoTipo === 'DEDUCCION' && (
                        <SelectBuscadorDeduccion 
                           value={values.deduccion_empleado_id}
                           initialLabel={initialData?.deduccion_codigo_referencia ?? ""} 
                           onChange={(id) => set("deduccion_empleado_id", id)} 
                           disabled={isDisabled("deduccion_empleado_id")} 
                        />
                    )}
                    {destinoTipo === 'PROYECTO' && (
                        <SelectBuscadorProyecto 
                           value={values.proyecto_id}
                           initialLabel={initialData?.proyecto_codigo_referencia ?? ""} 
                           onChange={(id) => set("proyecto_id", id)} 
                           disabled={isDisabled("proyecto_id")} 
                        />
                    )}
                    {destinoTipo === 'ORDEN_COMPRA' && (
                        <SelectBuscadorOrdenCompra 
                           value={values.orden_compra_id}
                           initialLabel={initialData?.orden_compra_codigo_referencia ?? predefinedOrdenCompraLabel ?? ""} 
                           onChange={(id) => set("orden_compra_id", id)} 
                           disabled={isDisabled("orden_compra_id")} 
                        />
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label>Concepto del Pago *</Label>
                <textarea 
                    value={values.concepto} 
                    onChange={(e) => set("concepto", e.target.value)} 
                    required 
                    disabled={isDisabled("concepto")} 
                    className={TEXTAREA_CLASS} 
                    placeholder="Ej: Transferencia #489221, Pago correspondiente a..." 
                />
            </div>

         {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">{error}</div>}

         <div className="flex gap-2 justify-end pt-4 border-t border-border mt-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar Pago"}</Button>
         </div>
      </form>
   );
}