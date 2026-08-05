"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   ArrowLeft,
   Banknote,
   ClipboardList,
   HandCoins,
   HardHat,
   Loader2,
   PencilLine,
   Play,
   Trash2,
} from "lucide-react";
import {
   useSubcontratacionStore,
   type Apunte,
   type PagoSubcontratacion,
} from "@/stores/useSubcontratacionStore";
import type { Subcontratacion, EstadoTrabajo, EstadoPago } from "@/dtos/subcontratacion.dto";
import { PermissionGuard } from "@/components/permission-guard";

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fecha = (s: string | Date) =>
   new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
   });

const fechaHora = (s: string | Date) =>
   new Date(s).toLocaleString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   });

const ESTADO_TRABAJO_STYLE: Record<EstadoTrabajo, string> = {
   PENDIENTE: "bg-red-100 text-red-800",
   EN_PROGRESO: "bg-blue-100 text-blue-800",
   TERMINADA: "bg-green-100 text-green-800",
   CANCELADA: "bg-gray-100 text-gray-600",
};

const ESTADO_TRABAJO_LABEL: Record<EstadoTrabajo, string> = {
   PENDIENTE: "Pendiente",
   EN_PROGRESO: "En progreso",
   TERMINADA: "Terminada",
   CANCELADA: "Cancelada",
};

const ESTADO_PAGO_STYLE: Record<EstadoPago, string> = {
   PENDIENTE: "bg-red-100 text-red-800",
   PARCIAL: "bg-amber-100 text-amber-800",
   PAGADO: "bg-green-100 text-green-800",
};

const METODOS_PAGO = ["CHEQUE", "EFECTIVO", "TRANSFERENCIA", "TARJETA", "DESCUENTO_NOMINA"];

function InfoField({ label, value }: { label: string; value: string }) {
   return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
   );
}

export default function SubcontratacionDetailPage() {
   const params = useParams();
   const router = useRouter();
   const id = params.id as string;

   const { GetSubcontratacionById, GetPagos, GetApuntes } = useSubcontratacionStore();

   const [sub, setSub] = useState<Subcontratacion | null>(null);
   const [pagos, setPagos] = useState<PagoSubcontratacion[]>([]);
   const [apuntes, setApuntes] = useState<Apunte[]>([]);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [pagarOpen, setPagarOpen] = useState(false);
   const [apunteOpen, setApunteOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);

   useEffect(() => {
      let active = true;

      async function load() {
         setLoading(true);
         const data = await GetSubcontratacionById(id);
         const [p, a] = await Promise.all([GetPagos(id), GetApuntes(id)]);
         if (!active) return;
         setSub(data);
         setPagos(p);
         setApuntes(a);
         if (data) document.title = `${data.codigoReferencia} · ${data.proveedor_nombre ?? "Subcontratación"}`;
         setLoading(false);
      }

      load();
      return () => {
         active = false;
      };
   }, [id, GetSubcontratacionById, GetPagos, GetApuntes]);

   async function refresh() {
      const data = await GetSubcontratacionById(id);
      setSub(data);
   }

   async function handleCambiarEstado(estado: EstadoTrabajo) {
      const { CambiarEstado } = useSubcontratacionStore.getState();
      setActionLoading(true);
      try {
         const result = await CambiarEstado(id, estado);
         if (result instanceof Error) return;
         await refresh();
      } finally {
         setActionLoading(false);
      }
   }

   async function handleDelete(reason: string) {
      const { DeleteSubcontratacion } = useSubcontratacionStore.getState();
      setActionLoading(true);
      try {
         const result = await DeleteSubcontratacion(id, reason);
         if (result instanceof Error) return;
         router.push("/dashboard/subcontrataciones");
      } finally {
         setActionLoading(false);
      }
   }

   if (loading) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!sub) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <HardHat className="size-12 opacity-30" />
            <p>Subcontratación no encontrada.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/subcontrataciones")}>
               <ArrowLeft className="mr-2 size-4" /> Volver
            </Button>
         </div>
      );
   }

   const saldada = sub.estado_pago === "PAGADO";

   return (
      <PermissionGuard resource="supplier" action="read" mode="page">
      <div className="flex flex-col gap-6 p-6">
         {/* ── Header ── */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/subcontrataciones")}>
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="font-mono text-2xl font-bold text-brand-blue dark:text-white">
                        {sub.codigoReferencia}
                     </h1>
                     <Badge className={`border-0 text-[10px] ${ESTADO_TRABAJO_STYLE[sub.estado_trabajo]}`}>
                        {ESTADO_TRABAJO_LABEL[sub.estado_trabajo]}
                     </Badge>
                     <Badge className={`border-0 text-[10px] ${ESTADO_PAGO_STYLE[sub.estado_pago]}`}>
                        {sub.estado_pago}
                     </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                     {sub.trabajo_descripcion ?? "Trabajo de subcontratista"}
                  </p>
                  <p className="text-sm">
                     <button
                        className="font-semibold text-brand-blue underline-offset-2 hover:underline"
                        onClick={() => router.push(`/dashboard/proveedores/${sub.proveedor_id}`)}
                     >
                        {sub.proveedor_nombre ?? "Subcontratista"}
                     </button>
                     {sub.proveedor_rnc ? ` · RNC ${sub.proveedor_rnc}` : ""}
                     {sub.proyecto_nombre ? ` · ${sub.proyecto_nombre}` : ""}
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
               {sub.estado_trabajo === "PENDIENTE" && (
                  <Button
                     variant="outline"
                     onClick={() => handleCambiarEstado("EN_PROGRESO")}
                     disabled={actionLoading}
                  >
                     <Play className="mr-2 size-4" /> Comenzar trabajo
                  </Button>
               )}
               {(sub.estado_trabajo === "PENDIENTE" || sub.estado_trabajo === "EN_PROGRESO") && (
                  <>
                     <PermissionGuard resource="supplier" action="update">
                     <Button
                        className="bg-brand-yellow font-semibold text-brand-black shadow-md shadow-brand-yellow/30 hover:bg-yellow-300 border-0"
                        onClick={() => handleCambiarEstado("TERMINADA")}
                        disabled={actionLoading}
                     >
                        <PencilLine className="mr-2 size-4" /> Marcar terminada
                     </Button>
                     </PermissionGuard>
                     <Button variant="outline" onClick={() => setDeleteOpen(true)} disabled={actionLoading}>
                        <Trash2 className="mr-2 size-4" /> Cancelar trabajo
                     </Button>
                  </>
               )}
               {!saldada && (
                  <PermissionGuard resource="supplier" action="update">
                  <Button
                     className="bg-brand-blue font-semibold text-white shadow-md shadow-brand-blue/20 hover:bg-blue-700 border-0"
                     onClick={() => setPagarOpen(true)}
                     disabled={actionLoading}
                  >
                     <HandCoins className="mr-2 size-4" /> Registrar pago
                  </Button>
                  </PermissionGuard>
               )}
            </div>
         </div>

         {/* ── Tabs ── */}
         <Tabs defaultValue="trabajo" className="space-y-4">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               {[
                  { value: "trabajo", label: "Trabajo" },
                  { value: "pagos", label: "Pagos" },
                  { value: "apuntes", label: "Apuntes" },
               ].map((tab) => (
                  <TabsTrigger
                     key={tab.value}
                     value={tab.value}
                     className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white"
                  >
                     {tab.label}
                  </TabsTrigger>
               ))}
            </TabsList>

            {/* ── TRABAJO ── */}
            <TabsContent value="trabajo" className="space-y-4">
               <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <MiniStat label="Monto total" value={money(sub.monto_total)} />
                  <MiniStat label="Pagado" value={money(sub.pagado)} />
                  <MiniStat
                     label="Pendiente"
                     value={sub.pendiente > 0 ? money(sub.pendiente) : "—"}
                     red={sub.pendiente > 0}
                  />
               </div>

               <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                     <p className="mb-3 text-sm font-semibold">Información del trabajo</p>
                     <div className="grid gap-3 sm:grid-cols-2">
                        <InfoField label="Subcontratista" value={sub.proveedor_nombre ?? "—"} />
                        <InfoField label="Proyecto" value={sub.proyecto_nombre ?? "—"} />
                        <InfoField
                           label="Equipo"
                           value={sub.equipo_nombre ? `${sub.equipo_codigo_referencia} · ${sub.equipo_nombre}` : "—"}
                        />
                        <InfoField label="Descripción" value={sub.trabajo_descripcion ?? "—"} />
                        <InfoField label="Estado" value={ESTADO_TRABAJO_LABEL[sub.estado_trabajo]} />
                        <InfoField label="Fecha de deuda" value={fecha(sub.fecha_deuda)} />
                        <InfoField label="Fecha inicio" value={sub.fecha_inicio ? fecha(sub.fecha_inicio) : "—"} />
                        <InfoField label="Fecha fin" value={sub.fecha_fin ? fecha(sub.fecha_fin) : "—"} />
                        <InfoField label="Gasto vinculado" value={sub.gasto_codigo_referencia ?? "—"} />
                     </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                     <p className="mb-3 text-sm font-semibold">Deuda</p>
                     <div className="grid gap-3 sm:grid-cols-2">
                        <InfoField label="Monto total" value={money(sub.monto_total)} />
                        <InfoField label="Pagado" value={money(sub.pagado)} />
                        <InfoField label="Pendiente" value={sub.pendiente > 0 ? money(sub.pendiente) : "—"} />
                        <InfoField
                           label="Último pago"
                           value={sub.ultimo_pago_fecha ? fecha(sub.ultimo_pago_fecha) : "—"}
                        />
                     </div>
                     {sub.observaciones && (
                        <div className="mt-3">
                           <InfoField label="Observaciones" value={sub.observaciones} />
                        </div>
                     )}
                  </div>
               </div>
            </TabsContent>

            {/* ── PAGOS ── */}
            <TabsContent value="pagos" className="space-y-4">
               <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                     {pagos.length} pago{pagos.length === 1 ? "" : "s"}
                  </p>
                  {!saldada && (
                     <PermissionGuard resource="supplier" action="update">
                     <Button size="sm" onClick={() => setPagarOpen(true)}>
                        <HandCoins className="mr-2 size-4" /> Registrar pago
                     </Button>
                     </PermissionGuard>
                  )}
               </div>

               {pagos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground">
                     <Banknote className="size-10 opacity-30" />
                     <span>Aún no se han registrado pagos para este trabajo.</span>
                  </div>
               ) : (
                  <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                     <table className="w-full text-sm">
                        <thead>
                           <tr className="bg-brand-blue">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Ref.</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Método</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Concepto</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                           </tr>
                        </thead>
                        <tbody>
                           {pagos.map((p) => (
                              <tr key={p.id} className="border-b border-border/50">
                                 <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                    {p.codigoReferencia}
                                 </td>
                                 <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                    {fecha(p.fecha)}
                                 </td>
                                 <td className="px-4 py-3 text-muted-foreground">{p.metodo_pago}</td>
                                 <td className="px-4 py-3">{p.concepto ?? "—"}</td>
                                 <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                    {money(p.monto_pagado)}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </TabsContent>

            {/* ── APUNTES ── */}
            <TabsContent value="apuntes" className="space-y-4">
               <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                     {apuntes.length} apunte{apuntes.length === 1 ? "" : "s"}
                  </p>
                  <PermissionGuard resource="supplier" action="update">
                  <Button size="sm" onClick={() => setApunteOpen(true)}>
                     <ClipboardList className="mr-2 size-4" /> Nuevo apunte
                  </Button>
                  </PermissionGuard>
               </div>

               {apuntes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground">
                     <ClipboardList className="size-10 opacity-30" />
                     <span>Sin apuntes. Registra avances, acuerdos u observaciones del trabajo.</span>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {apuntes.map((a) => (
                        <div key={a.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                           <p className="whitespace-pre-wrap text-sm">{a.texto}</p>
                           <p className="mt-2 text-xs text-muted-foreground">
                              {a.created_by_name ?? "Usuario"} · {fechaHora(a.created_at)}
                           </p>
                        </div>
                     ))}
                  </div>
               )}
            </TabsContent>
         </Tabs>

         <PagarDialog
            open={pagarOpen}
            onOpenChange={setPagarOpen}
            id={id}
            pendiente={sub.pendiente}
            codigoReferencia={sub.codigoReferencia}
            onDone={async () => {
               setPagarOpen(false);
               const [data, p] = await Promise.all([GetSubcontratacionById(id), GetPagos(id)]);
               setSub(data);
               setPagos(p);
            }}
         />

         <ApunteDialog
            open={apunteOpen}
            onOpenChange={setApunteOpen}
            id={id}
            onDone={async () => {
               setApunteOpen(false);
               setApuntes(await GetApuntes(id));
            }}
         />

         <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Cancelar trabajo</DialogTitle>
                  <DialogDescription>
                     Se eliminará lógicamente el registro de este trabajo. Indica el motivo.
                  </DialogDescription>
               </DialogHeader>
               <CancelTrabajoForm
                  onCancel={() => setDeleteOpen(false)}
                  onSubmit={handleDelete}
                  loading={actionLoading}
               />
            </DialogContent>
         </Dialog>
      </div>
      </PermissionGuard>
   );
}

function MiniStat({ label, value, red = false }: { label: string; value: string; red?: boolean }) {
   return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
         <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
         <p className={`mt-1 text-2xl font-bold ${red ? "text-red-600" : "text-foreground"}`}>{value}</p>
      </div>
   );
}

function PagarDialog({
   open,
   onOpenChange,
   id,
   pendiente,
   codigoReferencia,
   onDone,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   id: string;
   pendiente: number;
   codigoReferencia: string;
   onDone: () => Promise<void>;
}) {
   const [monto, setMonto] = useState("");
   const [metodo, setMetodo] = useState("TRANSFERENCIA");
   const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
   const [concepto, setConcepto] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (open) {
         setMonto(pendiente > 0 ? String(pendiente) : "");
         setMetodo("TRANSFERENCIA");
         setConcepto(`Pago a ${codigoReferencia}`);
         setFechaPago(new Date().toISOString().slice(0, 10));
         setError(null);
      }
   }, [open, pendiente, codigoReferencia]);

   const m = Number(monto);
   const invalido =
      !m || m <= 0 || m > pendiente + 0.01 || !fechaPago;

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!m || m <= 0) {
         setError("Indica un monto válido");
         return;
      }
      if (m > pendiente + 0.01) {
         setError(`El pago no puede superar el pendiente (${money(pendiente)})`);
         return;
      }
      setLoading(true);
      const { Pagar } = useSubcontratacionStore.getState();
      const result = await Pagar(id, {
         monto_pagado: m,
         metodo_pago: metodo,
         fecha: fechaPago,
         concepto: concepto.trim() || `Pago a ${codigoReferencia}`,
      });
      if (result instanceof Error) {
         setError(result.message);
         setLoading(false);
         return;
      }
      await onDone();
      setLoading(false);
   }

   const INPUT =
      "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 transition-colors";

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Registrar pago</DialogTitle>
               <DialogDescription>
                  {codigoReferencia} · Pendiente: <span className="font-semibold text-red-600">{money(pendiente)}</span>
               </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
               <div className="flex flex-col gap-1.5">
                  <Label>Monto (RD$) *</Label>
                  <div className="flex gap-2">
                     <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        required
                        className={INPUT}
                     />
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setMonto(String(pendiente))}
                        disabled={pendiente <= 0}
                     >
                        Todo el pendiente
                     </Button>
                  </div>
               </div>

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
                     <select
                        value={metodo}
                        onChange={(e) => setMetodo(e.target.value)}
                        className={INPUT}
                     >
                        {METODOS_PAGO.map((m) => (
                           <option key={m} value={m}>
                              {m}
                           </option>
                        ))}
                     </select>
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Concepto</Label>
                  <Input
                     value={concepto}
                     onChange={(e) => setConcepto(e.target.value)}
                     className={INPUT}
                  />
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
                  <Button type="submit" disabled={loading || invalido}>
                     {loading ? "Registrando…" : `Pagar ${money(m || 0)}`}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}

function ApunteDialog({
   open,
   onOpenChange,
   id,
   onDone,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   id: string;
   onDone: () => Promise<void>;
}) {
   const [texto, setTexto] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (open) {
         setTexto("");
         setError(null);
      }
   }, [open]);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!texto.trim()) {
         setError("El apunte no puede estar vacío");
         return;
      }
      setLoading(true);
      const { CrearApunte } = useSubcontratacionStore.getState();
      const result = await CrearApunte(id, texto.trim());
      if (result instanceof Error) {
         setError(result.message);
         setLoading(false);
         return;
      }
      await onDone();
      setLoading(false);
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Nuevo apunte</DialogTitle>
               <DialogDescription>Notas de avance, acuerdos u observaciones del trabajo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
               <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={4}
                  placeholder="Escribe el apunte..."
                  className="w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
               />
               {error && (
                  <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
                     {error}
                  </div>
               )}
               <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                     Cancelar
                  </Button>
                  <Button type="submit" disabled={loading || !texto.trim()}>
                     {loading ? "Guardando…" : "Guardar apunte"}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}

function CancelTrabajoForm({
   onCancel,
   onSubmit,
   loading,
}: {
   onCancel: () => void;
   onSubmit: (reason: string) => Promise<void>;
   loading: boolean;
}) {
   const [reason, setReason] = useState("");
   const [error, setError] = useState<string | null>(null);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!reason.trim()) {
         setError("Debes indicar el motivo");
         return;
      }
      await onSubmit(reason.trim());
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
         <div className="flex flex-col gap-1.5">
            <Label>Motivo *</Label>
            <textarea
               value={reason}
               onChange={(e) => setReason(e.target.value)}
               rows={3}
               placeholder="Ej: El trabajo se realizó por el equipo interno"
               className="w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
         </div>
         {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
               {error}
            </div>
         )}
         <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
               Volver
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
               {loading ? "Procesando…" : "Cancelar trabajo"}
            </Button>
         </DialogFooter>
      </form>
   );
}
