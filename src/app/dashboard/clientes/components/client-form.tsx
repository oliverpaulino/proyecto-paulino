"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientProps, TipoCliente, TipoIdentificacion } from "@/backend/modules/clients/domain/clients.domain";

interface FormValues {
   nombre: string;
   identificacion: string;
   tipo_identificacion: TipoIdentificacion;
   tipo_cliente: TipoCliente;
   email: string;
   telefono: string;
   direccion: string;
}

interface ClientFormProps {
   initialData?: Partial<ClientProps>;
   onSubmit: (data: FormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const TIPO_IDENTIFICACION: { value: TipoIdentificacion; label: string }[] = [
   { value: "CEDULA", label: "Cédula" },
   { value: "PASAPORTE", label: "Pasaporte" },
   { value: "RNC", label: "RNC" },
];

const TIPO_CLIENTE: { value: TipoCliente; label: string }[] = [
   { value: "fisica", label: "Persona Física" },
   { value: "juridica", label: "Persona Jurídica" },
   { value: "gubernamental", label: "Gubernamental" },
];

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

export function ClientForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear cliente",
}: ClientFormProps) {
   const [values, setValues] = useState<FormValues>({
      nombre: initialData?.nombre ?? "",
      identificacion: initialData?.identificacion ?? "",
      tipo_identificacion: initialData?.tipo_identificacion ?? "CEDULA",
      tipo_cliente: initialData?.tipo_cliente ?? "fisica",
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
         {/* Nombre */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-nombre">Nombre *</Label>
            <Input
               id="cf-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Nombre del cliente"
               required
            />
         </div>

         {/* Email */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-email">Email</Label>
            <Input
               id="cf-email"
               type="email"
               value={values.email}
               onChange={(e) => set("email", e.target.value)}
               placeholder="cliente@ejemplo.com"
            />
         </div>

         {/* Teléfono */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-telefono">Teléfono</Label>
            <Input
               id="cf-telefono"
               value={values.telefono}
               onChange={(e) => set("telefono", e.target.value)}
               placeholder="+1 234 567 890"
            />
         </div>

         {/* Dirección */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-direccion">Dirección</Label>
            <Input
               id="cf-direccion"
               value={values.direccion}
               onChange={(e) => set("direccion", e.target.value)}
               placeholder="123 Main St"
            />
         </div>

         {/* RNC/Cédula */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-identificacion">RNC/Cédula</Label>
            <Input
               id="cf-identificacion"
               value={values.identificacion}
               onChange={(e) => set("identificacion", e.target.value)}
               placeholder="RNC o número de cédula"
               required
            />
         </div>

         {/* Perfil de cliente (tipo_cliente) */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-tipo-cliente">Perfil de cliente</Label>
            <select
               id="cf-tipo-cliente"
               value={values.tipo_cliente}
               onChange={(e) => set("tipo_cliente", e.target.value as TipoCliente)}
               className={SELECT_CLASS}
               required
            >
               {TIPO_CLIENTE.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
               ))}
            </select>
         </div>

         {/* Tipo de identificación */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-tipo-id">Tipo de comprobante</Label>
            <select
               id="cf-tipo-id"
               value={values.tipo_identificacion}
               onChange={(e) => set("tipo_identificacion", e.target.value as TipoIdentificacion)}
               className={SELECT_CLASS}
               required
            >
               {TIPO_IDENTIFICACION.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
               ))}
            </select>
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