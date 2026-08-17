"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { CloseMantenimientoForm, Mantenimiento } from "@/dtos/mantenimiento.dto";
import { useCategoriaGastoStore } from "@/stores/useCategoriaGastoStore";
import { useGastoStore } from "@/stores/useGastoStore";
import type { Gasto } from "@/dtos/gastos.dto";

const SELECT_CLASS =
   "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

function todayISO(): string {
   const d = new Date();
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
   ).padStart(2, "0")}`;
}

function formatDate(value: string | Date): string {
   return new Date(value).toLocaleDateString("es-DO");
}

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

/** Cómo se registra el costo: sin costo, gasto nuevo, o enlazar uno existente. */
type ModoGasto = "NINGUNO" | "CREAR";

export function CerrarMantenimientoDialog({
   open,
   onOpenChange,
   mantenimiento,
   onSubmit,
   loading = false,
   error = null,
   /** Texto del botón — cambia según si además se reactiva el equipo. */
   submitLabel = "Cerrar mantenimiento",
   description,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   mantenimiento: Mantenimiento | null;
   onSubmit: (data: CloseMantenimientoForm) => Promise<void> | void;
   loading?: boolean;
   error?: string | null;
   submitLabel?: string;
   description?: string;
}) {
   const { Categorias, GetCategorias } = useCategoriaGastoStore();
   const { Gastos, GetGastos } = useGastoStore();

   const [trabajo, setTrabajo] = useState("");
   const [trabajoManual, setTrabajoManual] = useState(""); // texto extra del usuario
   const [fechaFin, setFechaFin] = useState(todayISO());
   const [costo, setCosto] = useState("");
   const [modoGasto, setModoGasto] = useState<ModoGasto>("NINGUNO");
   const [categoriaGastoId, setCategoriaGastoId] = useState("");
   // Varios gastos por mantenimiento: repuestos, mano de obra, aceite…
   const [gastoIds, setGastoIds] = useState<string[]>([]);
   const [montoGastoNuevo, setMontoGastoNuevo] = useState("");
   const [localError, setLocalError] = useState<string | null>(null);

   // Reconstruir la descripción combinando conceptos de gastos + texto manual
   const reconstruirTrabajo = (ids: string[], manual: string) => {
      const conceptos = ids
         .map((id) => gastosEquipo.find((g) => g.id === id)?.concepto)
         .filter(Boolean) as string[];
      const partes = [...conceptos];
      if (manual.trim()) partes.push(manual.trim());
      setTrabajo(partes.join(". "));
   };

   // Reiniciar el formulario cada vez que se abre para un mantenimiento distinto.
   useEffect(() => {
      if (!open) return;
      setTrabajo("");
      setTrabajoManual("");
      setFechaFin(todayISO());
      setCosto("");
      setModoGasto("NINGUNO");
      setCategoriaGastoId("");
      setGastoIds([]);
      setMontoGastoNuevo("");
      setLocalError(null);
   }, [open, mantenimiento?.id]);

   useEffect(() => {
      if (!open) return;
      GetCategorias({ limit: 100 }).catch(() => { });
   }, [open, GetCategorias]);

   // Los gastos ya registrados de ESTE equipo son los candidatos a enlazar: la
   // lista se muestra siempre, así que se cargan al abrir el diálogo.
   useEffect(() => {
      if (!open || !mantenimiento) return;
      GetGastos({ equipo_id: mantenimiento.equipo_id, limit: 100, force: true }).catch(() => { });
   }, [open, mantenimiento?.equipo_id, GetGastos]);

   const gastosEquipo = useMemo(
      () =>
         (Gastos as Gasto[]).filter(
            (g) => !mantenimiento || g.equipo_id === mantenimiento.equipo_id
         ),
      [Gastos, mantenimiento?.equipo_id]
   );

   const gastosSeleccionados = useMemo(
      () => gastosEquipo.filter((g) => gastoIds.includes(g.id)),
      [gastosEquipo, gastoIds]
   );

   const sumaGastos = useMemo(
      () => gastosSeleccionados.reduce((acc, g) => acc + g.monto_total, 0),
      [gastosSeleccionados]
   );

   const montoNuevoNum = montoGastoNuevo === "" ? 0 : Number(montoGastoNuevo);

   // El costo del mantenimiento es lo realmente gastado: la suma de los gastos
   // enlazados más el que se cree aquí.
   const totalCalculado = sumaGastos + (modoGasto === "CREAR" ? montoNuevoNum : 0);
   const hayGastos = gastoIds.length > 0 || (modoGasto === "CREAR" && montoNuevoNum > 0);

   /**
    * Marcar/desmarcar un gasto. La descripción se reconstruye automáticamente
    * concatenando los conceptos de todos los gastos seleccionados + el texto
    * manual del usuario.
    */
   function toggleGasto(id: string) {
      setGastoIds((prev) => {
         const yaEsta = prev.includes(id);
         const siguiente = yaEsta ? prev.filter((g) => g !== id) : [...prev, id];
         // Reconstruir la descripción con la nueva lista
         reconstruirTrabajo(siguiente, trabajoManual);
         return siguiente;
      });
   }

   const costoNum = costo === "" ? 0 : Number(costo);

   async function handleSubmit() {
      setLocalError(null);

      if (!trabajo.trim()) {
         setLocalError("Debes describir el trabajo realizado.");
         return;
      }
      if (costo !== "" && (Number.isNaN(costoNum) || costoNum < 0)) {
         setLocalError("El costo debe ser un número mayor o igual a 0.");
         return;
      }
      if (mantenimiento && fechaFin && new Date(fechaFin) < new Date(mantenimiento.fecha_inicio)) {
         setLocalError("La fecha de fin no puede ser anterior al inicio del mantenimiento.");
         return;
      }
      if (modoGasto === "CREAR") {
         if (montoNuevoNum <= 0) {
            setLocalError("Indica un monto mayor a 0 para el gasto nuevo.");
            return;
         }
         if (!categoriaGastoId) {
            setLocalError("Selecciona la categoría del gasto.");
            return;
         }
      }
      await onSubmit({
         trabajo_realizado: trabajo.trim(),
         fecha_fin: fechaFin,
         // Con gastos enlazados el costo lo manda el backend (la suma); sin
         // ellos vale lo que se escribió a mano.
         costo: hayGastos ? totalCalculado : costo === "" ? null : costoNum,
         crear_gasto: modoGasto === "CREAR",
         categoria_gasto_id: modoGasto === "CREAR" ? categoriaGastoId : null,
         monto_gasto_nuevo: modoGasto === "CREAR" ? montoNuevoNum : null,
         gasto_ids: gastoIds,
      });
   }

   const shownError = error ?? localError;

   return (
      <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <Wrench className="size-5 text-brand-blue" />
                  Cerrar mantenimiento
               </DialogTitle>
               <DialogDescription>
                  {description ??
                     "Registra qué se hizo antes de devolver el equipo a servicio."}
               </DialogDescription>
            </DialogHeader>

            {mantenimiento && (
               <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{mantenimiento.descripcion}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                     {mantenimiento.codigoReferencia} · Iniciado el{" "}
                     {formatDate(mantenimiento.fecha_inicio)}
                     {mantenimiento.taller ? ` · ${mantenimiento.taller}` : ""}
                  </p>
               </div>
            )}

            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="trabajo-realizado">
                     ¿Qué se hizo? <span className="text-destructive">*</span>
                  </Label>
                  {gastoIds.length > 0 && (
                     <div className="flex flex-wrap gap-1.5">
                        {gastoIds.map((id) => {
                           const g = gastosEquipo.find((x) => x.id === id);
                           return (
                              <span
                                 key={id}
                                 className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs"
                              >
                                 {g?.concepto}
                                 <button
                                    type="button"
                                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => toggleGasto(id)}
                                    disabled={loading}
                                 >
                                    ×
                                 </button>
                              </span>
                           );
                        })}
                     </div>
                  )}
                  <Textarea
                     id="trabajo-realizado"
                     value={trabajoManual}
                     onChange={(e) => {
                        setTrabajoManual(e.target.value);
                        reconstruirTrabajo(gastoIds, e.target.value);
                     }}
                     placeholder={
                        gastoIds.length > 0
                           ? "Agregar descripción adicional (opcional)…"
                           : "Ej: Cambio de aceite y filtros, ajuste de frenos."
                     }
                     rows={3}
                     disabled={loading}
                  />
                  {gastoIds.length > 0 && (
                     <p className="text-xs text-muted-foreground">
                        Se guardará la combinación de los conceptos seleccionados + tu texto.
                     </p>
                  )}
               </div>

               <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="fecha-fin">Fecha de fin</Label>
                     <Input
                        id="fecha-fin"
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        disabled={loading}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="costo">Costo (RD$)</Label>
                     <Input
                        id="costo"
                        type="number"
                        min="0"
                        step="0.01"
                        value={hayGastos ? totalCalculado.toFixed(2) : costo}
                        onChange={(e) => setCosto(e.target.value)}
                        placeholder="0.00"
                        disabled={loading || hayGastos}
                        title={
                           hayGastos ? "Calculado a partir de los gastos" : undefined
                        }
                     />
                     {hayGastos && (
                        <p className="text-xs text-muted-foreground">
                           Suma de los gastos registrados.
                        </p>
                     )}
                  </div>
               </div>

               {/* Enlazar gastos existentes y crear uno nuevo NO son excluyentes:
                   un mismo mantenimiento suele traer repuestos ya capturados más
                   la mano de obra que aún no se registra. */}
               <div className="flex flex-col gap-1.5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                     <input
                        type="checkbox"
                        className="size-4 accent-brand-blue"
                        checked={modoGasto === "CREAR"}
                        onChange={(e) => {
                           setModoGasto(e.target.checked ? "CREAR" : "NINGUNO");
                           if (!e.target.checked) {
                              setCategoriaGastoId("");
                              setMontoGastoNuevo("");
                           }
                        }}
                        disabled={loading}
                     />
                     Registrar un gasto nuevo (que no esté en la lista)
                  </label>
               </div>

               {modoGasto === "CREAR" && (
                  <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
                     <Label htmlFor="categoria-gasto">
                        Categoría del gasto <span className="text-destructive">*</span>
                     </Label>
                     <select
                        id="categoria-gasto"
                        className={SELECT_CLASS}
                        value={categoriaGastoId}
                        onChange={(e) => setCategoriaGastoId(e.target.value)}
                        disabled={loading}
                     >
                        <option value="">Selecciona una categoría…</option>
                        {Categorias.map((cat) => (
                           <option key={cat.id} value={cat.id}>
                              {cat.nombre}
                           </option>
                        ))}
                     </select>

                     <Label htmlFor="monto-gasto-nuevo" className="mt-1">
                        Monto del gasto nuevo <span className="text-destructive">*</span>
                     </Label>
                     <Input
                        id="monto-gasto-nuevo"
                        type="number"
                        min="0"
                        step="0.01"
                        value={montoGastoNuevo}
                        onChange={(e) => setMontoGastoNuevo(e.target.value)}
                        placeholder="0.00"
                        disabled={loading}
                     />
                     <p className="text-xs text-muted-foreground">
                        Se creará un gasto por {formatMoney(montoNuevoNum)} asociado a este equipo.
                     </p>
                  </div>
               )}

               {(
                  <div className="flex flex-col gap-1.5">
                     <Label>Gastos ya registrados de este equipo</Label>
                     {gastosEquipo.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                           No hay gastos registrados para este equipo.
                        </p>
                     ) : (
                        <>
                           <div className="max-h-48 overflow-y-auto rounded-md border border-input divide-y divide-border">
                              {gastosEquipo.map((g) => (
                                 <label
                                    key={g.id}
                                    className="flex cursor-pointer items-start gap-2 p-2 text-sm hover:bg-muted/50"
                                 >
                                    <input
                                       type="checkbox"
                                       className="mt-0.5 size-4 accent-brand-blue"
                                       checked={gastoIds.includes(g.id)}
                                       onChange={() => toggleGasto(g.id)}
                                       disabled={loading}
                                    />
                                    <span>
                                       {g.codigoReferencia} · {formatDate(g.fecha)} ·{" "}
                                       {formatMoney(g.monto_total)}
                                       <span className="block text-xs text-muted-foreground">
                                          {g.concepto}
                                       </span>
                                    </span>
                                 </label>
                              ))}
                           </div>
                           {gastoIds.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                 {gastoIds.length} gasto{gastoIds.length === 1 ? "" : "s"} enlazado
                                 {gastoIds.length === 1 ? "" : "s"} · Total{" "}
                                 {formatMoney(sumaGastos)}
                              </p>
                           )}
                        </>
                     )}
                  </div>
               )}

               {hayGastos && (
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                     <span className="text-sm font-medium">Costo total</span>
                     <span className="text-sm font-bold">{formatMoney(totalCalculado)}</span>
                  </div>
               )}

               {shownError && <p className="text-sm text-destructive">{shownError}</p>}
            </div>

            <DialogFooter>
               <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
               >
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
