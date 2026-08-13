"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Unit } from "@/dtos/unit.dto";
import { TipoUnidadEnum } from "@/dtos/unit.dto";
import { useUnitStore } from "@/stores/useUnitStore";

const tipoUnidadOptions = Object.entries(TipoUnidadEnum).map(([key, value]) => ({
   value: key as keyof typeof TipoUnidadEnum,
   label: value,
}));

interface FormValues {
   id?: string;
   nombre: string;
   abreviatura: string;
   tipo_unidad: keyof typeof TipoUnidadEnum;
   factor_a_base: number;
}

interface UnitFormProps {
   initialData?: Partial<FormValues>;
   onSubmit: (data: FormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground disabled:opacity-60 disabled:bg-muted disabled:cursor-not-allowed transition-colors";

const INPUT_DISABLED_CLASS = "disabled:bg-muted disabled:opacity-60 transition-colors";

export function UnitForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear unidad",
}: UnitFormProps) {
   const [values, setValues] = useState<FormValues>({
      id: initialData?.id,
      nombre: initialData?.nombre ?? "",
      abreviatura: initialData?.abreviatura ?? "",
      tipo_unidad: initialData?.tipo_unidad ?? "LONGITUD",
      factor_a_base: initialData?.factor_a_base ?? 1,
   });

   const [error, setError] = useState<string | null>(null);
   const [baseUnit, setBaseUnit] = useState<Unit | null>(null);
   const [isFetchingBase, setIsFetchingBase] = useState(false);
   const { GetUnitsByTipo } = useUnitStore();

   useEffect(() => {
      if (values.tipo_unidad === "OTRO") {
         setValues((prev) => ({ ...prev, factor_a_base: 1 }));
         setBaseUnit(null);
         return;
      }

      let active = true;

      setIsFetchingBase(true);
      GetUnitsByTipo(values.tipo_unidad)
         .then((units) => {
            if (!active) return;
            const base = units.find((u) => Number(u.factor_a_base) === 1);
            setBaseUnit(base || null);
         })
         .catch((err) => {
            if (active) console.error("Error buscando unidad base", err);
         })
         .finally(() => {
            if (active) setIsFetchingBase(false);
         });

      return () => {
         active = false;
      };
   }, [values.tipo_unidad, GetUnitsByTipo]);

   const isEditingBase = values.id && baseUnit?.id === values.id;

   function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   function validateForm(): boolean {
      setError(null);

      if (!values.nombre.trim()) {
         setError("El nombre de la unidad es requerido");
         return false;
      }
      if (!values.abreviatura.trim()) {
         setError("La abreviatura es requerida");
         return false;
      }
      if (values.factor_a_base <= 0) {
         setError("El factor de conversión debe ser mayor a 0");
         return false;
      }

      return true;
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!validateForm()) return;

      try {
         await onSubmit({
            nombre: values.nombre.trim(),
            abreviatura: values.abreviatura.trim(),
            tipo_unidad: values.tipo_unidad,
            factor_a_base: values.factor_a_base,
         });
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-nombre">Nombre de la unidad *</Label>
            <Input
               id="unit-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Ej: Metro cuadrado"
               required
               disabled={loading}
               className={INPUT_DISABLED_CLASS}
            />
         </div>

         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="unit-abreviatura">Abreviatura *</Label>
               <Input
                  id="unit-abreviatura"
                  value={values.abreviatura}
                  onChange={(e) => set("abreviatura", e.target.value)}
                  placeholder="Ej: m²"
                  required
                  disabled={loading}
                  className={INPUT_DISABLED_CLASS}
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="unit-tipo">Tipo de medida *</Label>
               <select
                  id="unit-tipo"
                  value={values.tipo_unidad}
                  onChange={(e) => set("tipo_unidad", e.target.value as keyof typeof TipoUnidadEnum)}
                  className={SELECT_CLASS}
                  required
                  disabled={Boolean(loading || isEditingBase)}
               >
                  {tipoUnidadOptions.map((t) => (
                     <option key={t.value} value={t.value}>
                        {t.label}
                     </option>
                  ))}
               </select>
            </div>
         </div>

         {/* SECCIÓN DEL FACTOR DE CONVERSIÓN */}
         <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
            <Label htmlFor="unit-factor">Factor de conversión a Base *</Label>
            <Input
               id="unit-factor"
               type="number"
               step="any"
               min="0.000001"
               value={values.factor_a_base}
               onChange={(e) => set("factor_a_base", parseFloat(e.target.value) || 0)}
               required
               disabled={loading || values.tipo_unidad === "OTRO" || !!isEditingBase}
               className={INPUT_DISABLED_CLASS}
            />

            {/* Hint Dinámico */}
            <div className="mt-1 min-h-[40px]">
               {values.tipo_unidad === "OTRO" ? (
                  <span className="text-xs text-muted-foreground">
                     Las magnitudes de tipo "OTRO" no requieren factor de conversión.
                  </span>
               ) : isFetchingBase ? (
                  <span className="text-xs text-muted-foreground animate-pulse">
                     Verificando base de la categoría...
                  </span>
               ) : baseUnit ? (
                  isEditingBase ? (
                     <span className="text-xs font-medium text-amber-600">
                        Esta es la unidad base actual para la categoría de {values.tipo_unidad}. Su factor siempre es 1.
                     </span>
                  ) : (
                     <span className="flex flex-col gap-1 rounded-md border border-brand-blue/20 bg-brand-blue/5 p-2 text-xs text-muted-foreground">
                        <span>
                           La unidad base es: <strong>{baseUnit.nombre} ({baseUnit.abreviatura})</strong>
                        </span>
                        <span className="font-medium text-foreground">
                           💡 1 {values.nombre || "Unidad"} = <span className="text-brand-blue">{values.factor_a_base} {baseUnit.abreviatura}</span>
                        </span>
                     </span>
                  )
               ) : (
                  <span className="flex flex-col gap-1 rounded-md text-xs text-muted-foreground">
                     <span className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        Aún no hay unidad base para {values.tipo_unidad}.
                     </span>
                     <span className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        Si dejas este factor en <strong>1</strong>, esta será considerada la unidad principal.
                     </span>
                  </span>
               )}
            </div>
         </div>

         {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 mt-1 text-sm font-medium text-destructive">
               {error}
            </div>
         )}

         <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
               <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancelar
               </Button>
            )}
            <Button type="submit" disabled={loading}>
               {loading ? "Guardando…" : submitLabel}
            </Button>
         </div>
      </form>
   );
}