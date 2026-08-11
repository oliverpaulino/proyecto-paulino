"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search } from "lucide-react";
import { MetodoPago } from "@/dtos/pagos.dto";
import { SelectBuscadorClient } from "@/components/shared/selectBuscadorClient";
import {
   useCuentasPorCobrarStore,
   type CuentaPorCobrar,
   type TipoCxc,
} from "@/stores/useCuentasPorCobrarStore";

const INPUT_CLASS =
   "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] disabled:opacity-60 disabled:bg-muted";

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateForInput = (date: Date) => {
   const d = new Date(date);
   const year = d.getFullYear();
   const month = String(d.getMonth() + 1).padStart(2, "0");
   const day = String(d.getDate()).padStart(2, "0");
   return `${year}-${month}-${day}`;
};

const fechaCorta = (s: string) =>
   s
      ? new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO", {
           day: "2-digit",
           month: "short",
           year: "numeric",
        })
      : "—";

interface ItemCobrable {
   key: string;
   tipo: TipoCxc;
   destino_id: string;
   folioId: string;
   folioRef: string;
   folioNombre: string | null;
   fecha: string;
   /** Referencia del conduce o "Tarifa del servicio y cargos". */
   label: string;
   /** Lo facturado original (conduce.subtotal o tarifa+cargos). */
   monto_original: number;
   pendiente: number;
   tarifa_servicio: number | null;
   cargos_cobrables: number | null;
}

/** Aplana los folios en unidades cobrables: conduces + bloque tarifa/cargos. */
function itemsFromFolios(folios: CuentaPorCobrar[]): ItemCobrable[] {
   const items: ItemCobrable[] = [];
   for (const f of folios) {
      for (const cc of f.conduces) {
         if (cc.pendiente > 0.01) {
            items.push({
               key: `CONDUCE:${cc.id}`,
               tipo: "CONDUCE",
               destino_id: cc.id,
               folioId: f.id,
               folioRef: f.numero_referencia,
               folioNombre: f.nombre,
               fecha: f.fecha,
               label: cc.numero_referencia,
               monto_original: cc.monto_total,
               pendiente: cc.pendiente,
               tarifa_servicio: f.tarifa_servicio,
               cargos_cobrables: null,
            });
         }
      }
      if (f.pendiente_tarifa_cargos > 0.01) {
         items.push({
            key: `PROYECTO:${f.id}`,
            tipo: "PROYECTO",
            destino_id: f.id,
            folioId: f.id,
            folioRef: f.numero_referencia,
            folioNombre: f.nombre,
            fecha: f.fecha,
            label: "Tarifa del servicio y cargos",
            monto_original: f.tarifa_servicio + f.cargos_cobrables,
            pendiente: f.pendiente_tarifa_cargos,
            tarifa_servicio: f.tarifa_servicio,
            cargos_cobrables: f.cargos_cobrables,
         });
      }
   }
   return items;
}

interface PagoRapidoDialogProps {
   open: boolean;
   /** Cliente preseleccionado (desde el detalle del cliente, por ejemplo). */
   clienteInicialId?: string;
   clienteInicialLabel?: string;
   /** Folio a cobrar en concreto (proyecto o conduce): lo preselecciona todo. */
   folioInicialId?: string;
   onClose: () => void;
}

/**
 * Pago rápido de cuentas por cobrar.
 *
 * La unidad de deuda es el folio: un proyecto (tarifa del servicio + cargos
 * cobrables + conduces) o un conduce suelto. Se elige qué cobrar con
 * checkboxes y un buscador; el monto se reparte solo (FIFO) o folio a folio.
 */
export function PagoRapidoDialog({
   open,
   clienteInicialId,
   clienteInicialLabel,
   folioInicialId,
   onClose,
}: PagoRapidoDialogProps) {
   const RegistrarPago = useCuentasPorCobrarStore((s) => s.RegistrarPago);
   const GetPendientesCliente = useCuentasPorCobrarStore((s) => s.GetPendientesCliente);

   const [clienteId, setClienteId] = useState<string | null>(clienteInicialId ?? null);
   const [monto, setMonto] = useState("");
   const [metodoPago, setMetodoPago] = useState("EFECTIVO");
   const [fecha, setFecha] = useState(formatDateForInput(new Date()));
   const [concepto, setConcepto] = useState("");
   const [manual, setManual] = useState(false);
   const [folios, setFolios] = useState<CuentaPorCobrar[]>([]);
   const [busqueda, setBusqueda] = useState("");
   const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
   const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});
   const [cargando, setCargando] = useState(false);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (open) {
         setClienteId(clienteInicialId ?? null);
         setMonto("");
         setMetodoPago("EFECTIVO");
         setFecha(formatDateForInput(new Date()));
         setConcepto("");
         setManual(false);
         setFolios([]);
         setBusqueda("");
         setSeleccion({});
         setAsignaciones({});
         setError(null);
      }
   }, [open, clienteInicialId]);

   // Cuando se elige un cliente, cargamos sus folios pendientes.
   useEffect(() => {
      if (!open || !clienteId) return;
      setCargando(true);
      setError(null);
      GetPendientesCliente(clienteId)
         .then((folios) => {
            setFolios(folios);

            const items = itemsFromFolios(folios);
            const pendienteTotal = items.reduce((acc, i) => acc + i.pendiente, 0);
            if (pendienteTotal > 0) setMonto(pendienteTotal.toFixed(2));

            // Cobro de un folio concreto: se preselecciona todo lo pendiente
            // de ese folio y se abre la distribución folio a folio.
            const prefill = folioInicialId
               ? items.filter((i) => i.folioId === folioInicialId)
               : [];
            if (prefill.length > 0) {
               setManual(true);
               const sel: Record<string, boolean> = {};
               const asig: Record<string, string> = {};
               for (const i of prefill) {
                  sel[i.key] = true;
                  asig[i.key] = i.pendiente.toFixed(2);
               }
               setSeleccion(sel);
               setAsignaciones(asig);
            }
         })
         .catch(() => setError("No se pudieron cargar los folios pendientes del cliente."))
         .finally(() => setCargando(false));
   }, [open, clienteId, folioInicialId, GetPendientesCliente]);

   // ── Derivados ─────────────────────────────────────────────────────────────
   const items = useMemo(() => itemsFromFolios(folios), [folios]);

   const itemsFiltrados = useMemo(() => {
      const b = busqueda.trim().toLowerCase();
      if (!b) return items;
      return items.filter((i) =>
         [i.folioRef, i.folioNombre, i.label]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(b))
      );
   }, [items, busqueda]);

   const seleccionados = useMemo(() => items.filter((i) => seleccion[i.key]), [items, seleccion]);
   const totalPendiente = items.reduce((acc, i) => acc + i.pendiente, 0);
   const pendienteSeleccionado = seleccionados.reduce((acc, i) => acc + i.pendiente, 0);
   const sumaAsignaciones = items.reduce(
      (acc, i) => acc + (seleccion[i.key] ? Number(asignaciones[i.key]) || 0 : 0),
      0
   );

   // Agrupación por folio para mostrar.
   const grupos = useMemo(() => {
      const map = new Map<string, ItemCobrable[]>();
      for (const i of itemsFiltrados) {
         const arr = map.get(i.folioId) ?? [];
         arr.push(i);
         map.set(i.folioId, arr);
      }
      return [...map.entries()];
   }, [itemsFiltrados]);

   const toggleItem = useCallback(
      (item: ItemCobrable, checked: boolean) => {
         const next = { ...seleccion, [item.key]: checked };
         setSeleccion(next);
         setAsignaciones((prev) => {
            const copy = { ...prev };
            if (checked) {
               copy[item.key] = item.pendiente.toFixed(2);
            } else {
               delete copy[item.key];
            }
            return copy;
         });
         // En "Monto automático" el monto sigue a la selección: suma el pendiente
         // de lo marcado y, si no hay nada seleccionado, vuelve al total del
         // cliente (se repartirá FIFO contra todo).
         if (!manual) {
            const sumaSel = items
               .filter((i) => next[i.key])
               .reduce((acc, i) => acc + i.pendiente, 0);
            setMonto((sumaSel > 0 ? sumaSel : totalPendiente).toFixed(2));
         }
      },
      [seleccion, items, manual, totalPendiente]
   );

   const todasSeleccionadas =
      itemsFiltrados.length > 0 && itemsFiltrados.every((i) => seleccion[i.key]);
   const algunasSeleccionadas = itemsFiltrados.some((i) => seleccion[i.key]);

   const toggleTodos = useCallback(
      (checked: boolean) => {
         const next = { ...seleccion };
         const asig = { ...asignaciones };
         let sumaSel = 0;
         for (const i of itemsFiltrados) {
            next[i.key] = checked;
            if (checked) {
               asig[i.key] = i.pendiente.toFixed(2);
               sumaSel += i.pendiente;
            } else {
               delete asig[i.key];
            }
         }
         setSeleccion(next);
         setAsignaciones(asig);
         if (!manual) {
            setMonto((checked ? sumaSel : totalPendiente).toFixed(2));
         }
      },
      [seleccion, asignaciones, itemsFiltrados, manual, totalPendiente]
   );

   const handleConfirm = async () => {
      setError(null);

      if (!clienteId) {
         setError("Selecciona un cliente.");
         return;
      }

      const fechaDate = (() => {
         const [y, m, d] = fecha.split("-").map(Number);
         return y && m && d ? new Date(y, m - 1, d) : new Date();
      })();

      try {
         setLoading(true);
         if (manual) {
            const pagos = seleccionados
               .map((i) => ({ destino_id: i.destino_id, tipo: i.tipo, monto: Number(asignaciones[i.key]) || 0 }))
               .filter((p) => p.monto > 0);
            if (pagos.length === 0) {
               setError("Selecciona al menos un folio y distribuye un monto.");
               return;
            }
            for (const p of pagos) {
               const item = seleccionados.find((i) => i.key === `${p.tipo}:${p.destino_id}`)!;
               if (p.monto > item.pendiente + 0.01) {
                  setError(`El monto de ${item.label} supera su pendiente (${money(item.pendiente)}).`);
                  return;
               }
            }
            await RegistrarPago({
               cliente_id: clienteId,
               monto: Math.round(sumaAsignaciones * 100) / 100,
               metodo_pago: metodoPago,
               fecha: fechaDate,
               concepto: concepto || undefined,
               pagos,
            });
         } else {
            const montoNum = Number(monto);
            if (!Number.isFinite(montoNum) || montoNum <= 0) {
               setError("El monto debe ser mayor a 0.");
               return;
            }
            const tope = seleccionados.length > 0 ? pendienteSeleccionado : totalPendiente;
            if (montoNum > tope + 0.01) {
               const quien =
                  seleccionados.length > 0
                     ? `el pendiente seleccionado (${money(pendienteSeleccionado)})`
                     : `el pendiente del cliente (${money(totalPendiente)})`;
               setError(`El monto supera ${quien}.`);
               return;
            }
            const conduceIds = seleccionados
               .filter((i) => i.tipo === "CONDUCE")
               .map((i) => i.destino_id);
            const proyectoIds = seleccionados
               .filter((i) => i.tipo === "PROYECTO")
               .map((i) => i.destino_id);
            await RegistrarPago({
               cliente_id: clienteId,
               monto: Math.round(montoNum * 100) / 100,
               metodo_pago: metodoPago,
               fecha: fechaDate,
               concepto: concepto || undefined,
               conduce_ids: conduceIds.length > 0 ? conduceIds : undefined,
               proyecto_ids: proyectoIds.length > 0 ? proyectoIds : undefined,
            });
         }
         onClose();
      } catch (e: any) {
         setError(e.message ?? "Error al registrar el pago.");
      } finally {
         setLoading(false);
      }
   };

   return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
         {/* En el teléfono casi toda la pantalla; en escritorio un panel ancho. */}
         <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] overflow-y-auto gap-4 p-4 sm:max-w-3xl sm:p-6">
            <DialogHeader>
               <DialogTitle>Pago rápido de cuentas por cobrar</DialogTitle>
               <DialogDescription>
                  Elige qué cobrar: folios (proyectos) y conduces. Cada folio muestra la tarifa del
                  servicio y sus cargos cobrables.
               </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
               <div className="flex flex-col gap-1.5">
                  <Label>Cliente *</Label>
                  <SelectBuscadorClient
                     value={clienteId}
                     initialLabel={clienteInicialLabel ?? ""}
                     onChange={(id) => setClienteId(id)}
                     disabled={loading || !!clienteInicialId}
                  />
               </div>

               <div className="flex items-center gap-2">
                  <Button
                     type="button"
                     size="sm"
                     variant={!manual ? "default" : "outline"}
                     onClick={() => setManual(false)}
                     disabled={loading || !clienteId}
                  >
                     Monto automático
                  </Button>
                  <Button
                     type="button"
                     size="sm"
                     variant={manual ? "default" : "outline"}
                     onClick={() => setManual(true)}
                     disabled={loading || !clienteId}
                  >
                     Distribuir por folio
                  </Button>
               </div>

               {/* ── Folios pendientes ── */}
               <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3">
                  {cargando ? (
                     <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Cargando folios pendientes…
                     </div>
                  ) : items.length === 0 ? (
                     <p className="py-2 text-center text-sm text-muted-foreground">
                        El cliente no tiene cuentas pendientes.
                     </p>
                  ) : (
                     <>
                        <div className="relative">
                           <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                           <Input
                              value={busqueda}
                              onChange={(e) => setBusqueda(e.target.value)}
                              placeholder="Buscar por folio, proyecto, conduce o tarifa…"
                              disabled={loading}
                              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                           />
                        </div>

                        <div className="flex items-center gap-2 border-b border-border pb-2">
                           <Checkbox
                              checked={todasSeleccionadas ? true : algunasSeleccionadas ? "indeterminate" : false}
                              onCheckedChange={(v) => toggleTodos(v === true)}
                              disabled={loading}
                              aria-label="Seleccionar todos los folios"
                           />
                           <span className="text-sm font-medium">Seleccionar todos</span>
                           <span className="text-xs text-muted-foreground">
                              ({itemsFiltrados.length} ítem{itemsFiltrados.length === 1 ? "" : "s"})
                           </span>
                        </div>

                        {grupos.length === 0 ? (
                           <p className="py-2 text-center text-sm text-muted-foreground">
                              Ningún folio coincide con la búsqueda.
                           </p>
                        ) : (
                           grupos.map(([folioId, grupoItems]) => {
                              const primero = grupoItems[0];
                              return (
                                 <div
                                    key={folioId}
                                    className="flex flex-col gap-1.5 rounded-md border border-border bg-background p-2"
                                 >
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                       <span className="font-mono text-sm font-medium text-brand-blue dark:text-blue-400">
                                          {primero.folioRef}
                                       </span>
                                       {primero.folioNombre && (
                                          <span className="text-xs text-muted-foreground">
                                             {primero.folioNombre}
                                          </span>
                                       )}
                                       <span className="text-xs text-muted-foreground">
                                          · {fechaCorta(primero.fecha)}
                                       </span>
                                       {primero.tipo === "PROYECTO" &&
                                          primero.tarifa_servicio != null &&
                                          primero.tarifa_servicio > 0 && (
                                             <span className="text-xs font-medium text-brand-blue dark:text-blue-400">
                                                Tarifa del servicio: {money(primero.tarifa_servicio)}
                                             </span>
                                          )}
                                    </div>
                                    {grupoItems.map((item) => {
                                       const checked = !!seleccion[item.key];
                                       return (
                                          <div
                                             key={item.key}
                                             className={`grid gap-2 rounded-md border p-2 transition-colors sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                                                checked
                                                   ? "border-brand-blue/40 bg-brand-blue/5"
                                                   : "border-border bg-background"
                                             }`}
                                          >
                                             <Checkbox
                                                checked={checked}
                                                onCheckedChange={(v) => toggleItem(item, v === true)}
                                                disabled={loading}
                                                aria-label={`Seleccionar ${item.label}`}
                                                className="mt-0.5 sm:mt-0"
                                             />
                                             <div className="min-w-0">
                                                <div className="truncate text-sm font-medium">
                                                   {item.label}
                                                </div>
                                                <div className="text-xs">
                                                   {item.tipo === "PROYECTO" ? (
                                                      <>
                                                         Cargos cobrables:{" "}
                                                         <span className="font-semibold">
                                                            {money(item.cargos_cobrables ?? 0)}
                                                         </span>
                                                      </>
                                                   ) : (
                                                      <>
                                                         Monto del servicio:{" "}
                                                         <span className="font-semibold">
                                                            {money(item.monto_original)}
                                                         </span>
                                                      </>
                                                   )}
                                                   {" · "}
                                                   Pendiente:{" "}
                                                   <span className="font-semibold text-red-600">
                                                      {money(item.pendiente)}
                                                   </span>
                                                </div>
                                             </div>
                                             {manual ? (
                                                <Input
                                                   type="number"
                                                   step="0.01"
                                                   min="0"
                                                   max={item.pendiente}
                                                   placeholder={checked ? item.pendiente.toFixed(2) : "0.00"}
                                                   value={asignaciones[item.key] ?? ""}
                                                   onChange={(e) =>
                                                      setAsignaciones((prev) => ({
                                                         ...prev,
                                                         [item.key]: e.target.value,
                                                      }))
                                                   }
                                                   disabled={loading || !checked}
                                                   className="h-8 w-full sm:w-36"
                                                />
                                             ) : (
                                                <div className="text-right text-xs font-semibold text-muted-foreground sm:min-w-[90px]">
                                                   {money(item.pendiente)}
                                                </div>
                                             )}
                                          </div>
                                       );
                                    })}
                                 </div>
                              );
                           })
                        )}

                        <p className="text-right text-xs text-muted-foreground">
                           Seleccionados:{" "}
                           <span className="font-semibold text-brand-blue dark:text-blue-400">
                              {seleccionados.length}
                           </span>{" "}
                           · Pendiente seleccionado:{" "}
                           <span className="font-semibold text-red-600">
                              {money(pendienteSeleccionado)}
                           </span>
                           {manual && (
                              <>
                                 {" · "}
                                 Total a cobrar:{" "}
                                 <span className="font-semibold text-brand-blue dark:text-blue-400">
                                    {money(sumaAsignaciones)}
                                 </span>
                              </>
                           )}
                        </p>
                     </>
                  )}
               </div>

               {!manual && (
                  <div className="flex flex-col gap-1.5">
                     <Label>Monto a cobrar (RD$) *</Label>
                     <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={seleccionados.length > 0 ? pendienteSeleccionado || undefined : totalPendiente || undefined}
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        disabled={loading}
                        className={INPUT_CLASS}
                     />
                     <p className="text-xs text-muted-foreground">
                        {seleccionados.length > 0
                           ? `Se repartirá (FIFO) solo entre los ${seleccionados.length} ítem${
                                seleccionados.length === 1 ? "" : "s"
                             } seleccionado${seleccionados.length === 1 ? "" : "s"}.`
                           : "Sin selección, se repartirá (FIFO) entre todo lo pendiente del cliente."}
                     </p>
                  </div>
               )}

               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                     <Label>Método de pago *</Label>
                     <Select value={metodoPago} onValueChange={setMetodoPago} disabled={loading}>
                        <SelectTrigger className="h-9 w-full bg-input/30">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {Object.entries(MetodoPago).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                 {label}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <Label>Fecha *</Label>
                     <Input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        disabled={loading}
                        className={INPUT_CLASS}
                     />
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Concepto (opcional)</Label>
                  <Input
                     value={concepto}
                     onChange={(e) => setConcepto(e.target.value)}
                     placeholder="Pago de cuentas por cobrar"
                     disabled={loading}
                     className={INPUT_CLASS}
                  />
               </div>
            </div>

            {error && (
               <div className="rounded-md bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
                  {error}
               </div>
            )}

            <DialogFooter>
               <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
               </Button>
               <Button onClick={handleConfirm} disabled={loading || !clienteId}>
                  {loading ? (
                     <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Registrando…
                     </>
                  ) : (
                     "Registrar pago"
                  )}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
