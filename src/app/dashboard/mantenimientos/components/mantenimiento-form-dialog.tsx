"use client";

import { useEffect, useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wrench } from "lucide-react";
import {
   TIPOS_MANTENIMIENTO,
   TIPO_MANTENIMIENTO_LABEL,
   type CreateMantenimientoForm,
   type TipoMantenimiento,
} from "@/dtos/mantenimiento.dto";
import { useEquipoStore } from "@/stores/useEquipoStore";

const SELECT_CLASS =
   "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

function todayISO(): string {
   const d = new Date();
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
   ).padStart(2, "0")}`;
}

export function MantenimientoFormDialog({
   open,
   onOpenChange,
   onSubmit,
   loading = false,
   error = null,
   /** Fijo cuando se abre desde el detalle de un equipo. */
   equipoId,
   equipoNombre,
   title = "Registrar mantenimiento",
   description = "Abre un registro de mantenimiento para este equipo.",
   submitLabel = "Registrar",
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSubmit: (data: CreateMantenimientoForm) => Promise<void> | void;
   loading?: boolean;
   error?: string | null;
   equipoId?: string;
   equipoNombre?: string;
   title?: string;
   description?: string;
   submitLabel?: string;
}) {
   const { Equipos, GetEquipos } = useEquipoStore();

   const [selectedEquipo, setSelectedEquipo] = useState(equipoId ?? "");
   const [tipo, setTipo] = useState<TipoMantenimiento>("CORRECTIVO");
   const [descripcion, setDescripcion] = useState("");
   const [taller, setTaller] = useState("");
   const [fechaInicio, setFechaInicio] = useState(todayISO());
   const [localError, setLocalError] = useState<string | null>(null);

   useEffect(() => {
      if (!open) return;
      setSelectedEquipo(equipoId ?? "");
      setTipo("CORRECTIVO");
      setDescripcion("");
      setTaller("");
      setFechaInicio(todayISO());
      setLocalError(null);
   }, [open, equipoId]);

   // Solo hace falta la lista cuando el equipo no viene fijado desde el detalle.
   useEffect(() => {
      if (!open || equipoId) return;
      GetEquipos({ limit: 200 }).catch(() => { });
   }, [open, equipoId, GetEquipos]);

   async function handleSubmit() {
      setLocalError(null);

      if (!selectedEquipo) {
         setLocalError("Selecciona el equipo.");
         return;
      }
      if (!descripcion.trim()) {
         setLocalError("Describe el mantenimiento.");
         return;
      }

      await onSubmit({
         equipo_id: selectedEquipo,
         tipo,
         descripcion: descripcion.trim(),
         taller: taller.trim() || null,
         fecha_inicio: fechaInicio,
      });
   }

   const shownError = error ?? localError;

   return (
      <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <Wrench className="size-5 text-brand-blue" />
                  {title}
               </DialogTitle>
               <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
               {equipoId ? (
                  equipoNombre && (
                     <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <span className="text-muted-foreground">Equipo: </span>
                        <span className="font-medium">{equipoNombre}</span>
                     </div>
                  )
               ) : (
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="equipo">
                        Equipo <span className="text-destructive">*</span>
                     </Label>
                     <select
                        id="equipo"
                        className={SELECT_CLASS}
                        value={selectedEquipo}
                        onChange={(e) => setSelectedEquipo(e.target.value)}
                        disabled={loading}
                     >
                        <option value="">Selecciona un equipo…</option>
                        {Equipos.map((eq) => (
                           <option key={eq.id} value={eq.id}>
                              {eq.codigoReferencia} · {eq.nombre}
                              {eq.placa ? ` (${eq.placa})` : ""}
                           </option>
                        ))}
                     </select>
                  </div>
               )}

               <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="tipo">Tipo</Label>
                     <select
                        id="tipo"
                        className={SELECT_CLASS}
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as TipoMantenimiento)}
                        disabled={loading}
                     >
                        {TIPOS_MANTENIMIENTO.map((t) => (
                           <option key={t} value={t}>
                              {TIPO_MANTENIMIENTO_LABEL[t]}
                           </option>
                        ))}
                     </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="fecha-inicio">Fecha de inicio</Label>
                     <Input
                        id="fecha-inicio"
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        disabled={loading}
                     />
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="descripcion">
                     Descripción <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                     id="descripcion"
                     value={descripcion}
                     onChange={(e) => setDescripcion(e.target.value)}
                     placeholder="Ej: Cambio de aceite y revisión de frenos."
                     rows={3}
                     disabled={loading}
                  />
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="taller">Taller / responsable</Label>
                  <Input
                     id="taller"
                     value={taller}
                     onChange={(e) => setTaller(e.target.value)}
                     placeholder="Ej: Taller Rodríguez"
                     disabled={loading}
                  />
               </div>

               {shownError && <p className="text-sm text-destructive">{shownError}</p>}
            </div>

            <DialogFooter>
               <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
               </Button>
               <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {submitLabel}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
