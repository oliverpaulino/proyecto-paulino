"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Employee, CreateEmployeeForm } from "@/dtos/employee.dto";

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

const TIPO_IDENTIFICACION = [
   { value: "CEDULA", label: "Cédula" },
   { value: "RNC", label: "RNC" },
   { value: "PASAPORTE", label: "Pasaporte" },
] as const;

const ROLES = [
   { value: "OPERADOR", label: "Operador" },
   { value: "INGENIERO", label: "Ingeniero" },
   { value: "MECANICO", label: "Mecánico" },
   { value: "CONTABLE", label: "Contable" },
   { value: "MENSAJERO", label: "Mensajero" },
] as const;

interface EmployeeFormProps {
   initialData?: Partial<Employee>;
   onSubmit: (data: CreateEmployeeForm) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

export function EmployeeForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear empleado",
}: EmployeeFormProps) {
   const [values, setValues] = useState<CreateEmployeeForm>({
      nombre: initialData?.nombre ?? "",
      identificacion: initialData?.identificacion ?? "",
      tipo_identificacion: initialData?.tipo_identificacion ?? "CEDULA",
      rol: initialData?.rol ?? "INGENIERO",
      salario: initialData?.salario ?? 0,
      activo: initialData?.activo ?? true,
   });
   const [error, setError] = useState<string | null>(null);

   function set<K extends keyof CreateEmployeeForm>(field: K, value: CreateEmployeeForm[K]) {
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
            <Label htmlFor="ef-nombre">Nombre completo *</Label>
            <Input
               id="ef-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Nombre del empleado"
               required
            />
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-tipo-id">Tipo ID</Label>
               <select
                  id="ef-tipo-id"
                  value={values.tipo_identificacion}
                  onChange={(e) => set("tipo_identificacion", e.target.value as CreateEmployeeForm["tipo_identificacion"])}
                  className={SELECT_CLASS}
                  required
               >
                  {TIPO_IDENTIFICACION.map((t) => (
                     <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
               </select>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-identificacion">Identificación *</Label>
               <Input
                  id="ef-identificacion"
                  value={values.identificacion}
                  onChange={(e) => set("identificacion", e.target.value)}
                  placeholder="001-0000000-0"
                  required
               />
            </div>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-rol">Rol *</Label>
            <select
               id="ef-rol"
               value={values.rol}
               onChange={(e) => set("rol", e.target.value as CreateEmployeeForm["rol"])}
               className={SELECT_CLASS}
               required
            >
               {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
               ))}
            </select>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-salario">Salario (RD$) *</Label>
            <Input
               id="ef-salario"
               type="number"
               min={0}
               step={0.01}
               value={values.salario}
               onChange={(e) => set("salario", Number(e.target.value))}
               placeholder="0.00"
               required
            />
         </div>

         <div className="flex items-center gap-2">
            <input
               id="ef-activo"
               type="checkbox"
               checked={values.activo}
               onChange={(e) => set("activo", e.target.checked)}
               className="rounded border-input"
            />
            <Label htmlFor="ef-activo">Empleado activo</Label>
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
