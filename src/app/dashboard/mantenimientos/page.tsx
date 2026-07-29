"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Wrench } from "lucide-react";
import { TableSearch } from "@/components/table-search";
import { PermissionGuard } from "@/components/permission-guard";
import { useMantenimientoStore } from "@/stores/useMantenimientoStore";
import {
   ESTADOS_MANTENIMIENTO,
   ESTADO_MANTENIMIENTO_BADGE,
   ESTADO_MANTENIMIENTO_LABEL,
   TIPOS_MANTENIMIENTO,
   TIPO_MANTENIMIENTO_BADGE,
   TIPO_MANTENIMIENTO_LABEL,
   type CloseMantenimientoForm,
   type CreateMantenimientoForm,
   type EstadoMantenimiento,
   type Mantenimiento,
   type TipoMantenimiento,
} from "@/dtos/mantenimiento.dto";
import { MantenimientoFormDialog } from "./components/mantenimiento-form-dialog";
import { CerrarMantenimientoDialog } from "./components/cerrar-mantenimiento-dialog";

const STAT_STYLES = {
   blue: {
      card: "bg-brand-blue shadow-lg shadow-brand-blue/20",
      label: "text-blue-200",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
   yellow: {
      card: "bg-brand-yellow shadow-lg shadow-brand-yellow/30",
      label: "text-yellow-700",
      value: "text-brand-black",
      bar: "bg-brand-blue",
   },
   dark: {
      card: "bg-brand-black shadow-lg shadow-black/30",
      label: "text-gray-400",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
} as const;

const SELECT_CLASS =
   "h-9 rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

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

export default function MantenimientosPage() {
   const {
      Mantenimientos,
      loading,
      GetMantenimientos,
      CreateMantenimiento,
      CloseMantenimiento,
   } = useMantenimientoStore();

   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [estadoFilter, setEstadoFilter] = useState<EstadoMantenimiento | "">("");
   const [tipoFilter, setTipoFilter] = useState<TipoMantenimiento | "">("");

   const [createOpen, setCreateOpen] = useState(false);
   const [cerrarTarget, setCerrarTarget] = useState<Mantenimiento | null>(null);
   const [dialogLoading, setDialogLoading] = useState(false);
   const [dialogError, setDialogError] = useState<string | null>(null);

   useEffect(() => {
      document.title = "Mantenimientos";
   }, []);

   useEffect(() => {
      GetMantenimientos({
         search,
         estado: estadoFilter || undefined,
         tipo: tipoFilter || undefined,
         force: true,
      }).catch(() => { });
   }, [search, estadoFilter, tipoFilter, GetMantenimientos]);

   const stats = useMemo(() => {
      const enProceso = Mantenimientos.filter((m) => m.estado === "EN_PROCESO").length;
      const costoTotal = Mantenimientos.reduce((acc, m) => acc + (m.costo ?? 0), 0);
      return { total: Mantenimientos.length, enProceso, costoTotal };
   }, [Mantenimientos]);

   async function handleCreate(data: CreateMantenimientoForm) {
      setDialogLoading(true);
      setDialogError(null);
      try {
         const result = await CreateMantenimiento(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } catch (err) {
         setDialogError(err instanceof Error ? err.message : "Error al registrar el mantenimiento");
      } finally {
         setDialogLoading(false);
      }
   }

   async function handleCerrar(data: CloseMantenimientoForm) {
      if (!cerrarTarget) return;
      setDialogLoading(true);
      setDialogError(null);
      try {
         const result = await CloseMantenimiento(cerrarTarget.id, data);
         if (result instanceof Error) throw result;
         await GetMantenimientos({
            search,
            estado: estadoFilter || undefined,
            tipo: tipoFilter || undefined,
            force: true,
         });
         setCerrarTarget(null);
      } catch (err) {
         setDialogError(err instanceof Error ? err.message : "Error al cerrar el mantenimiento");
      } finally {
         setDialogLoading(false);
      }
   }

   return (
      <PermissionGuard resource="machinery" action="read" mode="page">
         <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div>
               <div className="flex items-center gap-3">
                  <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
                  <Wrench className="size-7 text-brand-blue dark:text-blue-400" />
                  <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                     Mantenimientos
                  </h1>
               </div>
               <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
                  Historial de mantenimientos de la maquinaria y su costo asociado
               </p>
               <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
               <StatCard label="Total Registros" value={stats.total} accent="blue" />
               <StatCard label="En Proceso" value={stats.enProceso} accent="yellow" />
               <StatCard label="Costo Acumulado" value={formatMoney(stats.costoTotal)} accent="dark" />
            </div>

            {/* Search + filters + actions */}
            <div className="flex flex-wrap items-center gap-3">
               <TableSearch
                  value={searchInput}
                  onValueChange={setSearchInput}
                  onSearch={setSearch}
                  placeholder="Buscar por equipo, taller o descripción..."
                  debounceDelay={350}
                  className="w-full max-w-sm"
               />

               <select
                  className={SELECT_CLASS}
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value as EstadoMantenimiento | "")}
               >
                  <option value="">Todos los estados</option>
                  {ESTADOS_MANTENIMIENTO.map((e) => (
                     <option key={e} value={e}>
                        {ESTADO_MANTENIMIENTO_LABEL[e]}
                     </option>
                  ))}
               </select>

               <select
                  className={SELECT_CLASS}
                  value={tipoFilter}
                  onChange={(e) => setTipoFilter(e.target.value as TipoMantenimiento | "")}
               >
                  <option value="">Todos los tipos</option>
                  {TIPOS_MANTENIMIENTO.map((t) => (
                     <option key={t} value={t}>
                        {TIPO_MANTENIMIENTO_LABEL[t]}
                     </option>
                  ))}
               </select>

               <div className="ml-auto">
                  <PermissionGuard resource="machinery" action="create">
                     <Button
                        onClick={() => {
                           setDialogError(null);
                           setCreateOpen(true);
                        }}
                        className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0"
                     >
                        <Plus className="size-4 mr-2" />
                        Nuevo Mantenimiento
                     </Button>
                  </PermissionGuard>
               </div>
            </div>

            {/* Table */}
            {loading ? (
               <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
                  <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
                  Cargando mantenimientos…
               </div>
            ) : Mantenimientos.length === 0 ? (
               <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-muted-foreground">
                  <Wrench className="size-10 opacity-30" />
                  <p className="text-sm">No hay mantenimientos registrados.</p>
               </div>
            ) : (
               <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="border-b border-border bg-muted/40">
                           <Th>Código</Th>
                           <Th>Equipo</Th>
                           <Th>Tipo</Th>
                           <Th>Descripción</Th>
                           <Th>Taller</Th>
                           <Th>Fechas</Th>
                           <Th className="text-right">Costo</Th>
                           <Th>Estado</Th>
                           <Th className="text-right">Acciones</Th>
                        </tr>
                     </thead>
                     <tbody>
                        {Mantenimientos.map((m) => (
                           <tr key={m.id} className="border-t border-border hover:bg-muted/20">
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                 {m.codigoReferencia}
                              </td>
                              <td className="px-4 py-3">
                                 <Link
                                    href={`/dashboard/equipos/${m.equipo_id}`}
                                    className="font-medium text-brand-blue hover:underline"
                                 >
                                    {m.equipo_nombre}
                                 </Link>
                                 {m.equipo_placa && (
                                    <span className="block text-xs text-muted-foreground">
                                       {m.equipo_placa}
                                    </span>
                                 )}
                              </td>
                              <td className="px-4 py-3">
                                 <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${TIPO_MANTENIMIENTO_BADGE[m.tipo]}`}
                                 >
                                    {TIPO_MANTENIMIENTO_LABEL[m.tipo]}
                                 </span>
                              </td>
                              <td className="max-w-xs px-4 py-3">
                                 <p className="truncate" title={m.descripcion}>
                                    {m.descripcion}
                                 </p>
                                 {m.trabajo_realizado && (
                                    <p
                                       className="truncate text-xs text-muted-foreground"
                                       title={m.trabajo_realizado}
                                    >
                                       {m.trabajo_realizado}
                                    </p>
                                 )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{m.taller ?? "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                 {formatDate(m.fecha_inicio)} →{" "}
                                 {m.fecha_fin ? formatDate(m.fecha_fin) : "En proceso"}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                 {m.costo != null ? formatMoney(m.costo) : "—"}
                                 {m.gastos.length > 0 && (
                                    <span className="block text-xs font-normal text-muted-foreground">
                                       {m.gastos.length} gasto{m.gastos.length === 1 ? "" : "s"}
                                    </span>
                                 )}
                              </td>
                              <td className="px-4 py-3">
                                 <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ESTADO_MANTENIMIENTO_BADGE[m.estado]}`}
                                 >
                                    {ESTADO_MANTENIMIENTO_LABEL[m.estado]}
                                 </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                 {m.fecha_fin === null && (
                                    <PermissionGuard resource="machinery" action="update">
                                       <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                             setDialogError(null);
                                             setCerrarTarget(m);
                                          }}
                                       >
                                          Cerrar
                                       </Button>
                                    </PermissionGuard>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            <MantenimientoFormDialog
               open={createOpen}
               onOpenChange={(open) => {
                  if (!open) {
                     setCreateOpen(false);
                     setDialogError(null);
                  }
               }}
               onSubmit={handleCreate}
               loading={dialogLoading}
               error={dialogError}
               title="Nuevo mantenimiento"
               description="Registra un mantenimiento y asócialo a un equipo."
            />

            <CerrarMantenimientoDialog
               open={cerrarTarget !== null}
               onOpenChange={(open) => {
                  if (!open) {
                     setCerrarTarget(null);
                     setDialogError(null);
                  }
               }}
               mantenimiento={cerrarTarget}
               onSubmit={handleCerrar}
               loading={dialogLoading}
               error={dialogError}
               description="Registra qué se hizo para cerrar este mantenimiento."
            />
         </div>
      </PermissionGuard>
   );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
   return (
      <th
         className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${className}`}
      >
         {children}
      </th>
   );
}

function StatCard({
   label,
   value,
   accent,
}: {
   label: string;
   value: number | string;
   accent: keyof typeof STAT_STYLES;
}) {
   const s = STAT_STYLES[accent];
   return (
      <div className={`rounded-xl ${s.card} p-5`}>
         <p className={`text-sm font-medium ${s.label}`}>{label}</p>
         <p className={`mt-1 text-4xl font-bold ${s.value}`}>{value}</p>
         <div className={`mt-3 h-1 w-10 rounded-full ${s.bar}`} />
      </div>
   );
}
