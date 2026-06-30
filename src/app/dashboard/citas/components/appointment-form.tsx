"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

import type { Appointment, CreateAppointmentForm } from "@/dtos/appointment.dto";
import { EstadoCita } from "@/dtos/appointment.dto";
import type { Client } from "@/dtos/client.dto";
import type { Employee } from "@/dtos/employee.dto";

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

const estadoOptions = Object.entries(EstadoCita).map(([key, value]) => ({
   value: key as keyof typeof EstadoCita,
   label: value,
}));

export type ClienteFormData = {
   cliente_nombre: string;
 };

export type EmpleadoFormData = {
   empleado_nombre: string;
};

interface AppointmentFormProps {
   initialData?: Partial<Appointment>;
   existingClient?: Client | null;
   existingEmployee?: Employee | null;
   onSubmit: (data: CreateAppointmentForm) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

export function AppointmentForm({
   initialData,
   existingClient,
   existingEmployee,
   onSubmit,
   onCancel,
   loading = false,
   submitLabel,
}: AppointmentFormProps) {
   const computedSubmitLabel = submitLabel ?? (initialData?.id ? "Guardar cambios" : "Crear cita");

   const [values, setValues] = useState<CreateAppointmentForm>({
      cliente_id: initialData?.cliente_id ?? "",
      employee_id: initialData?.employee_id ?? "",
      fecha: initialData?.fecha ? new Date(initialData.fecha) : new Date(Date.now() + 30 * 60 * 1000),
      motivo: initialData?.motivo ?? "",
      estado: initialData?.estado ?? "EN_REVISION",
      notas: initialData?.notas ?? "",
   });

   const [clienteData, setClienteData] = useState<ClienteFormData>({
      cliente_nombre: existingClient?.nombre ?? "",
   });

   const [empleadoData, setEmpleadoData] = useState<EmpleadoFormData>({
      empleado_nombre: existingEmployee?.nombre ?? "",
   });

   const [error, setError] = useState<string | null>(null);
   const [loadingClient, setLoadingClient] = useState(false);
   const [loadingEmployee, setLoadingEmployee] = useState(false);

   const hasFetchedClient = useRef(existingClient !== undefined);
   const hasFetchedEmployee = useRef(existingEmployee !== undefined);

   const debouncedClientId = useDebounce(values.cliente_id, 600);
   const debouncedEmployeeId = useDebounce(values.employee_id, 600);

   useEffect(() => {
      if (existingClient) {
         setClienteData({ cliente_nombre: existingClient.nombre ?? "" });
         hasFetchedClient.current = true;
      }
   }, [existingClient]);

   useEffect(() => {
      if (existingEmployee) {
         setEmpleadoData({ empleado_nombre: existingEmployee.nombre ?? "" });
         hasFetchedEmployee.current = true;
      }
   }, [existingEmployee]);

   useEffect(() => {
      if (!debouncedClientId || debouncedClientId.trim().length < 2) return;
      if (debouncedClientId === initialData?.cliente_id && hasFetchedClient.current) return;

      hasFetchedClient.current = true;
      setLoadingClient(true);

      fetch(`/api/clients/${debouncedClientId}`)
         .then((res) => (res.ok ? res.json() : null))
         .then((data) => {
            if (data && data.nombre) {
               setClienteData({ cliente_nombre: data.nombre });
            } else {
               setClienteData({ cliente_nombre: "No encontrado" });
            }
         })
         .catch((err) => {
            console.error(err);
            setClienteData({ cliente_nombre: "Error de búsqueda" });
         })
         .finally(() => setLoadingClient(false));
   }, [debouncedClientId, initialData?.cliente_id]);

   useEffect(() => {
      if (!debouncedEmployeeId || debouncedEmployeeId.trim() === "") {
         setEmpleadoData({ empleado_nombre: "" });
         return;
      }
      if (debouncedEmployeeId.trim().length < 2) return;
      if (debouncedEmployeeId === initialData?.employee_id && hasFetchedEmployee.current) return;

      hasFetchedEmployee.current = true;
      setLoadingEmployee(true);

      fetch(`/api/employees/${debouncedEmployeeId}`)
         .then((res) => (res.ok ? res.json() : null))
         .then((data) => {
            if (data && data.nombre) {
               setEmpleadoData({ empleado_nombre: data.nombre });
            } else {
               setEmpleadoData({ empleado_nombre: "No encontrado" });
            }
         })
         .catch((err) => {
            console.error(err);
            setEmpleadoData({ empleado_nombre: "Error de búsqueda" });
         })
         .finally(() => setLoadingEmployee(false));
   }, [debouncedEmployeeId, initialData?.employee_id]);

   function set<K extends keyof CreateAppointmentForm>(field: K, value: CreateAppointmentForm[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   function handleClienteIdChange(e: React.ChangeEvent<HTMLInputElement>) {
      const nuevoId = e.target.value;
      set("cliente_id", nuevoId);
      setClienteData({ cliente_nombre: "" });
      hasFetchedClient.current = false;
   }

   function handleEmployeeIdChange(e: React.ChangeEvent<HTMLInputElement>) {
      const nuevoId = e.target.value;
      set("employee_id", nuevoId);
      setEmpleadoData({ empleado_nombre: "" });
      hasFetchedEmployee.current = false;
   }

   const formatDateForInput = (date?: Date) => {
      if (!date || isNaN(date.getTime())) return "";
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
   };

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);

      try {
         const payloadPurificado = {
            ...values,
            employee_id: values.employee_id?.trim() === "" ? null : values.employee_id,
            motivo: values.motivo?.trim() === "" ? null : values.motivo,
            notas: values.notas?.trim() === "" ? null : values.notas,
         };

         await onSubmit(payloadPurificado as any);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
         
         {/* --- SECCIÓN CLIENTE --- */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="af-cliente-id">ID del Cliente *</Label>
               <div className="relative">
                  <Input
                     id="af-cliente-id"
                     value={values.cliente_id}
                     onChange={handleClienteIdChange}
                     placeholder="Ej: CLI-001"
                     required
                     className={loadingClient ? "pr-10" : ""}
                  />
                  {loadingClient && (
                     <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                     </div>
                  )}
               </div>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="af-cliente-nombre">Información del cliente</Label>
               <Input
                  id="af-cliente-nombre"
                  value={clienteData.cliente_nombre}
                  placeholder={loadingClient ? "Buscando..." : "Nombre del cliente"}
                  disabled
                  className="disabled:bg-muted disabled:opacity-70 font-medium select-none"
               />
            </div>
         </div>

         {/* --- SECCIÓN EMPLEADO --- */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="af-empleado-id">ID del Empleado</Label>
               <div className="relative">
                  <Input
                     id="af-empleado-id"
                     value={values.employee_id as any}
                     onChange={handleEmployeeIdChange}
                     placeholder="Ej: EMP-004"
                     className={loadingEmployee ? "pr-10" : ""}
                  />
                  {loadingEmployee && (
                     <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                     </div>
                  )}
               </div>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="af-empleado-nombre">Informacion del empleado</Label>
               <Input
                  id="af-empleado-nombre"
                  value={empleadoData.empleado_nombre}
                  placeholder={loadingEmployee ? "Buscando..." : "Nombre del empleado"}
                  disabled
                  className="disabled:bg-muted disabled:opacity-70 font-medium select-none"
               />
            </div>
         </div>

         {/* --- FECHA Y ESTADO --- */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="af-fecha">Fecha y hora *</Label>
               <Input
                  id="af-fecha"
                  type="datetime-local"
                  value={formatDateForInput(values.fecha)}
                  onChange={(e) => {
                     const d = new Date(e.target.value);
                     if (!isNaN(d.getTime())) set("fecha", d);
                  }}
                  required
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="af-estado">Estado de la cita *</Label>
               <select
                  id="af-estado"
                  value={values.estado}
                  onChange={(e) => set("estado", e.target.value as CreateAppointmentForm["estado"])}
                  className={SELECT_CLASS}
                  required
               >
                  {estadoOptions.map((est) => (
                     <option key={est.value} value={est.value}>
                        {est.label}
                     </option>
                  ))}
               </select>
            </div>
         </div>

         {/* --- MOTIVO --- */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="af-motivo">Motivo de la cita *</Label>
            <textarea
               id="af-notas"
               rows={3}
               value={values.motivo as any}
               onChange={(e) => set("notas", e.target.value)}
               placeholder="Ej: Revisión técnica, consulta inicial..."
               required
               className="flex min-h-[80px] w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            />
         </div>

         {/* --- NOTAS --- */}
         <div className="flex flex-col gap-1.5 hidden">
            <Label htmlFor="af-notas">Notas o instrucciones</Label>
            <textarea
               id="af-notas"
               rows={3}
               value={values.notas as any}
               onChange={(e) => set("notas", e.target.value)}
               placeholder="Detalles adicionales opcionales..."
               className="flex min-h-[80px] w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            />
         </div>

         {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
               {error}
            </div>
         )}

         <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
               <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel} 
                  disabled={loading || loadingClient || loadingEmployee}
               >
                  Cancelar
               </Button>
            )}
            <Button 
               type="submit" 
               disabled={loading || loadingClient || loadingEmployee}
            >
               {loading ? "Guardando…" : computedSubmitLabel}
            </Button>
         </div>
      </form>
   );
}