"use client";

import { useEffect, useState } from "react";
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
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   ArrowLeft,
   Building2,
   FileText,
   HandCoins,
   HardHat,
   Loader2,
   PackageSearch,
   Pencil,
   Receipt,
   ShoppingCart,
   Trash2,
   Truck,
} from "lucide-react";
import type { Supplier } from "@/dtos/supplier.dto";
import { useSupplierStore } from "@/stores/useSupplierStore";
import { SupplierForm } from "../components/supplier-form";
import { PermissionGuard } from "@/components/permission-guard";
import { OrdenesCompraTable } from "./components/ordenes-compra-table";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import { PurchaseOrder } from "@/dtos/purchase-order.dto";
import { useCuentasPorPagarStore, type CuentaPorPagar } from "@/stores/useCuentasPorPagarStore";
import { useSubcontratacionStore } from "@/stores/useSubcontratacionStore";

const TIPO_LABEL: Record<string, string> = {
   SUPLIDOR: "SUPLIDOR",
   SUB_CONTRATISTA: "SUBCONTRATISTA",
   AMBOS: "SUPLIDOR + SUBCONTRATISTA",
};

const TIPO_BADGE: Record<string, string> = {
   SUPLIDOR: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   SUB_CONTRATISTA: "bg-brand-yellow text-brand-black border border-yellow-400 font-bold shadow-sm shadow-brand-yellow/40 dark:bg-yellow-400/90 dark:text-brand-black",
   AMBOS: "bg-purple-100 text-purple-800 border border-purple-300 font-bold dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700",
};

export default function SupplierDetailPage() {
   const params = useParams();
   const router = useRouter();
   const supplierId = params.id as string;

   const { UpdateSupplier, DeleteSupplier, GetSupplierById } = useSupplierStore();
   const { GetOrdenesCompraBySupplier, PurchaseOrders: ordenes } = usePurchaseOrderStore();
   const { GetCuentas, cuentas: cuentasPagar, resumen: resumenPagos } = useCuentasPorPagarStore();
   const { GetSubcontrataciones, subcontrataciones, loading: subLoading } = useSubcontratacionStore();

   const [supplier, setSupplier] = useState<Supplier | null>(null);
   const [page, setPage] = useState(1);
   const limit = 10
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [pagarOpen, setPagarOpen] = useState(false);
   const [pagarCuentaId, setPagarCuentaId] = useState<string | null>(null);
   const [subBusqueda, setSubBusqueda] = useState("");
   const [subDesde, setSubDesde] = useState("");
   const [subHasta, setSubHasta] = useState("");

   useEffect(() => {
      let active = true;

      async function load() {
         setLoading(true);
         try {
            const data = await GetSupplierById(supplierId);
            await GetOrdenesCompraBySupplier(supplierId, { page, limit });
            await GetCuentas({ proveedor_id: supplierId, incluir_pagadas: true });
            await GetSubcontrataciones({ proveedor_id: supplierId, incluir_pagadas: true });

            setSupplier(data);
            if (data)
               document.title = `${data.nombre}`;
         } catch {
            if (active) setSupplier(null);
         } finally {
            if (active) setLoading(false);
         }
      }

      load();
      return () => { active = false; };
   }, [supplierId]);

   async function refreshSupplier() {
      const res = await fetch(`/api/suppliers/${supplierId}`);
      if (!res.ok) return;
      const data: Supplier = await res.json();
      setSupplier(data);
   }

   async function refreshDeuda() {
      await GetCuentas({ proveedor_id: supplierId, incluir_pagadas: true });
      await GetSubcontrataciones({ proveedor_id: supplierId, incluir_pagadas: true });
   }

   async function handleUpdate(values: {
      nombre: string; rnc: string; tipo: string;
      email: string; telefono: string; direccion: string;
   }) {
      setActionLoading(true);
      try {
         const result = await UpdateSupplier(supplierId, {
            nombre: values.nombre,
            rnc: values.rnc,
            tipo: values.tipo as Supplier["tipo"],
            email: values.email || null,
            telefono: values.telefono || null,
            direccion: values.direccion || null,
         });
         if (result instanceof Error) throw result;
         await refreshSupplier();
         setEditOpen(false);
      } finally {
         setActionLoading(false);
      }
   }

   async function handleDelete() {
      setActionLoading(true);
      try {
         const result = await DeleteSupplier(supplierId);
         if (result instanceof Error) throw result;
         router.push("/dashboard/proveedores");
      } finally {
         setActionLoading(false);
      }
   }

   const ordenesPendientes = ordenes.data?.filter(o => o.estado === "PENDIENTE") || [];

   const totalDeuda = ordenes.data?.filter(o => ["PENDIENTE", "APROBADA", "RECIBIDA"].includes(o.estado))
      .reduce((acc, o) => {
         return acc + o.total;
      }, 0);

   const subFiltradas = subcontrataciones.filter((s) => {
      if (subBusqueda.trim()) {
         const b = subBusqueda.trim().toLowerCase();
         const texto = `${s.codigoReferencia} ${s.trabajo_descripcion ?? ""}`.toLowerCase();
         if (!texto.includes(b)) return false;
      }
      if (subDesde) {
         const d = new Date(`${String(s.fecha_deuda).slice(0, 10)}T12:00:00`);
         if (d < new Date(`${subDesde}T12:00:00`)) return false;
      }
      if (subHasta) {
         const d = new Date(`${String(s.fecha_deuda).slice(0, 10)}T12:00:00`);
         if (d > new Date(`${subHasta}T12:00:00`)) return false;
      }
      return true;
   });

   if (loading) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!supplier) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <Truck className="size-12 opacity-30" />
            <p>Proveedor no encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/proveedores")}>
               <ArrowLeft className="mr-2 size-4" />
               Volver
            </Button>
         </div>
      );
   }

   return (
      <PermissionGuard resource="supplier" action="read" mode="page">
      <div className="flex flex-col gap-6 p-6">

         {/* Header */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/proveedores")}>
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                        {supplier.nombre}
                     </h1>
                     <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TIPO_BADGE[supplier.tipo] ?? ""}`}>
                        {TIPO_LABEL[supplier.tipo] ?? supplier.tipo}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground">RNC: {supplier.rnc}</p>
                  <p className="text-sm text-muted-foreground">
                     {supplier.email ?? "Sin correo"} · {supplier.telefono ?? "Sin teléfono"}
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
               <PermissionGuard resource="supplier" action="update">
               <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar proveedor
               </Button>
               </PermissionGuard>
               <PermissionGuard resource="supplier" action="delete">
               <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
               </Button>
               </PermissionGuard>
            </div>
         </div>

         {/* Tabs */}
         <Tabs defaultValue="resumen" className="space-y-4">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               {[
                  { value: "resumen", label: "Resumen" },
                  ...(supplier.tipo === "SUB_CONTRATISTA" || supplier.tipo === "AMBOS"
                     ? [{ value: "subcontrataciones", label: "Subcontrataciones" }]
                     : []),
                  ...(supplier.tipo === "SUPLIDOR" || supplier.tipo === "AMBOS"
                     ? [{ value: "compras", label: "Órdenes de compra" }]
                     : []),
                  { value: "pagos", label: "Pagos" },
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

            {/* ── RESUMEN ── */}
            <TabsContent value="resumen" className="space-y-4">
               <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {supplier.tipo === "SUB_CONTRATISTA" || supplier.tipo === "AMBOS" ? (
                     <>
                        <MiniStatCard
                           icon={<HardHat className="size-4 text-brand-blue" />}
                           label="Subcontrataciones"
                           value={subcontrataciones.length.toString()}
                           index={0}
                        />
                        <MiniStatCard
                           icon={<Receipt className="size-4 text-brand-blue" />}
                           label="Deuda pendiente"
                           value={resumenPagos.total_pendiente.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                           index={1}
                        />
                        <MiniStatCard
                           icon={<Building2 className="size-4 text-brand-blue" />}
                           label="Última actualización"
                           value={formatDate(supplier.updated_at)}
                           compact
                           index={3}
                        />
                     </>
                  ) : (
                     <>
                        <MiniStatCard
                           icon={<ShoppingCart className="size-4 text-brand-blue" />}
                           label="Órdenes de compra"
                           value={ordenes.data?.length.toString() ?? 0}
                           index={0}

                        />
                        <MiniStatCard
                           icon={<Receipt className="size-4 text-brand-blue" />}
                           label="Monto total"
                           value={ordenes.data.filter((o) => o.estado !== "BORRADOR" && o.estado !== "CANCELADA").reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                           index={1}
                        />
                        <MiniStatCard
                           icon={<Building2 className="size-4 text-brand-blue" />}
                           label="Última actualización"
                           value={formatDate(supplier.updated_at)}
                           compact
                           index={3}
                        />
                     </>
                  )}
               </div>

               <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                     <CardHeader>
                        <CardTitle>Información del proveedor</CardTitle>
                        <CardDescription>Datos de identificación y contacto.</CardDescription>
                     </CardHeader>
                     <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                           <InfoField label="Nombre" value={supplier.nombre} />
                           <InfoField label="RNC" value={supplier.rnc} />
                           <InfoField label="Tipo" value={TIPO_LABEL[supplier.tipo] ?? supplier.tipo} />
                           <InfoField label="Correo" value={supplier.email ?? "—"} />
                           <InfoField label="Teléfono" value={supplier.telefono ?? "—"} />
                           <div className="sm:col-span-2">
                              <InfoField label="Dirección" value={supplier.direccion ?? "—"} />
                           </div>
                        </div>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle>Actividad</CardTitle>
                        <CardDescription>Historial del registro.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <InfoField label="Registrado" value={formatDate(supplier.created_at)} />
                        <InfoField label="Actualizado" value={formatDate(supplier.updated_at)} />
                        <InfoField label="Estado" value="Activo" />
                     </CardContent>
                  </Card>
               </div>
            </TabsContent>

            {/* ── ÓRDENES DE COMPRA ── */}
            <TabsContent value="compras" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="size-5 text-brand-blue" />
                        Órdenes de compra
                     </CardTitle>
                     <CardDescription>
                        Historial de órdenes enviadas a este proveedor.
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid gap-4 md:grid-cols-3">
                        <MiniStat
                           label="Pendientes"
                           value={ordenesPendientes.length.toString()}
                        />

                        <MiniStat
                           label="Total Deuda"
                           value={`RD$ ${totalDeuda?.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                        />

                        <MiniStat
                           label="Total Pagado"
                           value="RD$ 0.00"
                        />
                     </div>
                     <OrdenesCompraTable ordenes={ordenes} onPageChange={(newPage) => setPage(newPage)} onEdit={() => { }} onDelete={() => { }} />
                     {ordenes.data?.length === 0 && (
                        <EmptyState
                           icon={<ShoppingCart className="size-8 opacity-30" />}
                           title="Sin órdenes de compra"
                           description="Aquí podrás registrar y ver el historial de órdenes de compra enviadas a este proveedor, incluyendo estado, montos y fechas."
                        />

                     )}
                  </CardContent>
               </Card>
            </TabsContent>

            {/* ── SUBCONTRATACIONES (solo subcontratistas) ── */}
            <TabsContent value="subcontrataciones" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <HardHat className="size-5 text-brand-blue" />
                        Subcontrataciones
                     </CardTitle>
                     <CardDescription>
                        Trabajos registrados a este subcontratista y su deuda.
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[200px] flex-1">
                           <label className="mb-1 block text-xs font-medium text-muted-foreground">Buscar por referencia o trabajo</label>
                           <Input
                              placeholder="Ej: SUB-001 o soldadura..."
                              value={subBusqueda}
                              onChange={(e) => setSubBusqueda(e.target.value)}
                           />
                        </div>
                        <div>
                           <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
                           <Input
                              type="date"
                              className="h-10 w-40"
                              value={subDesde}
                              onChange={(e) => setSubDesde(e.target.value)}
                           />
                        </div>
                        <div>
                           <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
                           <Input
                              type="date"
                              className="h-10 w-40"
                              value={subHasta}
                              onChange={(e) => setSubHasta(e.target.value)}
                           />
                        </div>
                        {(subBusqueda || subDesde || subHasta) && (
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                 setSubBusqueda("");
                                 setSubDesde("");
                                 setSubHasta("");
                              }}
                           >
                              Limpiar
                           </Button>
                        )}
                     </div>
                     {subLoading ? (
                        <div className="flex items-center justify-center py-8">
                           <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                     ) : subFiltradas.length === 0 ? (
                        <EmptyState
                           icon={<HardHat className="size-8 opacity-30" />}
                           title="Sin subcontrataciones"
                           description="Registra los trabajos de este subcontratista para controlar la etapa y la deuda."
                        />
                     ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                           <table className="w-full text-sm">
                              <thead>
                                 <tr className="bg-brand-blue">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Ref.</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha deuda</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Estado</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {subFiltradas.map((s) => (
                                    <tr
                                       key={s.id}
                                       onClick={() => router.push(`/dashboard/subcontrataciones/${s.id}`)}
                                       className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-blue/5"
                                    >
                                       <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                          {s.codigoReferencia}
                                       </td>
                                       <td className="max-w-[260px] px-4 py-3">
                                          <div className="truncate">{s.trabajo_descripcion ?? "—"}</div>
                                       </td>
                                       <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                          {fechaCorta(s.fecha_deuda)}
                                       </td>
                                       <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-600">
                                          {s.pendiente > 0 ? `RD$ ${s.pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })}` : "—"}
                                       </td>
                                       <td className="px-4 py-3 text-center">
                                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                                             {s.estado_trabajo}
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>

            {/* ── PAGOS ── */}
            <TabsContent value="pagos" className="space-y-4">
               <Card>
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                     <div>
                        <CardTitle className="flex items-center gap-2">
                           <Receipt className="size-5 text-brand-blue" />
                           Pagos
                        </CardTitle>
                        <CardDescription>
                           Deuda registrada a este proveedor y su avance de pagos.
                        </CardDescription>
                     </div>
                     {resumenPagos.total_pendiente > 0 && (
                        <PermissionGuard resource="supplier" action="update">
                        <Button size="sm" onClick={() => { setPagarCuentaId(null); setPagarOpen(true); }}>
                           <HandCoins className="mr-2 size-4" /> Registrar pago
                        </Button>
                        </PermissionGuard>
                     )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid gap-4 md:grid-cols-3">
                        <MiniStat
                           label="Total facturado"
                           value={`RD$ ${resumenPagos.total_monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                        />
                        <MiniStat
                           label="Total pagado"
                           value={`RD$ ${resumenPagos.total_pagado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                        />
                        <MiniStat
                           label="Pendiente"
                           value={`RD$ ${resumenPagos.total_pendiente.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                        />
                     </div>

                     {cuentasPagar.length === 0 ? (
                        <EmptyState
                           icon={<Receipt className="size-8 opacity-30" />}
                           title="Sin deuda registrada"
                           description="Los gastos vinculados a este proveedor aparecerán aquí con su saldo y los pagos."
                        />
                     ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                           <table className="w-full text-sm">
                              <thead>
                                 <tr className="bg-brand-blue">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Referencia</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Concepto</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pagado</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Ver</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Pagar</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {cuentasPagar.map((c) => (
                                    <tr
                                       key={`${c.tipo}-${c.id}`}
                                       className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-blue/5"
                                       onClick={() =>
                                          c.tipo === "GASTO"
                                             ? router.push(`/dashboard/gastos/${c.id}`)
                                             : router.push(`/dashboard/costos/${c.id}`)
                                       }
                                    >
                                       <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                          {c.codigoReferencia}
                                       </td>
                                       <td className="max-w-[240px] px-4 py-3">
                                          <div className="truncate">{c.concepto}</div>
                                          <div className="text-xs text-muted-foreground">
                                             {c.categoria_gasto_nombre ?? c.proyecto_nombre ?? "—"}
                                          </div>
                                       </td>
                                       <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                          {`RD$ ${c.monto_total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                                       </td>
                                       <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                                          {c.pagado > 0 ? `RD$ ${c.pagado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : "—"}
                                       </td>
                                       <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-600">
                                          {c.pendiente > 0 ? `RD$ ${c.pendiente.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : "—"}
                                       </td>
                                       <td className="px-4 py-3 text-center text-brand-blue">Ver</td>
                                       <td className="px-4 py-3 text-center">
                                          {c.pendiente > 0 ? (
                                             <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   setPagarCuentaId(c.id);
                                                   setPagarOpen(true);
                                                }}
                                             >
                                                <HandCoins className="mr-1 size-3.5" /> Pagar
                                             </Button>
                                          ) : (
                                             <span className="text-[10px] uppercase text-muted-foreground">Saldada</span>
                                          )}
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>

         </Tabs>

         {/* Edit dialog */}
         <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar proveedor</DialogTitle>
                  <DialogDescription>Actualiza los datos de {supplier.nombre}.</DialogDescription>
               </DialogHeader>
               <SupplierForm
                  initialData={supplier}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditOpen(false)}
                  loading={actionLoading}
                  submitLabel="Guardar cambios"
               />
            </DialogContent>
         </Dialog>

         {/* Delete dialog */}
         <Dialog open={deleteOpen} onOpenChange={(open) => setDeleteOpen(open)}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Eliminar proveedor</DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de que deseas eliminar a <strong>{supplier.nombre}</strong>? Esta acción no se puede deshacer.
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={actionLoading}>
                     Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                     {actionLoading ? "Eliminando…" : "Eliminar"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Registrar pago */}
         <RegistrarPagoDialog
            open={pagarOpen}
            onOpenChange={setPagarOpen}
            cuentas={cuentasPagar}
            preselectId={pagarCuentaId}
            onDone={refreshDeuda}
         />
      </div>
      </PermissionGuard>
   );
}

const METODOS_PAGO = ["CHEQUE", "EFECTIVO", "TRANSFERENCIA", "TARJETA", "DESCUENTO_NOMINA"];

function RegistrarPagoDialog({
   open,
   onOpenChange,
   cuentas,
   preselectId,
   onDone,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   cuentas: CuentaPorPagar[];
   preselectId: string | null;
   onDone: () => Promise<void>;
}) {
   const porPagar = cuentas.filter((c) => c.pendiente > 0);
   const [cuentaId, setCuentaId] = useState<string>(preselectId ?? "");
   const [monto, setMonto] = useState("");
   const [metodo, setMetodo] = useState("TRANSFERENCIA");
   const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
   const [concepto, setConcepto] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const cuenta = cuentas.find((c) => c.id === cuentaId) ?? null;

   useEffect(() => {
      if (!open) return;
      setError(null);
      setMonto("");
      setConcepto("");
      setFechaPago(new Date().toISOString().slice(0, 10));
      const preseleccionada = preselectId && cuentas.some((c) => c.id === preselectId && c.pendiente > 0)
         ? preselectId
         : (porPagar[0]?.id ?? "");
      setCuentaId(preseleccionada);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [open]);

   useEffect(() => {
      if (cuenta) setMonto(String(cuenta.pendiente));
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [cuentaId]);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!cuenta) {
         setError("Selecciona la cuenta a pagar");
         return;
      }
      const m = Number(monto);
      if (!m || m <= 0) {
         setError("Indica un monto válido");
         return;
      }
      if (m > cuenta.pendiente + 0.01) {
         setError(`El pago no puede superar el pendiente (RD$ ${cuenta.pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })})`);
         return;
      }

      setLoading(true);
      try {
         const payload = {
            metodo_pago: metodo,
            monto_pagado: m,
            concepto: concepto.trim() || `Pago a proveedor ${cuenta.codigoReferencia}`,
            tipo_movimiento: "SALIDA",
            fecha: fechaPago,
            ...(cuenta.tipo === "GASTO"
               ? { gasto_empresa_id: cuenta.id }
               : { costo_cliente_id: cuenta.id }),
         };
         const res = await fetch("/api/pagos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data?.error ?? "Error al registrar el pago");
         onOpenChange(false);
         await onDone();
      } catch (err: any) {
         setError(err?.message ?? "Ocurrió un error al registrar el pago");
      } finally {
         setLoading(false);
      }
   }

   const INPUT =
      "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 transition-colors";

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Registrar pago</DialogTitle>
               <DialogDescription>
                  El pago se aplica a la deuda seleccionada de este proveedor.
               </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
               <div className="flex flex-col gap-1.5">
                  <Label>Cuenta a pagar *</Label>
                  <select
                     value={cuentaId}
                     onChange={(e) => setCuentaId(e.target.value)}
                     className={INPUT}
                     required
                  >
                     <option value="" disabled>Selecciona la cuenta…</option>
                     {porPagar.map((c) => (
                        <option key={`${c.tipo}-${c.id}`} value={c.id}>
                           {c.codigoReferencia} — {c.concepto} (pend. {`RD$ ${c.pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`})
                        </option>
                     ))}
                  </select>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                     <Label>Monto (RD$) *</Label>
                     <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        required
                        className={INPUT}
                     />
                  </div>
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
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Método de pago *</Label>
                  <select
                     value={metodo}
                     onChange={(e) => setMetodo(e.target.value)}
                     className={INPUT}
                  >
                     {METODOS_PAGO.map((m) => (
                        <option key={m} value={m}>{m}</option>
                     ))}
                  </select>
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Concepto</Label>
                  <Input
                     value={concepto}
                     onChange={(e) => setConcepto(e.target.value)}
                     placeholder={`Pago a proveedor ${cuenta?.codigoReferencia ?? ""}`}
                     className={INPUT}
                  />
               </div>

               {error && (
                  <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
                     {error}
                  </div>
               )}

               <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                     Cancelar
                  </Button>
                  <Button type="submit" disabled={loading || porPagar.length === 0}>
                     {loading ? "Registrando…" : "Registrar pago"}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

function MiniStatCard({
   icon,
   label,
   value,
   compact = false,
   index,
}: {
   icon: React.ReactNode;
   label: string;
   value: string;
   compact?: boolean;
   index?: number;
}) {
   return (
      <div className={`flex items-start gap-3 rounded-xl border border-border  p-4 shadow-sm bg-brand-blue dark:bg-brand-blue/10`}>
         <div className={`mt-0.5 rounded-lg bg-white p-2`}>{icon}</div>
         <div className="min-w-0">
            <p className="text-xs font-medium text-white">{label}</p>
            <p className={`mt-0.5 font-bold text-white break-words ${compact ? "text-base" : "text-2xl"}`}>{value}</p>
         </div>
      </div>
   );
}

function MiniStat({ label, value }: { label: string; value: string }) {
   return (
      <div className="rounded-lg border bg-muted/20 p-4">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      </div>
   );
}

function EmptyState({
   icon,
   title,
   description,
}: {
   icon: React.ReactNode;
   title: string;
   description: string;
}) {
   return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 py-10 text-center">
         <div className="text-muted-foreground">{icon}</div>
         <p className="mt-3 text-base font-semibold">{title}</p>
         <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
      </div>
   );
}

function InfoField({ label, value }: { label: string; value: string }) {
   return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
   );
}

function formatDate(value: string | Date) {
   return new Date(value).toLocaleDateString("es-DO");
}

function fechaCorta(value: string | Date) {
   return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
   });
}
