"use client";

import { Profiler, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   ArrowLeft,
   History,
   Loader2,
   Pencil,
   PersonStanding,
   ShoppingCart,
   Truck,
   User2,
   UserCircle,
   UserRound,
   UsersRoundIcon,
   UserX2,
} from "lucide-react";
import type {
   Equipo,
   EquipoCompraItem,
   EquipoEstadoHistorial,
   EstadoEquipo,
} from "@/dtos/equipo.dto";
import { ESTADOS_EQUIPO } from "@/dtos/equipo.dto";
import { useEquipoStore } from "@/stores/useEquipoStore";
import {
   ESTADO_BADGE,
   ESTADO_LABEL,
} from "../components/equipo-labels";
import { EquipoForm, type EquipoFormValues } from "../components/equipo-form";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";
import { Employee, OperadorAsignable } from "@/dtos/employee.dto";
import { OperadorProps } from "@/backend/modules/employees/domain/employees.domain";
import { CategoriaEquipoManager } from "../components/categoria-equipo-manager";

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function formatDate(value: string | Date): string {
   return new Date(value).toLocaleDateString("es-DO");
}

function formatDateTime(value: string | Date): string {
   const d = new Date(value);
   return (
      d.toLocaleDateString("es-DO") +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
   );
}

export default function EquipoDetailPage() {

   const params = useParams();
   const router = useRouter();
   const equipoId = params.id as string;

   const { ChangeEstado, UpdateEquipo, GetCategoriasEquipoByEquipoId, GetOperadorByEquipoId } = useEquipoStore();

   const [equipo, setEquipo] = useState<Equipo | null>(null);
   const [categoria, setCategoria] = useState<CategoriaEquipo | null>(null);
   const [operador, setOperador] = useState<OperadorAsignable | null>(null);
   const [compras, setCompras] = useState<EquipoCompraItem[]>([]);
   const [historial, setHistorial] = useState<EquipoEstadoHistorial[]>([]);
   const [loading, setLoading] = useState(true);
   const [estadoLoading, setEstadoLoading] = useState(false);
   const [estadoError, setEstadoError] = useState<string | null>(null);
   const [editOpen, setEditOpen] = useState(false);
   const [editLoading, setEditLoading] = useState(false);
   const [manageOpen, setManageOpen] = useState(false);
   const [manageMedidasOpen, setManageMedidasOpen] = useState(false);

   async function loadAll(active = { value: true }) {
      try {
         const [equipoRes, comprasRes, historialRes] = await Promise.all([
            fetch(`/api/equipos/${equipoId}`),
            fetch(`/api/equipos/${equipoId}/compras`),
            fetch(`/api/equipos/${equipoId}/historial`),
         ]);
         if (!equipoRes.ok) throw new Error("Not found");
         const equipoData: Equipo = await equipoRes.json();
         const comprasData: EquipoCompraItem[] = comprasRes.ok
            ? await comprasRes.json()
            : [];
         const historialData: EquipoEstadoHistorial[] = historialRes.ok
            ? await historialRes.json()
            : [];
         const categoria = await GetCategoriasEquipoByEquipoId(equipoId);
         setCategoria(categoria);
         const operadors = await GetOperadorByEquipoId(equipoId);
         setOperador(operadors);
         if (active.value) {
            setEquipo(equipoData);
            setCompras(comprasData);
            setHistorial(historialData);
         }
      } catch {
         if (active.value) setEquipo(null);
      } finally {
         if (active.value) setLoading(false);
      }
   }

   useEffect(() => {
      document.title = `Equipo - ${equipo?.nombre ?? "Cargando..."}`;
   }, [equipo]);

   useEffect(() => {
      const active = { value: true };
      setLoading(true);
      loadAll(active);
      return () => {
         active.value = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [equipoId]);

   async function handleEstadoChange(nuevoEstado: EstadoEquipo) {
      if (!equipo || nuevoEstado === equipo.estado) return;
      setEstadoLoading(true);
      setEstadoError(null);
      try {
         const result = await ChangeEstado(equipoId, nuevoEstado);
         if (result instanceof Error) throw result;
         await loadAll();
      } catch (err) {
         setEstadoError(err instanceof Error ? err.message : "Error al cambiar el estado");
      } finally {
         setEstadoLoading(false);
      }
   }

   async function handleEdit(data: EquipoFormValues) {
      setEditLoading(true);
      try {
         const result = await UpdateEquipo(equipoId, {
            nombre: data.nombre,
            categoria_id: data.categoria_id,
            operador_id: data.operador_id || null,
            estado: data.estado,
            placa: data.placa || null,
            modelo: data.modelo || null,
            ano: data.ano === "" ? null : Number(data.ano),
         });
         if (result instanceof Error) throw result;
         await loadAll();
         setEditOpen(false);
      } finally {
         setEditLoading(false);
      }
   }

   if (loading && !equipo) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }


   if (!equipo) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <Truck className="size-12 opacity-30" />
            <p>Equipo no encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/equipos")}>
               <ArrowLeft className="mr-2 size-4" />
               Volver
            </Button>
         </div>
      );
   }

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/dashboard/equipos")}
               >
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                        {equipo.nombre}
                     </h1>
                     <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[equipo.estado]}`}
                     >
                        {ESTADO_LABEL[equipo.estado]}
                     </span>
                  </div>
                  <p className="text-sm bg-brand-blue text-white rounded-lg px-2 py-1 inline-flex items-center gap-1">
                     <UserRound className="inline-block w-5 h-5" /> <span className="font-semibold">{operador?.nombre ?? "No hay asignado"}</span>

                  </p>
                  <p className="text-sm text-muted-foreground">
                     Registrado el {formatDate(equipo.created_at)}
                  </p>
               </div>
            </div>

            {/* Actions: edit + inline estado change */}
            <div className="flex flex-col items-start gap-3 lg:items-end">
               <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
               </Button>

               <div className="flex flex-col items-start gap-1.5 lg:items-end">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                     Cambiar estado
                  </label>
                  <div className="flex items-center gap-2">
                     <select
                        value={equipo.estado}
                        onChange={(e) => handleEstadoChange(e.target.value as EstadoEquipo)}
                        disabled={estadoLoading}
                        className={`${SELECT_CLASS} w-56 disabled:opacity-60`}
                     >
                        {ESTADOS_EQUIPO.map((estado) => (
                           <option key={estado} value={estado}>
                              {ESTADO_LABEL[estado]}
                           </option>
                        ))}
                     </select>
                     {estadoLoading && (
                        <Loader2 className="size-4 animate-spin text-brand-blue" />
                     )}
                  </div>
                  {estadoError && (
                     <p className="text-xs text-destructive">{estadoError}</p>
                  )}
               </div>
            </div>
         </div>

         {/* Info card */}
         <Card>
            <CardHeader>
               <CardTitle>Información del equipo</CardTitle>
               <CardDescription>Datos generales de la maquinaria.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoField label="Categoría" value={equipo.categoria_nombre} />
                  <InfoField
                     label="Tarifas Aplicables"
                     value={
                        categoria?.tarifas?.length
                           ? categoria.tarifas.map(t => `${t.nombre}: $${t.precio_unitario}`).join(" | ")
                           : "Sin tarifas asignadas"
                     }
                  />
                  <InfoField label="Placa" value={equipo.placa ?? "—"} />
                  <InfoField label="Modelo" value={equipo.modelo ?? "—"} />
                  <InfoField label="Año" value={equipo.ano != null ? String(equipo.ano) : "—"} />
                  <InfoField label="Estado" value={ESTADO_LABEL[equipo.estado]} />
                  <InfoField label="Última actualización" value={formatDate(equipo.updated_at)} />
               </div>
            </CardContent>
         </Card>

         {/* Purchased items */}
         <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="size-5 text-brand-blue" />
                  Artículos comprados
               </CardTitle>
               <CardDescription>
                  Ítems de órdenes de compra registrados para este equipo.
               </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               {compras.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                     Sin artículos registrados para este equipo.
                  </div>
               ) : (
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm">
                        <thead>
                           <tr className="border-b border-border bg-muted/40">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Orden
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Fecha
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Descripción
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Cantidad
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 P. Unitario
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Subtotal
                              </th>
                           </tr>
                        </thead>
                        <tbody>
                           {compras.map((item) => (
                              <tr
                                 key={item.id}
                                 className="border-t border-border hover:bg-muted/20"
                              >
                                 <td className="px-4 py-3">
                                    <Link
                                       href={`/dashboard/compras/${item.orden_compra_id}`}
                                       className="font-medium text-brand-blue hover:underline"
                                    >
                                       {item.orden_compra_id.slice(0, 8)}…
                                    </Link>
                                 </td>
                                 <td className="px-4 py-3 text-muted-foreground">
                                    {formatDate(item.orden_fecha)}
                                 </td>
                                 <td className="px-4 py-3">{item.descripcion}</td>
                                 <td className="px-4 py-3 text-right">{item.cantidad}</td>
                                 <td className="px-4 py-3 text-right">
                                    {formatMoney(item.precio_unitario)}
                                 </td>
                                 <td className="px-4 py-3 text-right font-semibold">
                                    {formatMoney(item.subtotal)}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </CardContent>
         </Card>

         {/* Estado history */}
         <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <History className="size-5 text-brand-blue" />
                  Historial de estados
               </CardTitle>
               <CardDescription>Cambios de estado registrados para este equipo.</CardDescription>
            </CardHeader>
            <CardContent>
               {historial.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                     Aún no hay cambios de estado registrados.
                  </div>
               ) : (
                  <ul className="flex flex-col gap-3">
                     {historial.map((h) => (
                        <li
                           key={h.id}
                           className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                           <div className="flex flex-wrap items-center gap-2 text-sm">
                              {h.estado_anterior ? (
                                 <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[h.estado_anterior]}`}
                                 >
                                    {ESTADO_LABEL[h.estado_anterior]}
                                 </span>
                              ) : (
                                 <span className="text-xs text-muted-foreground">Inicial</span>
                              )}
                              <span className="text-muted-foreground">→</span>
                              <span
                                 className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[h.estado_nuevo]}`}
                              >
                                 {ESTADO_LABEL[h.estado_nuevo]}
                              </span>
                              {h.nota && (
                                 <span className="text-xs text-muted-foreground">— {h.nota}</span>
                              )}
                           </div>
                           <div className="text-xs text-muted-foreground">
                              {h.changed_by_name ?? "Sistema"} · {formatDateTime(h.created_at)}
                           </div>
                        </li>
                     ))}
                  </ul>
               )}
            </CardContent>
         </Card>

         {/* Edit dialog */}
         <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar Equipo</DialogTitle>
                  <DialogDescription>Modifica los datos del equipo.</DialogDescription>
               </DialogHeader>
               <EquipoForm
                  initialData={equipo}
                  onSubmit={handleEdit}
                  onManageCategorias={() => { setManageOpen(true); }}
                  onCancel={() => setEditOpen(false)}
                  loading={editLoading}
                  submitLabel="Guardar cambios"
               />
            </DialogContent>
         </Dialog>

         <CategoriaEquipoManager open={manageOpen} onOpenChange={setManageOpen} />
      </div>
   );
}

function InfoField({ label, value }: { label: string; value: string | number }) {
   return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
         </p>
         <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
   );
}
