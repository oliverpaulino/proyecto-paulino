"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNominaStore, type FrecuenciaPago } from "@/stores/useNominaStore";

const INPUT_CLASS =
   "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px]";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const iso = (d: Date) =>
   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Rango por defecto del período en curso según la frecuencia:
 * semanal = lunes a domingo de esta semana, quincenal = 1-15 o 16-fin de mes,
 * mensual = mes completo.
 */
function periodoActual(frecuencia: FrecuenciaPago, referencia = new Date()) {
   const y = referencia.getFullYear();
   const m = referencia.getMonth();

   if (frecuencia === "SEMANAL") {
      // getDay(): 0 = domingo, por eso el domingo retrocede 6 días y no 0.
      const diaSemana = referencia.getDay();
      const inicio = new Date(y, m, referencia.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
      const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
      return {
         inicio: iso(inicio),
         fin: iso(fin),
         nombre: `Semana ${iso(inicio)} al ${iso(fin)}`,
      };
   }

   if (frecuencia === "MENSUAL") {
      return {
         inicio: iso(new Date(y, m, 1)),
         fin: iso(new Date(y, m + 1, 0)),
         nombre: `${MESES[m]} ${y}`,
      };
   }

   const primera = referencia.getDate() <= 15;
   return {
      inicio: iso(new Date(y, m, primera ? 1 : 16)),
      fin: iso(primera ? new Date(y, m, 15) : new Date(y, m + 1, 0)),
      nombre: `Quincena ${primera ? 1 : 2} - ${MESES[m]} ${y}`,
   };
}

export function CycleForm({ onDone }: { onDone?: () => void }) {
   const { CreateCycle, loading } = useNominaStore();
   const [sugerido] = useState(() => periodoActual("QUINCENAL"));

   const [nombre, setNombre] = useState(sugerido.nombre);
   const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>("QUINCENAL");
   const [inicio, setInicio] = useState(sugerido.inicio);
   const [fin, setFin] = useState(sugerido.fin);
   const [error, setError] = useState<string | null>(null);
   // Si el usuario escribe su propio nombre, la frecuencia ya no lo sobrescribe.
   const [nombreEditado, setNombreEditado] = useState(false);

   function cambiarFrecuencia(nueva: FrecuenciaPago) {
      const periodo = periodoActual(nueva);
      setFrecuencia(nueva);
      setInicio(periodo.inicio);
      setFin(periodo.fin);
      if (!nombreEditado) setNombre(periodo.nombre);
   }

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
            <Input
               value={nombre}
               onChange={(e) => {
                  setNombre(e.target.value);
                  setNombreEditado(true);
               }}
               required
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Frecuencia *</Label>
            <select
               className={INPUT_CLASS}
               value={frecuencia}
               onChange={(e) => cambiarFrecuencia(e.target.value as FrecuenciaPago)}
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
