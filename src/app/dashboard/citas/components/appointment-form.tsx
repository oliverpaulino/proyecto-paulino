"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Appointment, CreateAppointmentForm } from "@/dtos/appointment.dto";
import { EstadoCita } from "@/dtos/appointment.dto";
import { SelectBuscadorClient } from "@/components/shared/selectBuscadorClient";
import { SelectBuscadorEmployee } from "@/components/shared/selectBuscadorEmployee";
import { useClientStore } from "@/stores/useClientStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

const estadoOptions = Object.entries(EstadoCita).map(([key, value]) => ({
   value: key as keyof typeof EstadoCita,
   label: value,
}));

interface AppointmentFormProps {
   initialData?: Partial<Appointment>;
   onSubmit: (data: CreateAppointmentForm) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

export function AppointmentForm({
   initialData,
   onSubmit,
   onCancel,
   loading = false,
   submitLabel,
}: AppointmentFormProps) {
   const { GetClient } = useClientStore();
   const { GetEmployeeDetails } = useEmployeeStore();

   const [nombreCliente, setNombreCliente] = useState("");
   const [nombreEmpleado, setNombreEmpleado] = useState("");
   const [error, setError] = useState<string | null>(null);

   const [values, setValues] = useState<CreateAppointmentForm>({
      cliente_id: initialData?.cliente_id ?? "",
      employee_id: initialData?.employee_id ?? "",
      fecha: initialData?.fecha ? new Date(initialData.fecha) : new Date(Date.now() + 30 * 60 * 1000),
      motivo: initialData?.motivo ?? "",
      estado: initialData?.estado ?? "PENDIENTE",
      notas: initialData?.notas ?? "",
   });

// Cargar nombres si estamos editando y no tenemos el objeto completo
   useEffect(() => {
      async function loadInitialData() {
         if (initialData?.cliente_id && !nombreCliente) {
            const data = await GetClient(initialData.cliente_id, false);
            const nombreReal = data?.nombre;
            setNombreCliente(nombreReal ?? "Cliente no encontrado");
         }
         
         if (initialData?.employee_id && !nombreEmpleado) {
            const data = await GetEmployeeDetails(initialData.employee_id, false);
            const nombreEmpReal = data?.empleado?.nombre;
            setNombreEmpleado(nombreEmpReal ?? "Empleado no encontrado");
         }
      }
      loadInitialData();
   }, [initialData, GetClient, GetEmployeeDetails, nombreCliente, nombreEmpleado]);

   const computedSubmitLabel = submitLabel ?? (initialData?.id ? "Guardar cambios" : "Crear cita");

   function set<K extends keyof CreateAppointmentForm>(field: K, value: CreateAppointmentForm[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
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
            cliente_id: values.cliente_id?.trim() === "" ? null : values.cliente_id,
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
         <div className="flex flex-col gap-1.5">
            <Label>Cliente</Label>
            <SelectBuscadorClient
               value={values.cliente_id}
               initialLabel={nombreCliente}
               onChange={(id) => set("cliente_id", id ?? "")}
               disabled={loading}
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Empleado</Label>
            <SelectBuscadorEmployee
               value={values.employee_id}
               initialLabel={nombreEmpleado}
               onChange={(id) => set("employee_id", id ?? "")}
               disabled={loading}
            />
         </div>

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

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="af-motivo">Motivo de la cita *</Label>
            <textarea
               id="af-motivo"
               rows={3}
               value={values.motivo as any}
               onChange={(e) => set("motivo", e.target.value)}
               placeholder="Ej: Revisión técnica..."
               required
               className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-colors"
            />
         </div>

         {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
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
               {loading ? "Guardando…" : computedSubmitLabel}
            </Button>
         </div>
      </form>
   );
}