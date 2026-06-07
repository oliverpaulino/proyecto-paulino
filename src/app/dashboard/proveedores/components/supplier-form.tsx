"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SupplierProps, TipoProveedor } from "@/backend/modules/suppliers/domain/supplier.domain";

interface FormValues {
   nombre: string;
   rnc: string;
   tipo: TipoProveedor;
   email: string;
   telefono: string;
   direccion: string;
}

interface SupplierFormProps {
   initialData?: Partial<SupplierProps>;
   onSubmit: (data: FormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const TIPO_PROVEEDOR: { value: TipoProveedor; label: string }[] = [
   { value: "SUPLIDOR", label: "Suplidor" },
   { value: "SUB_CONTRATISTA", label: "SUB_CONTRATISTA" },
];

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

export function SupplierForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear proveedor",
}: SupplierFormProps) {
   const [values, setValues] = useState<FormValues>({
      nombre: initialData?.nombre ?? "",
      rnc: initialData?.rnc ?? "",
      tipo: initialData?.tipo ?? "SUPLIDOR",
      email: initialData?.email ?? "",
      telefono: initialData?.telefono ?? "",
      direccion: initialData?.direccion ?? "",
   });
   const [error, setError] = useState<string | null>(null);

   function set(field: keyof FormValues, value: string) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      try {
         await onSubmit(values);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-nombre">Nombre *</Label>
            <Input
               id="sf-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Nombre del proveedor"
               required
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-rnc">RNC *</Label>
            <Input
               id="sf-rnc"
               value={values.rnc}
               onChange={(e) => set("rnc", e.target.value)}
               placeholder="RNC del proveedor"
               required
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-tipo">Tipo de proveedor *</Label>
            <select
               id="sf-tipo"
               value={values.tipo}
               onChange={(e) => set("tipo", e.target.value as TipoProveedor)}
               className={SELECT_CLASS}
               required
            >
               {TIPO_PROVEEDOR.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
               ))}
            </select>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-email">Email</Label>
            <Input
               id="sf-email"
               type="email"
               value={values.email}
               onChange={(e) => set("email", e.target.value)}
               placeholder="proveedor@ejemplo.com"
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-telefono">Teléfono</Label>
            <Input
               id="sf-telefono"
               value={values.telefono}
               onChange={(e) => set("telefono", e.target.value)}
               placeholder="+1 809 000 0000"
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-direccion">Dirección</Label>
            <Input
               id="sf-direccion"
               value={values.direccion}
               onChange={(e) => set("direccion", e.target.value)}
               placeholder="Dirección del proveedor"
            />
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

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
