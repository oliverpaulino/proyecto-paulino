"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   ESTADOS_EQUIPO,
   TIPOS_EQUIPO,
   type Equipo,
   type EstadoEquipo,
   type TipoEquipo,
} from "@/dtos/equipo.dto";
import { ESTADO_LABEL, TIPO_LABEL } from "./equipo-labels";

export interface EquipoFormValues {
   nombre: string;
   tipo: TipoEquipo;
   estado: EstadoEquipo;
   costo_por_hora: string;
   placa: string;
   modelo: string;
   ano: string;
}

interface EquipoFormProps {
   initialData?: Partial<Equipo>;
   onSubmit: (data: EquipoFormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

export function EquipoForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear equipo",
}: EquipoFormProps) {
   const [values, setValues] = useState<EquipoFormValues>({
      nombre: initialData?.nombre ?? "",
      tipo: initialData?.tipo ?? TIPOS_EQUIPO[0],
      estado: initialData?.estado ?? "ACTIVO",
      costo_por_hora: initialData?.costo_por_hora != null ? String(initialData.costo_por_hora) : "0",
      placa: initialData?.placa ?? "",
      modelo: initialData?.modelo ?? "",
      ano: initialData?.ano != null ? String(initialData.ano) : "",
   });
   const [error, setError] = useState<string | null>(null);

   function set<K extends keyof EquipoFormValues>(field: K, value: EquipoFormValues[K]) {
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
            <Label htmlFor="ef-nombre">Nombre *</Label>
            <Input
               id="ef-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="ej. Excavadora CAT 320"
               required
            />
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-tipo">Tipo *</Label>
               <select
                  id="ef-tipo"
                  value={values.tipo}
                  onChange={(e) => set("tipo", e.target.value as TipoEquipo)}
                  className={SELECT_CLASS}
                  required
               >
                  {TIPOS_EQUIPO.map((t) => (
                     <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                  ))}
               </select>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-estado">Estado</Label>
               <select
                  id="ef-estado"
                  value={values.estado}
                  onChange={(e) => set("estado", e.target.value as EstadoEquipo)}
                  className={SELECT_CLASS}
               >
                  {ESTADOS_EQUIPO.map((s) => (
                     <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
                  ))}
               </select>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-costo">Costo por hora (RD$)</Label>
               <Input
                  id="ef-costo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.costo_por_hora}
                  onChange={(e) => set("costo_por_hora", e.target.value)}
                  placeholder="0"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-ano">Año</Label>
               <Input
                  id="ef-ano"
                  type="number"
                  min="1950"
                  step="1"
                  value={values.ano}
                  onChange={(e) => set("ano", e.target.value)}
                  placeholder="ej. 2020"
               />
            </div>
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-placa">Placa</Label>
               <Input
                  id="ef-placa"
                  value={values.placa}
                  onChange={(e) => set("placa", e.target.value)}
                  placeholder="ej. EX-1023"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-modelo">Modelo</Label>
               <Input
                  id="ef-modelo"
                  value={values.modelo}
                  onChange={(e) => set("modelo", e.target.value)}
                  placeholder="ej. CAT 320"
               />
            </div>
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
