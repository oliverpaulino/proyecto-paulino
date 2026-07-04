"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";

import {
   GeneralSchemasDTO,
   TipoIdentificacion,
} from "@/dtos/schema.dto";

import { TipoCliente } from "@/dtos/client.dto";

const tipoIdentificacionOptions = Object.entries(TipoIdentificacion).map(([key, value]) => ({
   value: key as keyof typeof TipoIdentificacion,
   label: value,
}));

const tipoClienteOptions = Object.entries(TipoCliente).map(([key, value]) => ({
   value: key as keyof typeof TipoCliente,
   label: value,
}));

interface FormValues {
   nombre: string;
   identificacion: string;
   tipo_identificacion: keyof typeof TipoIdentificacion;
   tipo_cliente: keyof typeof TipoCliente;
   email: string;
   telefono: string;
   direccion: string;
}

interface ClientFormProps {
   initialData?: Partial<any>;
   onSubmit: (data: FormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground disabled:opacity-60 disabled:bg-muted disabled:cursor-not-allowed transition-colors";

const INPUT_DISABLED_CLASS = "disabled:bg-muted disabled:opacity-60 transition-colors";

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
      tipo_identificacion: initialData?.tipo_identificacion?.toUpperCase() ?? "CEDULA",
      tipo_cliente: initialData?.tipo_cliente?.toUpperCase() ?? "FISICA",
      email: initialData?.email ?? "",
      telefono: initialData?.telefono ?? "",
      direccion: initialData?.direccion ?? "",
   });

   const [error, setError] = useState<string | null>(null);
   const [isSearching, setIsSearching] = useState(false);

   const [isManualEntryAllowed, setIsManualEntryAllowed] = useState(false);
   const [apiDataFound, setApiDataFound] = useState<{ nombre: boolean; perfil: boolean }>({
      nombre: false,
      perfil: false,
   });

   const debouncedIdentificacion = useDebounce(values.identificacion, 800);
   const isIdLengthValid = debouncedIdentificacion.length === 9 || debouncedIdentificacion.length === 11;

   function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   useEffect(() => {
      async function fetchClienteDGII() {
         if (values.tipo_identificacion === "PASAPORTE") {
            set("tipo_cliente", "FISICA");
            setIsManualEntryAllowed(true);
            return;
         }

         if (!isIdLengthValid) {
            setIsManualEntryAllowed(false);
            setApiDataFound({ nombre: false, perfil: false });
            return;
         }

         setIsSearching(true);
         setIsManualEntryAllowed(false);

         try {

            const url = `/api/dgii/${debouncedIdentificacion.toString()}`;
            const response = await fetch(url);
            console.log("DGII API response status:", response.status);
            console.log(response)

            if (response.ok) {
               const data = await response.json();

               if (data.error === false && data.nombre_razon_social) {
                  let tipoC: keyof typeof TipoCliente = "FISICA";
                  let tipoI: keyof typeof TipoIdentificacion = "CEDULA";

                  if (debouncedIdentificacion.length === 9) {
                     tipoC = debouncedIdentificacion.startsWith("4") ? "GUBERNAMENTAL" : "JURIDICA";
                     tipoI = "RNC";
                  }

                  set("nombre", data.nombre_razon_social);
                  set("tipo_cliente", tipoC);
                  set("tipo_identificacion", tipoI);

                  setApiDataFound({
                     nombre: true,
                     perfil: true
                  });

                  setIsManualEntryAllowed(true);
                  setError(null);
               } else {
                  setIsManualEntryAllowed(true);
                  setApiDataFound({ nombre: false, perfil: false });
               }
            } else {
               setIsManualEntryAllowed(true);
               setApiDataFound({ nombre: false, perfil: false });
            }
         } catch (err) {
            console.error("Error consultando la DGII:", err);
            setIsManualEntryAllowed(true);
            setApiDataFound({ nombre: false, perfil: false });
         } finally {
            setIsSearching(false);
         }
      }

      fetchClienteDGII();
   }, [debouncedIdentificacion, values.tipo_identificacion, isIdLengthValid]);

   function handleIdentificacionChange(e: React.ChangeEvent<HTMLInputElement>) {
      const cleanValue = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      set("identificacion", cleanValue);
      setIsManualEntryAllowed(false);
      setApiDataFound({ nombre: false, perfil: false });
      set("nombre", "");
   }

   function handleTelefonoChange(e: React.ChangeEvent<HTMLInputElement>) {
      const cleanValue = e.target.value.replace(/\D/g, "");
      set("telefono", cleanValue);
   }

   function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
      const cleanValue = e.target.value.toLowerCase().trim();
      set("email", cleanValue);
   }

   function validateForm(): boolean {
      setError(null);

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

      if (values.tipo_identificacion === "CEDULA") {
         const validation = GeneralSchemasDTO.CedulaSchema.safeParse(values.identificacion);
         if (!validation.success) {
            setError(validation.error.issues[0].message);
            return false;
         }
      } else if (values.tipo_identificacion === "RNC") {
         const validation = GeneralSchemasDTO.RncSchema.safeParse(values.identificacion);
         if (!validation.success) {
            setError(validation.error.issues[0].message);
            return false;
         }
      } else if (values.tipo_identificacion === "PASAPORTE") {
         const validation = GeneralSchemasDTO.PasaporteSchema.safeParse(values.identificacion);
         if (!validation.success) {
            setError(validation.error.issues[0].message);
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

   const isTipoIdDisabled = isSearching || apiDataFound.perfil;
   const isPerfilDisabled = values.tipo_identificacion === "PASAPORTE" || !isManualEntryAllowed || apiDataFound.perfil;
   const isNombreDisabled = !isManualEntryAllowed || apiDataFound.nombre;
   const areOtherFieldsDisabled = !isManualEntryAllowed;

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="cf-tipo-id">Tipo de Identificación</Label>
               <select
                  id="cf-tipo-id"
                  value={values.tipo_identificacion}
                  onChange={(e) => {
                     const val = e.target.value as keyof typeof TipoIdentificacion;
                     set("tipo_identificacion", val);
                     if (val === "PASAPORTE") set("tipo_cliente", "FISICA");

                     setIsManualEntryAllowed(false);
                     setApiDataFound({ nombre: false, perfil: false });
                  }}
                  className={SELECT_CLASS}
                  required
                  disabled={isTipoIdDisabled}
               >
                  {tipoIdentificacionOptions.map((t) => (
                     <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
               </select>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="cf-tipo-cliente">Perfil de cliente</Label>
               <select
                  id="cf-tipo-cliente"
                  value={values.tipo_cliente}
                  onChange={(e) => set("tipo_cliente", e.target.value as keyof typeof TipoCliente)}
                  className={SELECT_CLASS}
                  required
                  disabled={isPerfilDisabled}
               >
                  {tipoClienteOptions.map((t) => (
                     <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
               </select>
            </div>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-identificacion">Identificación *</Label>
            <div className="relative">
               <Input
                  id="cf-identificacion"
                  value={values.identificacion}
                  onChange={handleIdentificacionChange}
                  placeholder={
                     values.tipo_identificacion === "CEDULA" ? "Ej: 40212345678" :
                        values.tipo_identificacion === "RNC" ? "Ej: 130123456" : "Ej: RD1234567"
                  }
                  required
                  className={isSearching ? `pr-10 ${INPUT_DISABLED_CLASS}` : INPUT_DISABLED_CLASS}
               />
               {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                     <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
               )}
            </div>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-nombre">Nombre *</Label>
            <Input
               id="cf-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Nombre completo o Razón Social"
               required
               disabled={isNombreDisabled}
               className={INPUT_DISABLED_CLASS}
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-telefono">Teléfono</Label>
            <Input
               id="cf-telefono"
               type="tel"
               value={values.telefono}
               onChange={handleTelefonoChange}
               placeholder="Ej: 8091234567"
               disabled={areOtherFieldsDisabled}
               className={INPUT_DISABLED_CLASS}
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-email">Email</Label>
            <Input
               id="cf-email"
               type="email"
               value={values.email}
               onChange={handleEmailChange}
               placeholder="Ej: cliente@ejemplo.com"
               disabled={areOtherFieldsDisabled}
               className={INPUT_DISABLED_CLASS}
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-direccion">Dirección</Label>
            <Input
               id="cf-direccion"
               value={values.direccion}
               onChange={(e) => set("direccion", e.target.value)}
               placeholder="Ingresar dirección del cliente"
               disabled={areOtherFieldsDisabled}
               className={INPUT_DISABLED_CLASS}
            />
         </div>

         {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 mt-1 text-sm font-medium text-destructive">
               {error}
            </div>
         )}

         <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
               <Button type="button" variant="outline" onClick={onCancel} disabled={loading || isSearching}>
                  Cancelar
               </Button>
            )}
            <Button type="submit" disabled={loading || isSearching || !isManualEntryAllowed}>
               {loading ? "Guardando…" : submitLabel}
            </Button>
         </div>
      </form>
   );
}