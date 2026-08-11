"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   ArrowLeft,
   Loader2,
   Pencil,
   Plus,
   Truck,
   UserRound,
   Wrench,
} from "lucide-react";
import type {
   Equipo,
   EstadoEquipo,
} from "@/dtos/equipo.dto";
import { ESTADOS_EQUIPO } from "@/dtos/equipo.dto";
import { useEquipoStore } from "@/stores/useEquipoStore";
import {
   ESTADO_BADGE,
   ESTADO_LABEL,
} from "../components/equipo-labels";
import { EquipoForm, type EquipoFormValues } from "../components/equipo-form";
import { PermissionGuard } from "@/components/permission-guard";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";
import { OperadorAsignable } from "@/dtos/employee.dto";
import { CategoriaEquipoManager } from "../components/categoria-equipo-manager";
import { EquipoConduces } from "./components/equipo-conduce";
import { EquipoRentabilidad } from "./components/equipo-rentabilidad";
import { EquipoGastos } from "./components/equipo-gastos";
import { EquipoCompras } from "./components/equipo-compras";
import { EquipoPagos } from "./components/equipo-pagos";
import { EquipoComprasCard } from "./components/equipo-compras-card";
import { EquipoHistorial } from "./components/equipo-historial";
import { EquipoSubcontrataciones } from "./components/equipo-subcontrataciones";
import { useMantenimientoStore } from "@/stores/useMantenimientoStore";
import {
   ESTADO_MANTENIMIENTO_BADGE,
   ESTADO_MANTENIMIENTO_LABEL,
   TIPO_MANTENIMIENTO_BADGE,
   TIPO_MANTENIMIENTO_LABEL,
   type CloseMantenimientoForm,
   type CreateMantenimientoForm,
   type Mantenimiento,
} from "@/dtos/mantenimiento.dto";
import { CerrarMantenimientoDialog } from "../../mantenimientos/components/cerrar-mantenimiento-dialog";
import { MantenimientoFormDialog } from "../../mantenimientos/components/mantenimiento-form-dialog";

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

// 1. Envolvemos la página en Suspense para manejar los Search Params correctamente en Next.js
export default function EquipoDetailPage() {
   return (
      <Suspense fallback={
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      }>
         <EquipoDetailContent />
      </Suspense>
   );
}

// 2. Componente principal con la lógica
function EquipoDetailContent() {
   const params = useParams();
   const pathname = usePathname();
   const router = useRouter();
   const searchParams = useSearchParams();
   const currentTab = searchParams.get("tab") || "rentabilidad";
   const equipoId = params.id as string;

   const { ChangeEstado, UpdateEquipo, GetEquipoById, GetCategoriasEquipoByEquipoId, GetOperadorByEquipoId } = useEquipoStore();
   const { CreateMantenimiento, CloseMantenimiento, GetMantenimientosByEquipo } = useMantenimientoStore();

   const [equipo, setEquipo] = useState<Equipo | null>(null);
   const [categoria, setCategoria] = useState<CategoriaEquipo | null>(null);
   const [operador, setOperador] = useState<OperadorAsignable | null>(null);
   const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
   const [loading, setLoading] = useState(true);
   const [estadoLoading, setEstadoLoading] = useState(false);
   const [estadoError, setEstadoError] = useState<string | null>(null);
   const [editOpen, setEditOpen] = useState(false);
   const [editLoading, setEditLoading] = useState(false);
   const [manageOpen, setManageOpen] = useState(false);

   // Diálogos de mantenimiento disparados por el cambio de estado.
   const [abrirMantOpen, setAbrirMantOpen] = useState(false);
   const [cerrarMantOpen, setCerrarMantOpen] = useState(false);
   const [mantAbierto, setMantAbierto] = useState<Mantenimiento | null>(null);
   const [mantLoading, setMantLoading] = useState(false);
   const [mantError, setMantError] = useState<string | null>(null);
   // Cuando el diálogo se abre por un cambio de estado, este flag dice que al
   // terminar hay que aplicar además la transición del equipo.
   const [pendingEstado, setPendingEstado] = useState<EstadoEquipo | null>(null);

   const mantenimientoAbierto = mantenimientos.find((m) => m.fecha_fin === null) ?? null;

   async function loadAll(active = { value: true }) {
      try {
         // Solo la data base del encabezado. Compras, historial, gastos, pagos
         // y rentabilidad se piden cuando el usuario entra a cada tab.
         const equipoData = await GetEquipoById(equipoId);
         if (!equipoData) throw new Error("Not found");

         const [mantData, categoria, operadorData] = await Promise.all([
            GetMantenimientosByEquipo(equipoId),
            GetCategoriasEquipoByEquipoId(equipoId),
            GetOperadorByEquipoId(equipoId),
         ]);

         if (active.value) {
            setEquipo(equipoData);
            setMantenimientos(mantData);
            setCategoria(categoria);
            setOperador(operadorData);
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

   // 3. El tab es local (igual que proveedores): cambiar de tab no recarga ni
   // vuelve a pedir datos; cada tab ya cachea lo suyo.

   /** Aplica la transición de estado sin pasar por los diálogos. */
   async function applyEstado(nuevoEstado: EstadoEquipo) {
      const result = await ChangeEstado(equipoId, nuevoEstado);
      if (result instanceof Error) throw result;
      await loadAll();
   }

   async function handleEstadoChange(nuevoEstado: EstadoEquipo) {
      if (!equipo || nuevoEstado === equipo.estado) return;
      setEstadoError(null);
      setMantError(null);

      // Entrar a mantenimiento abre un registro (si no hay uno ya abierto).
      if (nuevoEstado === "EN_MANTENIMIENTO" && !mantenimientoAbierto) {
         setPendingEstado(nuevoEstado);
         setAbrirMantOpen(true);
         return;
      }

      // Salir de mantenimiento exige cerrar el registro abierto: el diálogo es
      // obligatorio y el backend rechaza la transición si se intenta saltar.
      if (nuevoEstado === "ACTIVO" && equipo.estado === "EN_MANTENIMIENTO" && mantenimientoAbierto) {
         setMantAbierto(mantenimientoAbierto);
         setPendingEstado(nuevoEstado);
         setCerrarMantOpen(true);
         return;
      }

      setEstadoLoading(true);
      try {
         await applyEstado(nuevoEstado);
      } catch (err) {
         setEstadoError(err instanceof Error ? err.message : "Error al cambiar el estado");
      } finally {
         setEstadoLoading(false);
      }
   }

   const handleTabChange = (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value); // Seteas el valor
      router.replace(`${pathname}?${params.toString()}`); // Actualizas la URL silenciosamente
   };
   async function handleAbrirMantenimiento(data: CreateMantenimientoForm) {
      setMantLoading(true);
      setMantError(null);
      try {
         const result = await CreateMantenimiento(data);
         if (result instanceof Error) throw result;

         // Sólo mueve el equipo si el diálogo vino de un cambio de estado.
         if (pendingEstado) await applyEstado(pendingEstado);
         else await loadAll();

         setAbrirMantOpen(false);
         setPendingEstado(null);
      } catch (err) {
         setMantError(err instanceof Error ? err.message : "Error al registrar el mantenimiento");
      } finally {
         setMantLoading(false);
      }
   }

   async function handleCerrarMantenimiento(data: CloseMantenimientoForm) {
      if (!mantAbierto) return;
      setMantLoading(true);
      setMantError(null);
      try {
         const result = await CloseMantenimiento(mantAbierto.id, data);
         if (result instanceof Error) throw result;

         // El cierre es requisito de la reactivación: recién ahora pasa a ACTIVO.
         if (pendingEstado) await applyEstado(pendingEstado);
         else await loadAll();

         setCerrarMantOpen(false);
         setMantAbierto(null);
         setPendingEstado(null);
      } catch (err) {
         setMantError(err instanceof Error ? err.message : "Error al cerrar el mantenimiento");
      } finally {
         setMantLoading(false);
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
      <PermissionGuard resource="machinery" action="read" mode="page">
         <div className="flex flex-col gap-6 p-6">
            {/* Header Global (Siempre visible sin importar el tab) */}
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
                  <PermissionGuard resource="machinery" action="update">
                     <Button variant="outline" onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-2 size-4" />
                        Editar
                     </Button>
                  </PermissionGuard>

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

            {/* 4. Sistema de Tabs: el tab activo vive en la URL (?tab=...) pero
            cambiar de tab no recarga la página ni re-pide datos; cada tab
            carga su data cuando el usuario entra en él. */}
            <Tabs defaultValue={currentTab} onValueChange={handleTabChange} className="space-y-4">
               <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                  {[
                     { value: "rentabilidad", label: "Rentabilidad" },
                     { value: "general", label: "Información General" },
                     { value: "conduces", label: "Conduces" },
                     { value: "gastos", label: "Gastos" },
                     { value: "compras", label: "Compras" },
                     { value: "pagos", label: "Pagos" },
                     { value: "subcontrataciones", label: "Subcontrataciones" },
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

               {/* TAB: RENTABILIDAD */}
               <TabsContent value="rentabilidad" className="space-y-4">
                  <EquipoRentabilidad equipoId={equipoId} />
               </TabsContent>

               {/* TAB: GENERAL */}
               <TabsContent value="general" className="space-y-4">
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

                  {/* Purchased items — carga cuando se entra a este tab */}
                  <EquipoComprasCard equipoId={equipoId} />

                  {/* Historial de mantenimientos */}
                  <Card>
                     <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="space-y-1.5">
                           <CardTitle className="flex items-center gap-2">
                              <Wrench className="size-5 text-brand-blue" />
                              Historial de mantenimientos
                           </CardTitle>
                           <CardDescription>
                              Mantenimientos registrados para este equipo.
                           </CardDescription>
                        </div>
                        <PermissionGuard resource="machinery" action="update">
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                 setPendingEstado(null);
                                 setMantError(null);
                                 setAbrirMantOpen(true);
                              }}
                              disabled={!!mantenimientoAbierto}
                              title={
                                 mantenimientoAbierto
                                    ? "Ya hay un mantenimiento abierto para este equipo"
                                    : undefined
                              }
                           >
                              <Plus className="mr-2 size-4" />
                              Registrar
                           </Button>
                        </PermissionGuard>
                     </CardHeader>
                     <CardContent>
                        {mantenimientos.length === 0 ? (
                           <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                              Aún no hay mantenimientos registrados.
                           </div>
                        ) : (
                           <ul className="flex flex-col gap-3">
                              {mantenimientos.map((m) => (
                                 <li
                                    key={m.id}
                                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3"
                                 >
                                    <div className="flex flex-wrap items-center gap-2">
                                       <span className="font-mono text-xs text-muted-foreground">
                                          {m.codigoReferencia}
                                       </span>
                                       <span
                                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${TIPO_MANTENIMIENTO_BADGE[m.tipo]}`}
                                       >
                                          {TIPO_MANTENIMIENTO_LABEL[m.tipo]}
                                       </span>
                                       <span
                                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ESTADO_MANTENIMIENTO_BADGE[m.estado]}`}
                                       >
                                          {ESTADO_MANTENIMIENTO_LABEL[m.estado]}
                                       </span>
                                       {m.costo != null && (
                                          <span className="text-xs font-semibold">
                                             {formatMoney(m.costo)}
                                          </span>
                                       )}
                                       {m.gastos.map((g) => (
                                          <Link
                                             key={g.id}
                                             href={`/dashboard/gastos`}
                                             className="text-xs text-brand-blue hover:underline"
                                          >
                                             {g.codigoReferencia}
                                          </Link>
                                       ))}
                                    </div>

                                    <p className="text-sm font-medium">{m.descripcion}</p>
                                    {m.trabajo_realizado && (
                                       <p className="text-sm text-muted-foreground">
                                          Trabajo: {m.trabajo_realizado}
                                       </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                       <span>
                                          {formatDate(m.fecha_inicio)} →{" "}
                                          {m.fecha_fin ? formatDate(m.fecha_fin) : "En proceso"}
                                       </span>
                                       {m.taller && <span>· {m.taller}</span>}
                                       {m.created_by_name && <span>· {m.created_by_name}</span>}
                                    </div>

                                    {m.fecha_fin === null && (
                                       <PermissionGuard resource="machinery" action="update">
                                          <div>
                                             <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                   setMantAbierto(m);
                                                   setPendingEstado(null);
                                                   setMantError(null);
                                                   setCerrarMantOpen(true);
                                                }}
                                             >
                                                Cerrar mantenimiento
                                             </Button>
                                          </div>
                                       </PermissionGuard>
                                    )}
                                 </li>
                              ))}
                           </ul>
                        )}
                     </CardContent>
                  </Card>

                  {/* Estado history — carga cuando se entra a este tab */}
                  <EquipoHistorial equipoId={equipoId} />
               </TabsContent>

               {/* TAB: CONDUCES */}
               <TabsContent value="conduces" className="space-y-4">
                  <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground bg-card">
                     <Truck className="size-10 mx-auto mb-3 opacity-40 text-brand-blue" />
                     <h3 className="text-lg font-medium mb-2 text-foreground">Conduces del Equipo</h3>
                     <EquipoConduces equipoId={equipoId} />
                  </div>
               </TabsContent>

               {/* TAB: GASTOS */}
               <TabsContent value="gastos" className="space-y-4">
                  <EquipoGastos equipoId={equipoId} />
               </TabsContent>

               {/* TAB: COMPRAS */}
               <TabsContent value="compras" className="space-y-4">
                  <EquipoCompras equipoId={equipoId} />
               </TabsContent>

               {/* TAB: PAGOS */}
               <TabsContent value="pagos" className="space-y-4">
                  <EquipoPagos equipoId={equipoId} />
               </TabsContent>

               {/* TAB: SUBCONTRATACIONES */}
               <TabsContent value="subcontrataciones" className="space-y-4">
                  <EquipoSubcontrataciones equipoId={equipoId} />
               </TabsContent>
            </Tabs>

            {/* Modales (Fuera de los tabs) */}
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

            {/* Abrir mantenimiento — al entrar a EN_MANTENIMIENTO o desde el botón. */}
            <MantenimientoFormDialog
               open={abrirMantOpen}
               onOpenChange={(open) => {
                  if (!open) {
                     setAbrirMantOpen(false);
                     // Cancelar aquí cancela también el cambio de estado.
                     setPendingEstado(null);
                     setMantError(null);
                  }
               }}
               onSubmit={handleAbrirMantenimiento}
               loading={mantLoading}
               error={mantError}
               equipoId={equipoId}
               equipoNombre={equipo.nombre}
               description={
                  pendingEstado === "EN_MANTENIMIENTO"
                     ? "El equipo pasará a mantenimiento. Registra de qué se trata."
                     : "Abre un registro de mantenimiento para este equipo."
               }
               submitLabel={
                  pendingEstado === "EN_MANTENIMIENTO" ? "Registrar y enviar a mantenimiento" : "Registrar"
               }
            />

            {/* Cerrar mantenimiento — obligatorio para volver a ACTIVO. */}
            <CerrarMantenimientoDialog
               open={cerrarMantOpen}
               onOpenChange={(open) => {
                  if (!open) {
                     setCerrarMantOpen(false);
                     setMantAbierto(null);
                     setPendingEstado(null);
                     setMantError(null);
                  }
               }}
               mantenimiento={mantAbierto}
               onSubmit={handleCerrarMantenimiento}
               loading={mantLoading}
               error={mantError}
               description={
                  pendingEstado === "ACTIVO"
                     ? "Para reactivar el equipo primero debes cerrar el mantenimiento abierto."
                     : "Registra qué se hizo para cerrar este mantenimiento."
               }
               submitLabel={pendingEstado === "ACTIVO" ? "Cerrar y activar" : "Cerrar mantenimiento"}
            />
         </div>
      </PermissionGuard>
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