"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNominaStore, type FrecuenciaPago } from "@/stores/useNominaStore";

const INPUT_CLASS =
   "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px]";

/** Rango por defecto: la quincena en curso (1-15 o 16-fin de mes). */
function quincenaActual() {
   const hoy = new Date();
   const y = hoy.getFullYear();
   const m = hoy.getMonth();
   const primera = hoy.getDate() <= 15;
   const inicio = new Date(y, m, primera ? 1 : 16);
   const fin = primera ? new Date(y, m, 15) : new Date(y, m + 1, 0);
   const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
   const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
   return {
      inicio: iso(inicio),
      fin: iso(fin),
      nombre: `Quincena ${primera ? 1 : 2} - ${meses[m]} ${y}`,
   };
}

export function CycleForm({ onDone }: { onDone?: () => void }) {
   const { CreateCycle, loading } = useNominaStore();
   const sugerido = quincenaActual();

   const [nombre, setNombre] = useState(sugerido.nombre);
   const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>("QUINCENAL");
   const [inicio, setInicio] = useState(sugerido.inicio);
   const [fin, setFin] = useState(sugerido.fin);
   const [error, setError] = useState<string | null>(null);

   async function submit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!nombre.trim()) return setError("El nombre es obligatorio.");
      if (new Date(fin) < new Date(inicio))
         return setError("La fecha final no puede ser anterior a la inicial.");

      const creado = await CreateCycle({
         nombre,
         frecuencia,
         fecha_inicio: inicio,
         fecha_fin: fin,
      } as any);
      if (creado) onDone?.();
      else setError("No se pudo crear el ciclo.");
   }

   return (
      <form onSubmit={submit} className="flex flex-col gap-4">
         <div className="flex flex-col gap-1.5">
            <Label>Nombre del ciclo *</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Frecuencia *</Label>
            <select
               className={INPUT_CLASS}
               value={frecuencia}
               onChange={(e) => setFrecuencia(e.target.value as FrecuenciaPago)}
            >
               <option value="SEMANAL">Semanal</option>
               <option value="QUINCENAL">Quincenal</option>
               <option value="MENSUAL">Mensual</option>
            </select>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
               <Label>Desde *</Label>
               <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
               <Label>Hasta *</Label>
               <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} required />
            </div>
         </div>

         {error && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
               {error}
            </div>
         )}

         <div className="flex justify-end gap-2 border-t pt-4">
            {onDone && (
               <Button type="button" variant="outline" onClick={onDone} disabled={loading}>
                  Cancelar
               </Button>
            )}
            <Button type="submit" disabled={loading}>
               {loading ? "Creando..." : "Crear ciclo"}
            </Button>
         </div>
      </form>
   );
}
