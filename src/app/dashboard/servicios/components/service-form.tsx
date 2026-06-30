"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { TipoServicio } from "@/dtos/service.dto";

const tipoServicioOptions = Object.entries(TipoServicio).map(([key, value]) => ({
   value: key as keyof typeof TipoServicio,
   label: value,
}));

interface FormValues {
   nombre: string;
   tipo: keyof typeof TipoServicio;
   precio_base: string;
   descripcion: string;
}

interface ServiceFormProps {
   initialData?: Partial<{
      nombre: string;
      tipo: keyof typeof TipoServicio;
      precio_base: number;
      descripcion: string | null;
   }>;
   onSubmit: (data: {
      nombre: string;
      tipo: keyof typeof TipoServicio;
      precio_base: number;
      descripcion: string | null;
   }) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground disabled:opacity-60 disabled:bg-muted disabled:cursor-not-allowed transition-colors";

const INPUT_DISABLED_CLASS = "disabled:bg-muted disabled:opacity-60 transition-colors";

export function ServiceForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear servicio",
}: ServiceFormProps) {
   const [values, setValues] = useState<FormValues>({
      nombre: initialData?.nombre ?? "",
      tipo: initialData?.tipo ?? "REGADO",
      precio_base:
         initialData?.precio_base !== undefined && initialData?.precio_base !== null
            ? String(initialData.precio_base)
            : "",
      descripcion: initialData?.descripcion ?? "",
   });

   const [error, setError] = useState<string | null>(null);

   function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
      // Permite dígitos y un único punto decimal
      const cleanValue = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
      set("precio_base", cleanValue);
   }

   function validateForm(): boolean {
      setError(null);

      if (!values.nombre.trim()) {
         setError("El nombre es requerido");
         return false;
      }

      if (values.precio_base !== "") {
         const parsed = Number(values.precio_base);
         if (Number.isNaN(parsed)) {
            setError("El precio base debe ser un número válido");
            return false;
         }
         if (parsed < 0) {
            setError("El precio base no puede ser negativo");
            return false;
         }
         const decimals = values.precio_base.split(".")[1];
         if (decimals && decimals.length > 2) {
            setError("El precio base no puede tener más de 2 decimales");
            return false;
         }
      }

      return true;
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();

      if (!validateForm()) return;

      try {
         await onSubmit({
            nombre: values.nombre.trim(),
            tipo: values.tipo,
            precio_base: values.precio_base === "" ? 0 : Number(values.precio_base),
            descripcion: values.descripcion.trim() || null,
         });
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="svc-nombre">Nombre del servicio *</Label>
            <Input
               id="svc-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Ej: Regado de calle principal"
               required
               disabled={loading}
               className={INPUT_DISABLED_CLASS}
            />
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="svc-tipo">Tipo de servicio *</Label>
               <select
                  id="svc-tipo"
                  value={values.tipo}
                  onChange={(e) => set("tipo", e.target.value as keyof typeof TipoServicio)}
                  className={SELECT_CLASS}
                  required
                  disabled={loading}
               >
                  {tipoServicioOptions.map((t) => (
                     <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
               </select>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="svc-precio">Precio base (RD$)</Label>
               <Input
                  id="svc-precio"
                  inputMode="decimal"
                  value={values.precio_base}
                  onChange={handlePriceChange}
                  placeholder="0.00"
                  disabled={loading}
                  className={INPUT_DISABLED_CLASS}
               />
            </div>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="svc-descripcion">Descripción</Label>
            <textarea
               id="svc-descripcion"
               value={values.descripcion}
               onChange={(e) => set("descripcion", e.target.value)}
               placeholder="Detalles del servicio (opcional)"
               rows={3}
               disabled={loading}
               className="w-full rounded-2xl border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground resize-none transition-colors disabled:opacity-60 disabled:bg-muted disabled:cursor-not-allowed"
            />
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
