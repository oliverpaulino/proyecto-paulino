"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Truck, Loader2, Plus } from "lucide-react";
import type { Employee, CreateEmployeeForm, Operator } from "@/dtos/employee.dto";

import {
   GeneralSchemasDTO
} from "@/dtos/schema.dto";

import {
   TipoIdentificacionEmpleado,
} from "@/dtos/employee.dto";

import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { useRolEmpleadoStore } from "@/stores/useRolEmpleadoStore";


const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

const tipoIdentificacionOptions = Object.entries(TipoIdentificacionEmpleado).map(([key, value]) => ({
   value: key as keyof typeof TipoIdentificacionEmpleado,
   label: value,
}));

// Las mismas tres frecuencias que acepta `payroll_cycles.frecuencia` (migración
// 007). El salario del empleado está expresado en SU frecuencia y la nómina lo
// prorratea a la del ciclo, así que un valor equivocado paga de más o de
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
   const { roles: rolesDisponibles, GetRoles } = useRolEmpleadoStore();

   useEffect(() => {
      GetRoles();
   }, [GetRoles]);

   const rolesOptions = rolesDisponibles.map((r) => ({
      value: r.nombre,
      label: r.label,
   }));

   // Determinar si el rol actual es de operador usando la BD
   const esOperadorRol = rolesDisponibles.find(
      (r) => r.nombre === (initialData?.rol ?? "INGENIERO")
   )?.es_operador ?? false;

   const [values, setValues] = useState<CreateEmployeeForm>({
      nombre: initialData?.nombre ?? "",
      identificacion: initialData?.identificacion ?? "",
      tipo_identificacion: initialData?.tipo_identificacion ?? "CEDULA",
      rol: initialData?.rol ?? (rolesOptions[0]?.value as CreateEmployeeForm["rol"] ?? "INGENIERO"),
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

   // Mini dialog para crear rol inline
   const [rolDialogOpen, setRolDialogOpen] = useState(false);
   const [rolFormNombre, setRolFormNombre] = useState("");
   const [rolFormLabel, setRolFormLabel] = useState("");
   const [rolFormEsOperador, setRolFormEsOperador] = useState(false);
   const [rolFormError, setRolFormError] = useState<string | null>(null);
   const [rolFormLoading, setRolFormLoading] = useState(false);
   const { CreateRole } = useRolEmpleadoStore();

   const hasFetchedOp = useRef(existingOperador !== undefined);

   // Determinar si el rol seleccionado es de operador
   const isOperador = rolesDisponibles.find((r) => r.nombre === values.rol)?.es_operador ?? false;

   const { GetOperadorByEmpleadoId } = useEmployeeStore();

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

         GetOperadorByEmpleadoId(initialData.id)
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

   async function handleCreateRol() {
      setRolFormError(null);
      setRolFormLoading(true);
      try {
         const result = await CreateRole({
            nombre: rolFormNombre,
            label: rolFormLabel,
            es_operador: rolFormEsOperador,
            color: "#3b82f6",
         });
         if (result instanceof Error) {
            setRolFormError(result.message);
            return;
         }
         // Refrescar roles y auto-seleccionar el nuevo
         await GetRoles();
         set("rol", rolFormNombre as CreateEmployeeForm["rol"]);
         setRolDialogOpen(false);
         setRolFormNombre("");
         setRolFormLabel("");
         setRolFormEsOperador(false);
      } finally {
         setRolFormLoading(false);
      }
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
      <>
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

         <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
             <div className="flex gap-2">
                <select
                   id="ef-rol"
                   value={values.rol}
                   onChange={(e) => set("rol", e.target.value as CreateEmployeeForm["rol"])}
                   className={SELECT_CLASS}
                   required
                >
                   {rolesOptions.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                   ))}
                </select>
                <Button
                   type="button"
                   variant="outline"
                   size="icon"
                   className="shrink-0 h-9 w-9"
                   title="Crear nuevo rol"
                   onClick={() => {
                      setRolFormNombre("");
                      setRolFormLabel("");
                      setRolFormEsOperador(false);
                      setRolFormError(null);
                      setRolDialogOpen(true);
                   }}
                >
                   <Plus className="size-4" />
                </Button>
             </div>
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

         <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

       {/* ── Mini dialog: Crear rol inline ── */}
       <Dialog open={rolDialogOpen} onOpenChange={setRolDialogOpen}>
          <DialogContent className="sm:max-w-sm">
             <DialogHeader>
                <DialogTitle>Nuevo Rol de Empleado</DialogTitle>
                <DialogDescription>
                   Define un nuevo rol para asignar a los empleados.
                </DialogDescription>
             </DialogHeader>

             <div className="flex flex-col gap-3 py-2">
                <div className="flex flex-col gap-1.5">
                   <Label>Nombre (clave interna) *</Label>
                   <Input
                      value={rolFormNombre}
                      onChange={(e) =>
                         setRolFormNombre(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))
                      }
                      placeholder="Ej: SUPERVISOR"
                      disabled={rolFormLoading}
                      maxLength={32}
                   />
                   <p className="text-xs text-muted-foreground">
                      Uppercase, sin espacios. Se usa internamente.
                   </p>
                </div>

                <div className="flex flex-col gap-1.5">
                   <Label>Etiqueta visible *</Label>
                   <Input
                      value={rolFormLabel}
                      onChange={(e) => setRolFormLabel(e.target.value)}
                      placeholder="Ej: Supervisor"
                      disabled={rolFormLoading}
                   />
                </div>

                <label className="flex items-center gap-2 text-sm">
                   <input
                      type="checkbox"
                      checked={rolFormEsOperador}
                      onChange={(e) => setRolFormEsOperador(e.target.checked)}
                      className="rounded border-input"
                      disabled={rolFormLoading}
                   />
                   <Truck className="size-4 text-muted-foreground" />
                   Este rol es de operador (cobra por producción en nómina)
                </label>
             </div>

             {rolFormError && (
                <p className="text-sm text-destructive">{rolFormError}</p>
             )}

             <DialogFooter>
                <Button
                   variant="outline"
                   onClick={() => setRolDialogOpen(false)}
                   disabled={rolFormLoading}
                >
                   Cancelar
                </Button>
                <Button
                   onClick={handleCreateRol}
                   disabled={rolFormLoading || !rolFormNombre || !rolFormLabel}
                >
                   {rolFormLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                   Crear y seleccionar
                </Button>
             </DialogFooter>
          </DialogContent>
       </Dialog>
      </>
   );
}
