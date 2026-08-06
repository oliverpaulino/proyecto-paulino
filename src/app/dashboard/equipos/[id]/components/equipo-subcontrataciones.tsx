"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HandCoins, HardHat, Loader2 } from "lucide-react";
import { PermissionGuard } from "@/components/permission-guard";
import { SelectBuscadorDeudasProveedor } from "@/components/shared/selectBuscadorDeudasProveedor";
import { useSubcontratacionStore } from "@/stores/useSubcontratacionStore";
import { usePagoStore } from "@/stores/usePagoStore";
import type { CreatePagoForm } from "@/dtos/pagos.dto";
import type { EstadoPago, EstadoTrabajo } from "@/dtos/subcontratacion.dto";

const ESTADO_TRABAJO_STYLE: Record<EstadoTrabajo, string> = {
   PENDIENTE: "bg-red-100 text-red-800",
   EN_PROGRESO: "bg-blue-100 text-blue-800",
   TERMINADA: "bg-green-100 text-green-800",
   CANCELADA: "bg-gray-100 text-gray-600",
   PARADO: "bg-amber-100 text-amber-800",
};

const ESTADO_TRABAJO_LABEL: Record<EstadoTrabajo, string> = {
   PENDIENTE: "Pendiente",
   EN_PROGRESO: "En progreso",
   TERMINADA: "Terminada",
   CANCELADA: "Cancelada",
   PARADO: "Parada",
};

const ESTADO_PAGO_STYLE: Record<EstadoPago, string> = {
   PENDIENTE: "bg-red-100 text-red-800",
   PARCIAL: "bg-amber-100 text-amber-800",
   PAGADO: "bg-green-100 text-green-800",
};

const METODOS_PAGO = ["CHEQUE", "EFECTIVO", "TRANSFERENCIA", "TARJETA", "DESCUENTO_NOMINA"];

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fecha = (s: string | Date) =>
   new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
   });

type PagarItem = {
   kind: "GASTO";
   id: string;
   codigoReferencia: string;
   concepto: string;
   pendiente: number;
};

/**
 * Tab de subcontrataciones de la ficha de equipo. Se monta solo cuando el
 * usuario entra al tab, así que la data se pide en ese momento y no al cargar
 * la página; el store cachea por filtros para no re-pedir al remontar. Permite
 * pagar la deuda de las subcontrataciones seleccionadas (pagos contra el gasto
 * vinculado de cada trabajo).
 */
export function EquipoSubcontrataciones({ equipoId }: { equipoId: string }) {
   const router = useRouter();
   const { subcontrataciones, loading: subLoading, GetSubcontrataciones } = useSubcontratacionStore();
   const [loaded, setLoaded] = useState(false);
   const [busqueda, setBusqueda] = useState("");
   const [desde, setDesde] = useState("");
   const [hasta, setHasta] = useState("");
   const [estadoPago, setEstadoPago] = useState<EstadoPago | "">("");
   const [subSel, setSubSel] = useState<Set<string>>(new Set());
   const [pagarOpen, setPagarOpen] = useState(false);
   const [pagarItems, setPagarItems] = useState<PagarItem[]>([]);

   useEffect(() => {
      let active = true;
      GetSubcontrataciones({ equipo_id: equipoId, incluir_pagadas: true, pageSize: 1000 }).then(() => {
         if (active) setLoaded(true);
      });
      return () => {
         active = false;
      };
   }, [equipoId, GetSubcontrataciones]);

   const filtradas = useMemo(() => {
      const q = busqueda.trim().toLowerCase();
      return subcontrataciones.filter((s) => {
         if (estadoPago && s.estado_pago !== estadoPago) return false;
         const d = new Date(`${String(s.fecha_deuda).slice(0, 10)}T12:00:00`);
         if (desde && d < new Date(`${desde}T12:00:00`)) return false;
         if (hasta && d > new Date(`${hasta}T12:00:00`)) return false;
         if (q) {
            const hay =
               `${s.codigoReferencia} ${s.trabajo_descripcion ?? ""} ${s.proveedor_nombre ?? ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
         }
         return true;
      });
   }, [subcontrataciones, busqueda, desde, hasta, estadoPago]);

   // Pagables = con pendiente y gasto vinculado. El pago entra contra el gasto.
   const pagables: PagarItem[] = subcontrataciones
      .filter((s) => s.pendiente > 0 && s.gasto_id)
      .map((s) => ({
         kind: "GASTO" as const,
         id: s.gasto_id!,
         codigoReferencia: s.codigoReferencia,
         concepto: s.trabajo_descripcion ?? "Subcontratación",
         pendiente: s.pendiente,
      }));

   const selectables = filtradas.filter((s) => s.pendiente > 0 && s.gasto_id);

   const selKey = (id: string) => `GASTO:${id}`;
   const toggleSel = (set: Set<string>, key: string, on: boolean) => {
      const next = new Set(set);
      if (on) next.add(key);
      else next.delete(key);
      return next;
   };

   async function handlePagadas() {
      await GetSubcontrataciones({ equipo_id: equipoId, incluir_pagadas: true, pageSize: 1000 }, true);
      setSubSel(new Set());
   }

   const loading = subLoading || !loaded;
   const conFiltros = Boolean(busqueda || desde || hasta || estadoPago);
   const selSize = subSel.size;

   return (
      <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <HardHat className="size-5 text-brand-blue" />
               Subcontrataciones
            </CardTitle>
            <CardDescription>
               Trabajos de subcontratistas asignados a este equipo y su deuda.
            </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
               <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                     Buscar por referencia o trabajo
                  </label>
                  <Input
                     placeholder="Ej: SUB-001 o soldadura..."
                     value={busqueda}
                     onChange={(e) => setBusqueda(e.target.value)}
                  />
               </div>
               <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
                  <Input
                     type="date"
                     className="h-10 w-40"
                     value={desde}
                     onChange={(e) => setDesde(e.target.value)}
                  />
               </div>
               <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
                  <Input
                     type="date"
                     className="h-10 w-40"
                     value={hasta}
                     onChange={(e) => setHasta(e.target.value)}
                  />
               </div>
               <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado pago</label>
                  <div className="flex gap-1 flex-wrap">
                     {([
                        { value: "", label: "Todos" },
                        { value: "PENDIENTE", label: "Sin pagos" },
                        { value: "PARCIAL", label: "Parcial" },
                        { value: "PAGADO", label: "Pagadas" },
                     ] as { value: EstadoPago | ""; label: string }[]).map((op) => (
                        <Button
                           key={op.value || "todos"}
                           size="sm"
                           variant={estadoPago === op.value ? "default" : "outline"}
                           onClick={() => setEstadoPago(op.value)}
                        >
                           {op.label}
                        </Button>
                     ))}
                  </div>
               </div>
               {conFiltros && (
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => {
                        setBusqueda("");
                        setDesde("");
                        setHasta("");
                        setEstadoPago("");
                     }}
                  >
                     Limpiar
                  </Button>
               )}
            </div>

            {selSize > 0 && (
               <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-4 py-2.5">
                  <span className="text-sm font-medium">
                     {selSize} {selSize === 1 ? "subcontratación seleccionada" : "subcontrataciones seleccionadas"}
                  </span>
                  <PermissionGuard resource="supplier" action="update">
                     <Button
                        size="sm"
                        onClick={() => {
                           const items = pagables.filter((i) => subSel.has(selKey(i.id)));
                           if (items.length) {
                              setPagarItems(items);
                              setPagarOpen(true);
                           }
                        }}
                     >
                        <HandCoins className="mr-2 size-4" /> Pagar seleccionadas
                     </Button>
                  </PermissionGuard>
                  <Button variant="ghost" size="sm" onClick={() => setSubSel(new Set())}>
                     Quitar selección
                  </Button>
               </div>
            )}

            {loading ? (
               <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
               </div>
            ) : filtradas.length === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <HardHat className="size-8 opacity-30" />
                  <p className="text-sm">Sin subcontrataciones para este equipo.</p>
               </div>
            ) : (
               <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="bg-brand-blue">
                           <th className="w-10 px-3 py-3">
                              <Checkbox
                                 checked={selectables.length > 0 && selSize === selectables.length}
                                 onCheckedChange={(v) => {
                                    const next = new Set(subSel);
                                    selectables.forEach((s) => {
                                       const k = selKey(s.gasto_id!);
                                       if (v) next.add(k);
                                       else next.delete(k);
                                    });
                                    setSubSel(next);
                                 }}
                                 className="border-blue-200/70 bg-white/10 data-[state=checked]:bg-brand-600"
                              />
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Ref.</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Subcontratista</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha deuda</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Pago</th>
                        </tr>
                     </thead>
                     <tbody>
                        {filtradas.map((s) => {
                           const pagable = s.pendiente > 0 && s.gasto_id;
                           const k = selKey(s.gasto_id ?? s.id);
                           return (
                              <tr
                                 key={s.id}
                                 onClick={() => router.push(`/dashboard/subcontrataciones/${s.id}`)}
                                 className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-blue/5"
                              >
                                 <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                       checked={subSel.has(k)}
                                       disabled={!pagable}
                                       onCheckedChange={(v) => setSubSel(toggleSel(subSel, k, !!v))}
                                    />
                                 </td>
                                 <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-brand-blue">
                                    {s.codigoReferencia}
                                 </td>
                                 <td className="px-4 py-3">{s.proveedor_nombre ?? "—"}</td>
                                 <td className="max-w-[260px] px-4 py-3">
                                    <div className="truncate">{s.trabajo_descripcion ?? "—"}</div>
                                 </td>
                                 <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fecha(s.fecha_deuda)}</td>
                                 <td className="whitespace-nowrap px-4 py-3 text-right">{money(s.monto_total)}</td>
                                 <td
                                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                                       s.pendiente > 0 ? "text-destructive" : "text-muted-foreground"
                                    }`}
                                 >
                                    {money(s.pendiente)}
                                 </td>
                                 <td className="px-4 py-3 text-center">
                                    <Badge className={`border-0 text-[10px] ${ESTADO_TRABAJO_STYLE[s.estado_trabajo]}`}>
                                       {ESTADO_TRABAJO_LABEL[s.estado_trabajo]}
                                    </Badge>
                                 </td>
                                 <td className="px-4 py-3 text-center">
                                    <Badge className={`border-0 text-[10px] ${ESTADO_PAGO_STYLE[s.estado_pago]}`}>
                                       {s.estado_pago}
                                    </Badge>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            )}

            <PagarSubcontratacionesDialog
               open={pagarOpen}
               onOpenChange={(open) => {
                  setPagarOpen(open);
                  if (!open) setPagarItems([]);
               }}
               items={pagarItems}
               allItems={pagables}
               onDone={handlePagadas}
            />
         </CardContent>
      </Card>
   );
}

const INPUT =
   "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 transition-colors";

function PagarSubcontratacionesDialog({
   open,
   onOpenChange,
   items,
   allItems,
   onDone,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   items: PagarItem[];
   allItems: PagarItem[];
   onDone: () => Promise<void>;
}) {
   const [selected, setSelected] = useState<PagarItem[]>([]);
   const [montos, setMontos] = useState<Record<string, string>>({});
   const [metodo, setMetodo] = useState("TRANSFERENCIA");
   const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const { CreatePago } = usePagoStore();

   const key = (i: PagarItem) => `${i.kind}:${i.id}`;

   useEffect(() => {
      if (!open) return;
      setSelected(items);
      const next: Record<string, string> = {};
      items.forEach((i) => {
         next[key(i)] = String(i.pendiente);
      });
      setMontos(next);
      setMetodo("TRANSFERENCIA");
      setFechaPago(new Date().toISOString().slice(0, 10));
      setError(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [open, items]);

   const toggle = (item: PagarItem) => {
      const k = key(item);
      const existe = selected.some((i) => key(i) === k);
      if (existe) {
         setSelected(selected.filter((i) => key(i) !== k));
         setMontos((m) => {
            const n = { ...m };
            delete n[k];
            return n;
         });
      } else {
         setSelected([...selected, item]);
         setMontos((m) => ({ ...m, [k]: String(item.pendiente) }));
      }
   };

   const total = selected.reduce((acc, i) => acc + (Number(montos[key(i)]) || 0), 0);
   const invalido =
      selected.length === 0 ||
      selected.some((i) => {
         const m = Number(montos[key(i)]);
         return !m || m <= 0 || m > i.pendiente + 0.01;
      });

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (selected.length === 0) {
         setError("Selecciona al menos una deuda");
         return;
      }
      const aPagar = selected.filter((i) => (Number(montos[key(i)]) || 0) > 0);
      if (aPagar.length === 0) {
         setError("Indica un monto válido para al menos una deuda");
         return;
      }
      for (const i of aPagar) {
         const m = Number(montos[key(i)]);
         if (m > i.pendiente + 0.01) {
            setError(`El pago a ${i.codigoReferencia} no puede superar su pendiente (RD$ ${i.pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })})`);
            return;
         }
      }
      setLoading(true);
      try {
         for (const i of aPagar) {
            const m = Number(montos[key(i)]);
            const payload: CreatePagoForm = {
               metodo_pago: metodo as CreatePagoForm["metodo_pago"],
               monto_pagado: m,
               concepto: `Pago a ${i.codigoReferencia} — ${i.concepto}`,
               tipo_movimiento: "SALIDA",
               fecha: new Date(fechaPago),
               gasto_empresa_id: i.id,
            };
            const result = await CreatePago(payload);
            if (result instanceof Error) throw result;
         }
         onOpenChange(false);
         await onDone();
      } catch (err: any) {
         setError(err?.message ?? "Ocurrió un error al registrar los pagos");
      } finally {
         setLoading(false);
      }
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-xl">
            <DialogHeader>
               <DialogTitle>Registrar pago</DialogTitle>
               <DialogDescription>
                  Selecciona las subcontrataciones que quieras pagar y define los montos.
               </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
               <SelectBuscadorDeudasProveedor
                  deudas={allItems}
                  selectedIds={selected.map(key)}
                  onToggle={(item) => toggle(item as PagarItem)}
               />

               {selected.length > 0 && (
                  <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                     {selected.map((i) => (
                        <div key={key(i)} className="rounded-lg border border-border bg-muted/20 p-3">
                           <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                 <p className="truncate text-sm font-semibold">{i.codigoReferencia}</p>
                                 <p className="truncate text-xs text-muted-foreground">{i.concepto}</p>
                              </div>
                              <span className="shrink-0 text-xs font-medium text-red-600">
                                 pend. {money(i.pendiente)}
                              </span>
                           </div>
                           <div className="mt-2 flex items-center gap-2">
                              <Input
                                 type="number"
                                 step="0.01"
                                 min="0.01"
                                 value={montos[key(i)] ?? ""}
                                 onChange={(e) => setMontos((prev) => ({ ...prev, [key(i)]: e.target.value }))}
                                 className={INPUT}
                                 required
                              />
                              <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 className="shrink-0"
                                 onClick={() => setMontos((prev) => ({ ...prev, [key(i)]: String(i.pendiente) }))}
                                 disabled={i.pendiente <= 0}
                              >
                                 Todo
                              </Button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                     <Label>Fecha *</Label>
                     <Input
                        type="date"
                        value={fechaPago}
                        onChange={(e) => setFechaPago(e.target.value)}
                        required
                        className={INPUT}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <Label>Método de pago *</Label>
                     <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={INPUT}>
                        {METODOS_PAGO.map((m) => (
                           <option key={m} value={m}>{m}</option>
                        ))}
                     </select>
                  </div>
               </div>

               {error && (
                  <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
                     {error}
                  </div>
               )}

               <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                     Cancelar
                  </Button>
                  <Button type="submit" disabled={loading || invalido || selected.length === 0}>
                     {loading ? "Registrando…" : `Pagar ${money(total)}`}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}
