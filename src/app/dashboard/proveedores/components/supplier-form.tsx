"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Importamos los schemas, el enum y validaciones generales
import { GeneralSchemasDTO } from "@/dtos/schema.dto"; 
import { TipoProveedor } from "@/dtos/supplier.dto";

const tipoProveedorOptions = Object.entries(TipoProveedor).map(([key, value]) => ({
   value: key as keyof typeof TipoProveedor,
   label: value,
}));

interface FormValues {
   nombre: string;
   rnc: string;
   tipo: keyof typeof TipoProveedor;
   email: string;
   telefono: string;
   direccion: string;
}

interface SupplierFormProps {
   initialData?: Partial<any>;
   onSubmit: (data: FormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

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
      tipo: initialData?.tipo?.toUpperCase() ?? "SUPLIDOR",
      email: initialData?.email ?? "",
      telefono: initialData?.telefono ?? "",
      direccion: initialData?.direccion ?? "",
   });
   
   const [error, setError] = useState<string | null>(null);

   function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   function handleRncChange(e: React.ChangeEvent<HTMLInputElement>) {
      const cleanValue = e.target.value.replace(/\D/g, "");
      set("rnc", cleanValue);
   }

   function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
      const cleanValue = e.target.value.replace(/\D/g, "");
      set("telefono", cleanValue);
   }

   function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
      const cleanValue = e.target.value.toLowerCase().trim();
      set("email", cleanValue);
   }

   function validateForm(): boolean {
      setError(null);

      const rncValidation = GeneralSchemasDTO.RncSchema.safeParse(values.rnc);
      if (!rncValidation.success) {
         setError(rncValidation.error.issues[0].message);
         return false;
      }

      if (values.email) {
         const emailValidation = GeneralSchemasDTO.EmailSchema.safeParse(values.email);
         if (!emailValidation.success) {
            setError(emailValidation.error.issues[0].message);
            return false;
         }
      }

      if (values.telefono) {
         const phoneValidation = GeneralSchemasDTO.TelefonoSchema.safeParse(values.telefono);
         if (!phoneValidation.success) {
            setError(phoneValidation.error.issues[0].message);
            return false;
         }
      }

      return true;
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      
      if (!validateForm()) return; 

      try {
         await onSubmit(values);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
         
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-nombre">Nombre o Razón Social *</Label>
            <Input
               id="sf-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Nombre del proveedor"
               required
            />
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="sf-rnc">RNC *</Label>
               <Input
                  id="sf-rnc"
                  value={values.rnc}
                  onChange={handleRncChange}
                  placeholder="Ej: 130123456"
                  required
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="sf-tipo">Tipo de proveedor *</Label>
               <select
                  id="sf-tipo"
                  value={values.tipo}
                  onChange={(e) => set("tipo", e.target.value as keyof typeof TipoProveedor)}
                  className={SELECT_CLASS}
                  required
               >
                  {tipoProveedorOptions.map((t) => (
                     <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
               </select>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="sf-telefono">Teléfono</Label>
               <Input
                  id="sf-telefono"
                  type="tel"
                  value={values.telefono}
                  onChange={handlePhoneChange}
                  placeholder="Ej: 8091234567"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="sf-email">Email</Label>
               <Input
                  id="sf-email"
                  type="email"
                  value={values.email}
                  onChange={handleEmailChange}
                  placeholder="proveedor@ejemplo.com"
               />
            </div>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-direccion">Dirección</Label>
            <Input
               id="sf-direccion"
               value={values.direccion}
               onChange={(e) => set("direccion", e.target.value)}
               placeholder="Dirección física del proveedor"
            />
         </div>

         {/* Contenedor de Error Estilizado */}
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