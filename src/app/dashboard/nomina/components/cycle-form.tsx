"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNominaStore, type FrecuenciaPago } from "@/stores/useNominaStore";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
   // Confirmación para el ciclo mensual corto (no prorratea el sueldo).
   const [confirmarCorto, setConfirmarCorto] = useState(false);

   /** Días que abarca el ciclo (inclusive). */
   const diasCiclo = Math.floor(
      (new Date(fin).getTime() - new Date(inicio).getTime()) / 86_400_000
   ) + 1;

   /*
      Una nómina MENSUAL corta no prorratea: el sueldo se convierte por
      frecuencia (mensual → mes completo), no por días. Un ciclo mensual de
      menos de un mes pagaría el mes entero al personal de salario fijo.
      Se avisa para que quien lo esté creando sepa qué está por pasar.
   */
   const mensualCorto = frecuencia === "MENSUAL" && diasCiclo < 28;

   function cambiarFrecuencia(nueva: FrecuenciaPago) {
      const periodo = periodoActual(nueva);
      setFrecuencia(nueva);
      setInicio(periodo.inicio);
      setFin(periodo.fin);
      if (!nombreEditado) setNombre(periodo.nombre);
   }

   async function crear() {
      const creado = await CreateCycle({
         nombre,
         frecuencia,
         fecha_inicio: inicio,
         fecha_fin: fin,
      } as any);
      if (creado) onDone?.();
      else setError("No se pudo crear el ciclo.");
   }

   async function submit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!nombre.trim()) return setError("El nombre es obligatorio.");
      if (new Date(fin) < new Date(inicio))
         return setError("La fecha final no puede ser anterior a la inicial.");

      if (mensualCorto) {
         setConfirmarCorto(true);
         return;
      }

      await crear();
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

         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
               <Label>Desde *</Label>
               <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
               <Label>Hasta *</Label>
               <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} required />
            </div>
         </div>

         {mensualCorto && (
            <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
               Este ciclo mensual abarca solo {diasCiclo} día{diasCiclo === 1 ? "" : "s"}. El
               personal de salario fijo cobrará el mes completo (el sueldo se prorratea por
               frecuencia, no por días), no la parte proporcional.
            </div>
         )}

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

         <ConfirmDialog
            open={confirmarCorto}
            onOpenChange={setConfirmarCorto}
            title="¿Crear un ciclo mensual corto?"
            description={`Este ciclo mensual abarca solo ${diasCiclo} día${
               diasCiclo === 1 ? "" : "s"
            }. El sueldo se prorratea por frecuencia, no por días: el personal de salario fijo cobrará el mes completo, no la parte proporcional al período.`}
            confirmLabel="Crear de todas formas"
            onConfirm={async () => {
               setConfirmarCorto(false);
               await crear();
            }}
         />
      </form>
   );
}
