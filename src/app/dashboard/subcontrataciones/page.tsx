"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   ChevronLeft,
   ChevronRight,
   Eye,
   HardHat,
   Loader2,
   Plus,
} from "lucide-react";
import {
   useSubcontratacionStore,
} from "@/stores/useSubcontratacionStore";
import type { CreateSubcontratacionForm, EstadoTrabajo, EstadoPago } from "@/dtos/subcontratacion.dto";
import { SelectBuscadorProveedor } from "@/components/shared/selectBuscadorProveedor";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";
import { SelectBuscadorEquipo } from "@/components/shared/selectBuscadorEquipo";
import { PermissionGuard } from "@/components/permission-guard";
import { SelectBuscadorCategoriaGasto } from "@/components/shared/selectBuscadorCategoriaGasto";

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fecha = (s: string | Date) =>
   new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
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

function Tarjeta({ label, valor, acento }: { label: string; valor: string; acento?: string }) {
   return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
         <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
         <p className={`text-xl font-bold ${acento ?? "text-brand-blue dark:text-blue-400"}`}>{valor}</p>
      </div>
   );
}

export default function SubcontratacionesPage() {
   const router = useRouter();
   const {
      subcontrataciones,
      resumen,
      total,
      page,
      pageSize,
      filtros,
      loading,
      error,
      GetSubcontrataciones,
      SetFiltros,
      NextPage,
      PrevPage,
   } = useSubcontratacionStore();

   const [createOpen, setCreateOpen] = useState(false);

   useEffect(() => {
      document.title = "Subcontrataciones";
      GetSubcontrataciones();
   }, [GetSubcontrataciones]);

   const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
   const hasta = Math.min(page * pageSize, total);

   return (
      <PermissionGuard resource="supplier" action="read" mode="page">
         <div className="flex flex-col gap-6 p-6">
            <div className="flex items-start justify-between gap-4">
               <div>
                  <div className="flex items-center gap-3">
                     <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
                     <HardHat className="size-7 text-brand-blue dark:text-blue-400" />
                     <h1 className="text-3xl font-bold tracking-tight text-brand-blue dark:text-white">
                        Subcontrataciones
                     </h1>
                  </div>
                  <p className="mt-1 pl-[calc(0.375rem+0.75rem)] text-sm text-muted-foreground">
                     Trabajos de subcontratistas, su etapa y la deuda que se les debe. El pendiente se
                     calcula restando los pagos registrados a cada trabajo.
                  </p>
               </div>
               <PermissionGuard resource="supplier" action="create">
                  <Button
                     className="bg-brand-yellow font-semibold text-brand-black shadow-md shadow-brand-yellow/30 hover:bg-yellow-300 border-0"
                     onClick={() => setCreateOpen(true)}
                  >
                     <Plus className="mr-2 size-4" />
                     Nueva subcontratación
                  </Button>
               </PermissionGuard>
            </div>

            {/* ── Resumen ── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
               <Tarjeta label="Total pendiente" valor={money(resumen.total_pendiente)} acento="text-red-600" />
               <Tarjeta label="Deuda total" valor={money(resumen.total_deuda)} />
               <Tarjeta
                  label="Trabajos abiertos"
                  valor={String(resumen.pendientes_trabajo + resumen.en_progreso_trabajo)}
               />
               <Tarjeta label="Terminadas" valor={String(resumen.terminadas_trabajo)} />
            </div>

            {/* ── Filtros ── */}
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
               <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Buscar</label>
                  <Input
                     placeholder="Descripción, subcontratista o referencia"
                     defaultValue={filtros.busqueda ?? ""}
                     onKeyDown={(e) => {
                        if (e.key === "Enter") SetFiltros({ busqueda: e.currentTarget.value });
                     }}
                     onBlur={(e) => {
                        if ((filtros.busqueda ?? "") !== e.target.value)
                           SetFiltros({ busqueda: e.target.value });
                     }}
                  />
               </div>

               <div className="w-56">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Subcontratista</label>
                  <SelectBuscadorProveedor
                     filterTipos={["SUB_CONTRATISTA", "AMBOS"]}
                     value={filtros.proveedor_id}
                     onChange={(id) => SetFiltros({ proveedor_id: id ?? undefined })}
                     placeholder="Buscar subcontratista..."
                  />
               </div>

               <div className="w-56">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Proyecto</label>
                  <SelectBuscadorProyecto
                     value={filtros.proyecto_id}
                     onChange={(id) => SetFiltros({ proyecto_id: id ?? undefined })}
                     placeholder="Buscar proyecto..."
                  />
               </div>

               <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado trabajo</label>
                  <div className="flex gap-1 flex-wrap">
                     {([undefined, "PENDIENTE", "EN_PROGRESO", "TERMINADA", "CANCELADA"] as (EstadoTrabajo | undefined)[]).map((e) => (
                        <Button
                           key={e ?? "todos"}
                           size="sm"
                           variant={filtros.estado_trabajo === e ? "default" : "outline"}
                           onClick={() => SetFiltros({ estado_trabajo: e })}
                        >
                           {e === undefined ? "Todos" : ESTADO_TRABAJO_LABEL[e]}
                        </Button>
                     ))}
                  </div>
               </div>

               <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado pago</label>
                  <div className="flex gap-1 flex-wrap">
                     {(["PENDIENTE", "PARCIAL"] as EstadoPago[]).map((e) => (
                        <Button
                           key={e}
                           size="sm"
                           variant={filtros.estado_pago === e ? "default" : "outline"}
                           onClick={() => SetFiltros({ estado_pago: e })}
                        >
                           {e === "PENDIENTE" ? "Sin pagos" : "Parcial"}
                        </Button>
                     ))}
                     <Button
                        size="sm"
                        variant={filtros.incluir_pagadas ? "default" : "outline"}
                        onClick={() =>
                           SetFiltros({
                              incluir_pagadas: !filtros.incluir_pagadas,
                              estado_pago: undefined,
                           })
                        }
                        title="Incluir también los trabajos ya saldados"
                     >
                        Pagadas
                     </Button>
                  </div>
               </div>

               <div className="flex items-end gap-2">
                  <div>
                     <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
                     <Input
                        type="date"
                        className="h-10 w-40"
                        value={filtros.fecha_desde ?? ""}
                        onChange={(e) => SetFiltros({ fecha_desde: e.target.value || undefined })}
                     />
                  </div>
                  <div>
                     <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
                     <Input
                        type="date"
                        className="h-10 w-40"
                        value={filtros.fecha_hasta ?? ""}
                        onChange={(e) => SetFiltros({ fecha_hasta: e.target.value || undefined })}
                     />
                  </div>
               </div>
            </div>

            {error && (
               <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {error}
               </div>
            )}

            {/* ── Tabla ── */}
            {loading ? (
               <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
               </div>
            ) : subcontrataciones.length === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground">
                  <HardHat className="size-10 opacity-30" />
                  <span>No hay subcontrataciones con los filtros actuales.</span>
               </div>
            ) : (
               <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="bg-brand-blue">
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Ref.</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Subcontratista</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Equipo</th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha deuda</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pagado</th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Pago</th>
                           <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Ver</th>
                        </tr>
                     </thead>
                     <tbody>
                        {subcontrataciones.map((s) => (
                           <tr
                              key={s.id}
                              className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-blue/5"
                              onClick={() => router.push(`/dashboard/subcontrataciones/${s.id}`)}
                           >
                              <td className="px-4 py-3">
                                 <span className="font-mono font-medium text-brand-blue">{s.codigoReferencia}</span>
                                 {s.proyecto_nombre && (
                                    <div className="text-[10px] uppercase text-muted-foreground">{s.proyecto_nombre}</div>
                                 )}
                              </td>
                              <td className="px-4 py-3">
                                 <div className="font-medium">{s.proveedor_nombre ?? "—"}</div>
                                 {s.proveedor_rnc && (
                                    <div className="text-xs text-muted-foreground">{s.proveedor_rnc}</div>
                                 )}
                              </td>
                              <td className="max-w-[240px] px-4 py-3">
                                 <div className="truncate" title={s.trabajo_descripcion ?? ""}>
                                    {s.trabajo_descripcion ?? "—"}
                                 </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                 {s.equipo_nombre ? (
                                    <div>
                                       <span className="font-mono text-xs text-brand-blue">{s.equipo_codigo_referencia}</span>
                                       <span className="ml-1 text-muted-foreground">{s.equipo_nombre}</span>
                                    </div>
                                 ) : (
                                    "—"
                                 )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                 {fecha(s.fecha_deuda)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                 {money(s.monto_total)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                                 {s.pagado > 0 ? money(s.pagado) : "—"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-600">
                                 {s.pendiente > 0 ? money(s.pendiente) : "—"}
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
                              <td className="px-4 py-3 text-center">
                                 <button
                                    className="rounded-md p-1.5 text-brand-blue transition-colors hover:bg-brand-blue/10"
                                    title="Ver detalle"
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       router.push(`/dashboard/subcontrataciones/${s.id}`);
                                    }}
                                 >
                                    <Eye className="size-4" />
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            {/* ── Paginación ── */}
            {total > pageSize && (
               <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                     Mostrando {desde}–{hasta} de {total}
                  </p>
                  <div className="flex gap-2">
                     <Button variant="outline" size="sm" disabled={page <= 1} onClick={PrevPage}>
                        <ChevronLeft className="size-4" /> Anterior
                     </Button>
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={page * pageSize >= total}
                        onClick={NextPage}
                     >
                        Siguiente <ChevronRight className="size-4" />
                     </Button>
                  </div>
               </div>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
               <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                     <DialogTitle>Nueva subcontratación</DialogTitle>
                     <DialogDescription>
                        Registra el trabajo de un subcontratista. La deuda nace junto con el gasto
                        correspondiente en la misma transacción.
                     </DialogDescription>
                  </DialogHeader>
                  <SubcontratacionForm
                     onCancel={() => setCreateOpen(false)}
                     onCreated={() => setCreateOpen(false)}
                  />
               </DialogContent>
            </Dialog>
         </div>
      </PermissionGuard>
   );
}

function SubcontratacionForm({
   onCancel,
   onCreated,
}: {
   onCancel: () => void;
   onCreated: () => void;
}) {
   const { CreateSubcontratacion } = useSubcontratacionStore();
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [form, setForm] = useState<CreateSubcontratacionForm>({
      proveedor_id: "",
      proyecto_id: null,
      equipo_id: null,
      trabajo_descripcion: "",
      monto_total: 0,
      estado: "PENDIENTE",
      fecha_deuda: new Date().toISOString().slice(0, 10) as unknown as Date,
      fecha_inicio: null,
      fecha_fin: null,
      observaciones: "",
      categoria_gasto_id: "",
   });

   function set<K extends keyof CreateSubcontratacionForm>(key: K, value: CreateSubcontratacionForm[K]) {
      setForm((prev) => ({ ...prev, [key]: value }));
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
         const result = await CreateSubcontratacion({
            ...form,
            trabajo_descripcion: form.trabajo_descripcion?.trim() || null,
            observaciones: form.observaciones?.trim() || null,
            monto_total: Number(form.monto_total),
         });
         if (result instanceof Error) throw result;
         onCreated();
      } catch (err: any) {
         setError(err?.message ?? "Ocurrió un error al guardar");
      } finally {
         setLoading(false);
      }
   }

   const INPUT =
      "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 transition-colors";
   const SELECION =
      "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 transition-colors";

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
         <div className="flex flex-col gap-1.5">
            <Label>Subcontratista *</Label>
            <SelectBuscadorProveedor
               filterTipos={["SUB_CONTRATISTA", "AMBOS"]}
               value={form.proveedor_id}
               onChange={(id) => set("proveedor_id", id ?? "")}
               placeholder="Buscar subcontratista por nombre o RNC..."
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Proyecto</Label>
            <SelectBuscadorProyecto
               value={form.proyecto_id}
               onChange={(id) => set("proyecto_id", id)}
               placeholder="Buscar proyecto (opcional)..."
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Equipo</Label>
            <SelectBuscadorEquipo
               value={form.equipo_id}
               onChange={(id) => set("equipo_id", id)}
               placeholder="Buscar equipo (opcional)..."
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Descripción del trabajo</Label>
            <Input
               value={form.trabajo_descripcion ?? ""}
               onChange={(e) => set("trabajo_descripcion", e.target.value)}
               placeholder="Ej: Soldadura de estructura en..."
            />
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label>Monto total (RD$) *</Label>
               <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.monto_total}
                  onChange={(e) => set("monto_total", Number(e.target.value))}
                  required
                  className={INPUT}
               />
            </div>
            <div className="flex flex-col gap-1.5">
               <Label>Estado del trabajo</Label>
               <select
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value as any)}
                  className={SELECION}
               >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROGRESO">En progreso</option>
                  <option value="TERMINADA">Terminada</option>
                  <option value="CANCELADA">Cancelada</option>
               </select>
            </div>
         </div>

         <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label>Fecha deuda *</Label>
               <Input
                  type="date"
                  value={new Date(form.fecha_deuda).toISOString().slice(0, 10)}
                  onChange={(e) => set("fecha_deuda", e.target.value as unknown as Date)}
                  required
                  className={INPUT}
               />
            </div>
            <div className="flex flex-col gap-1.5">
               <Label>Inicio</Label>
               <Input
                  type="date"
                  value={form.fecha_inicio ? new Date(form.fecha_inicio).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("fecha_inicio", e.target.value ? (e.target.value as unknown as Date) : null)}
                  className={INPUT}
               />
            </div>
            <div className="flex flex-col gap-1.5">
               <Label>Fin</Label>
               <Input
                  type="date"
                  value={form.fecha_fin ? new Date(form.fecha_fin).toISOString().slice(0, 10) : ""}
                  onChange={(e) => set("fecha_fin", e.target.value ? (e.target.value as unknown as Date) : null)}
                  className={INPUT}
               />
            </div>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Categoría de gasto *</Label>
            <SelectBuscadorCategoriaGasto
               value={form.categoria_gasto_id}
               onChange={(id) => set("categoria_gasto_id", id ?? "")}
               placeholder="Buscar categoría (ej. Mano de obra)..."
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Observaciones</Label>
            <textarea
               value={form.observaciones ?? ""}
               onChange={(e) => set("observaciones", e.target.value)}
               placeholder="Notas del trabajo..."
               rows={3}
               className="w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
         </div>

         {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
               {error}
            </div>
         )}

         <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
               Cancelar
            </Button>
            <Button type="submit" disabled={loading || !form.proveedor_id}>
               {loading ? "Guardando…" : "Crear subcontratación"}
            </Button>
         </div>
      </form>
   );
}
