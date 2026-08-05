"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Loader2 } from "lucide-react";
import type { Employee, CreateEmployeeForm, Operator } from "@/dtos/employee.dto";

import {
   GeneralSchemasDTO
} from "@/dtos/schema.dto";

import {
   TipoIdentificacionEmpleado,
   TipoRolEmpleado,
} from "@/dtos/employee.dto";


const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

const tipoIdentificacionOptions = Object.entries(TipoIdentificacionEmpleado).map(([key, value]) => ({
   value: key as keyof typeof TipoIdentificacionEmpleado,
   label: value,
}));

const rolesOptions = Object.entries(TipoRolEmpleado).map(([key, value]) => ({
   value: key as keyof typeof TipoRolEmpleado,
   label: value,
}));

// Las mismas tres frecuencias que acepta `payroll_cycles.frecuencia` (migración
// 007). El salario del empleado está expresado en SU frecuencia y la nómina lo
// prorratea a la del ciclo, así que un valor equivocado aquí paga de más o de
// menos.
const frecuenciaPagoOptions = [
   { value: "SEMANAL", label: "Semanal" },
   { value: "QUINCENAL", label: "Quincenal" },
   { value: "MENSUAL", label: "Mensual" },
];

export type OperadorFormData = {
   licencia: string;
   fecha_vencimiento: string;
};

interface EmployeeFormProps {
   initialData?: Partial<Employee>;
   existingOperador?: Operator | null;
   onSubmit: (data: CreateEmployeeForm, operadorData?: OperadorFormData) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

export function EmployeeForm({
   initialData,
   existingOperador,
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
      frecuencia_pago: initialData?.frecuencia_pago ?? "QUINCENAL",
      salario: initialData?.salario ?? 0,
      aplica_retenciones: initialData?.aplica_retenciones ?? false,
      activo: initialData?.activo ?? true,
   });

   const [operadorData, setOperadorData] = useState<OperadorFormData>({
      licencia: existingOperador?.licencia ?? "",
      fecha_vencimiento: existingOperador?.fecha_vencimiento
         ? new Date(existingOperador.fecha_vencimiento).toISOString().split("T")[0]
         : "",
   });

   const [error, setError] = useState<string | null>(null);
   const [loadingOp, setLoadingOp] = useState(false);

   const hasFetchedOp = useRef(existingOperador !== undefined);

   const isOperador = values.rol === "OPERADOR";

   useEffect(() => {
      if (existingOperador) {
         setOperadorData({
            licencia: existingOperador.licencia ?? "",
            fecha_vencimiento: existingOperador.fecha_vencimiento
               ? new Date(existingOperador.fecha_vencimiento).toISOString().split("T")[0]
               : "",
         });
         hasFetchedOp.current = true;
      }
   }, [existingOperador]);

   useEffect(() => {
      if (isOperador && initialData?.id && !hasFetchedOp.current) {
         hasFetchedOp.current = true;
         setLoadingOp(true);

         fetch(`/api/employees/${initialData.id}/operator`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
               if (data) {
                  setOperadorData({
                     licencia: data.licencia ?? "",
                     fecha_vencimiento: data.fecha_vencimiento
                        ? new Date(data.fecha_vencimiento).toISOString().split("T")[0]
                        : "",
                  });
               }
            })
            .catch((err) => {
               console.error(err);
               hasFetchedOp.current = false;
            })
            .finally(() => setLoadingOp(false));
      }
   }, [isOperador, initialData?.id]);

   function set<K extends keyof CreateEmployeeForm>(field: K, value: CreateEmployeeForm[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   function setOp(field: keyof OperadorFormData, value: string) {
      setOperadorData((prev) => ({ ...prev, [field]: value }));
   }

   function handleIdentificacionChange(e: React.ChangeEvent<HTMLInputElement>) {
      const cleanValue = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      set("identificacion", cleanValue);
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);

      if (values.tipo_identificacion === "CEDULA") {
         const validation = GeneralSchemasDTO.CedulaSchema.safeParse(values.identificacion);
         if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
         }
      } else if (values.tipo_identificacion === "PASAPORTE") {
         const validation = GeneralSchemasDTO.PasaporteSchema.safeParse(values.identificacion);
         if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
         }
      }

      try {
         await onSubmit(values, isOperador ? operadorData : undefined);
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
                  {/* Options generadas desde el schema */}
                  {tipoIdentificacionOptions.map((t) => (
                     <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
               </select>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-identificacion">Identificación *</Label>
               <Input
                  id="ef-identificacion"
                  value={values.identificacion}
                  onChange={handleIdentificacionChange}
                  placeholder={values.tipo_identificacion === "CEDULA" ? "Ej: 40212345678" : "Ej: RD1234567"}
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
               {/* Options generadas desde el schema */}
               {rolesOptions.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
               ))}
            </select>
         </div>

         {isOperador && (
            <div className="flex flex-col gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3 relative">
               <div className="flex items-center gap-2 text-sm font-medium text-brand-blue dark:text-blue-400">
                  <Truck className="size-4" />
                  Datos de operador

                  {loadingOp && <Loader2 className="size-3 animate-spin ml-2 text-muted-foreground" />}
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ef-licencia">Número de licencia</Label>
                  <Input
                     id="ef-licencia"
                     value={operadorData.licencia}
                     onChange={(e) => setOp("licencia", e.target.value)}
                     placeholder="Ej: A-0000000"
                     disabled={loadingOp}
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ef-vencimiento">Fecha de vencimiento</Label>
                  <Input
                     id="ef-vencimiento"
                     type="date"
                     value={operadorData.fecha_vencimiento}
                     onChange={(e) => setOp("fecha_vencimiento", e.target.value)}
                     disabled={loadingOp}
                  />
               </div>
            </div>
         )}

         <div className="grid grid-cols-2 gap-3">
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

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-frecuencia">Frecuencia de pago *</Label>
               <select
                  id="ef-frecuencia"
                  value={values.frecuencia_pago}
                  onChange={(e) => set("frecuencia_pago", e.target.value)}
                  className={SELECT_CLASS}
                  required
               >
                  {frecuenciaPagoOptions.map((f) => (
                     <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
               </select>
            </div>
         </div>

         <p className="text-xs text-muted-foreground -mt-1">
            El salario se interpreta según esta frecuencia y se prorratea al período
            del ciclo de nómina.
         </p>

         {/*
            Apagado por defecto: muchos choferes cobran su producción completa
            sin estar en planilla formal, así que activarlo BAJA lo que la
            persona recibe. Es una decisión de la empresa, empleado por
            empleado, no algo que deba pasar solo.
         */}
         <div className="flex items-start gap-2">
            <input
               id="ef-retenciones"
               type="checkbox"
               checked={values.aplica_retenciones}
               onChange={(e) => set("aplica_retenciones", e.target.checked)}
               className="mt-1 rounded border-input"
            />
            <div className="flex flex-col">
               <Label htmlFor="ef-retenciones">Aplicar retenciones de ley (TSS e ISR)</Label>
               <span className="text-xs text-muted-foreground">
                  Descuenta AFP (2.87%), SFS (3.04%) e ISR según la escala de la DGII. Al
                  activarlo baja el neto a pagar de este empleado.
               </span>
            </div>
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

         {error && <p className="text-sm font-medium text-destructive">{error}</p>}

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
