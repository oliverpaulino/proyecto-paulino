"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GrupoGastoEnum } from "@/dtos/categoria-gasto.dto";

const grupoGastoOptions = Object.entries(GrupoGastoEnum).map(([key, value]) => ({
   value: key as keyof typeof GrupoGastoEnum,
   label: value,
}));

interface FormValues {
   id?: string;
   nombre: string;
   grupo: keyof typeof GrupoGastoEnum;
}

interface CategoriaGastoFormProps {
   initialData?: Partial<FormValues>;
   onSubmit: (data: FormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground disabled:opacity-60 disabled:bg-muted disabled:cursor-not-allowed transition-colors";

const INPUT_DISABLED_CLASS = "disabled:bg-muted disabled:opacity-60 transition-colors";

export function CategoriaGastoForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear categoría",
}: CategoriaGastoFormProps) {
   const [values, setValues] = useState<FormValues>({
      id: initialData?.id,
      nombre: initialData?.nombre ?? "",
      grupo: initialData?.grupo ?? "OPERATIVO",
   });

   const [error, setError] = useState<string | null>(null);

   function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   function validateForm(): boolean {
      setError(null);

      if (!values.nombre.trim()) {
         setError("El nombre de la categoría es requerido");
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
            grupo: values.grupo,
         });
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-nombre">Nombre de la categoría *</Label>
            <Input
               id="cat-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Ej: Mantenimiento de Equipos"
               required
               disabled={loading}
               className={INPUT_DISABLED_CLASS}
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-grupo">Tipo de gasto *</Label>
            <select
               id="cat-grupo"
               value={values.grupo}
               onChange={(e) => set("grupo", e.target.value as keyof typeof GrupoGastoEnum)}
               className={SELECT_CLASS}
               required
               disabled={loading}
            >
               {grupoGastoOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                     {t.label}
                  </option>
               ))}
            </select>
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