"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ESTADOS_TAREA, ESTADO_TAREA_LABEL } from "@/dtos/tarea.dto";
import type { Tarea, EstadoTarea, TareaForm as TareaFormData } from "@/dtos/tarea.dto";
import { useTareaStore } from "@/stores/useTareaStore";
import { cn } from "@/lib/utils";

/** Format a Date | string | null into the yyyy-MM-dd value an <input type="date"> expects. */
function toDateInput(value: Date | string | null | undefined): string {
   if (!value) return "";
   const d = value instanceof Date ? value : new Date(value);
   if (Number.isNaN(d.getTime())) return "";
   return d.toISOString().slice(0, 10);
}

interface TareaFormProps {
   /** When editing, the existing tarea. When creating, omit. */
   tarea?: Tarea;
   /** Preselected proyecto (locks the project picker on create). */
   proyectoId?: string;
   /** Default estado for new tareas (e.g. the column the user clicked "+"). */
   defaultEstado?: EstadoTarea;
   onClose?: () => void;
}

export function TareaForm({ tarea, proyectoId, defaultEstado, onClose }: TareaFormProps) {
   const { proyectos, CreateTarea, UpdateTarea } = useTareaStore();
   const isEdit = Boolean(tarea);

   const [nombre, setNombre] = useState(tarea?.nombre ?? "");
   const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? "");
   const [estado, setEstado] = useState<EstadoTarea>(
      tarea?.estado ?? defaultEstado ?? "PENDIENTE",
   );
   const [selectedProyecto, setSelectedProyecto] = useState(
      tarea?.proyecto_id ?? proyectoId ?? "",
   );
   const [fechaInicio, setFechaInicio] = useState(toDateInput(tarea?.fecha_inicio));
   const [fechaFin, setFechaFin] = useState(toDateInput(tarea?.fecha_fin));
   const [saving, setSaving] = useState(false);

   const showProyectoPicker = !isEdit && !proyectoId;

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!nombre.trim()) {
         toast.error("El nombre de la tarea es requerido");
         return;
      }
      if (!isEdit && !selectedProyecto) {
         toast.error("Selecciona un proyecto");
         return;
      }
      if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
         toast.error("La fecha de inicio no puede ser posterior a la fecha de fin");
         return;
      }

      setSaving(true);
      try {
         if (isEdit && tarea) {
            const result = await UpdateTarea(tarea.id, {
               nombre: nombre.trim(),
               descripcion: descripcion.trim() || null,
               estado,
               fecha_inicio: fechaInicio ? new Date(fechaInicio) : null,
               fecha_fin: fechaFin ? new Date(fechaFin) : null,
            });
            if (result instanceof Error) {
               toast.error(result.message);
               return;
            }
            toast.success("Tarea actualizada");
         } else {
            const payload: TareaFormData = {
               proyecto_id: selectedProyecto,
               nombre: nombre.trim(),
               descripcion: descripcion.trim() || null,
               estado,
               fecha_inicio: fechaInicio ? new Date(fechaInicio) : null,
               fecha_fin: fechaFin ? new Date(fechaFin) : null,
            };
            const result = await CreateTarea(payload);
            if (result instanceof Error) {
               toast.error(result.message);
               return;
            }
            toast.success("Tarea creada");
         }
         onClose?.();
      } finally {
         setSaving(false);
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
         <div className="flex flex-col gap-2">
            <Label htmlFor="tarea-nombre">Nombre *</Label>
            <Input
               id="tarea-nombre"
               value={nombre}
               onChange={(e) => setNombre(e.target.value)}
               placeholder="Nombre de la tarea"
               autoFocus
            />
         </div>

         {showProyectoPicker && (
            <div className="flex flex-col gap-2">
               <Label>Proyecto *</Label>
               <Select value={selectedProyecto} onValueChange={setSelectedProyecto}>
                  <SelectTrigger>
                     <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                     {proyectos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                           {p.nombre}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>
         )}

         <div className="flex flex-col gap-2">
            <Label htmlFor="tarea-descripcion">Descripción</Label>
            <textarea
               id="tarea-descripcion"
               value={descripcion}
               onChange={(e) => setDescripcion(e.target.value)}
               placeholder="Detalles de la tarea (opcional)"
               rows={3}
               className={cn(
                  "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
               )}
            />
         </div>

         <div className="flex flex-col gap-2">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as EstadoTarea)}>
               <SelectTrigger>
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  {ESTADOS_TAREA.map((e) => (
                     <SelectItem key={e} value={e}>
                        {ESTADO_TAREA_LABEL[e]}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
               <Label htmlFor="tarea-inicio">Fecha de inicio</Label>
               <Input
                  id="tarea-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
               />
            </div>
            <div className="flex flex-col gap-2">
               <Label htmlFor="tarea-fin">Fecha de fin</Label>
               <Input
                  id="tarea-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
               />
            </div>
         </div>

         <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
               Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
               {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear tarea"}
            </Button>
         </div>
      </form>
   );
}
