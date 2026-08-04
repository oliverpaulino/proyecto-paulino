"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import type { EstadoOrdenCompra } from "@/dtos/purchase-order.dto";
import { useCuentasPorPagarStore } from "@/stores/useCuentasPorPagarStore";
import { useSubcontratacionStore } from "@/stores/useSubcontratacionStore";
import { EstadoPago } from "@/dtos/subcontratacion.dto";
import { SelectBuscadorDeudasProveedor } from "@/components/shared/selectBuscadorDeudasProveedor";

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

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OC_PAGABLES = ["PENDIENTE", "APROBADA", "RECIBIDA"];

type PagarItem = {
   kind: "GASTO" | "COSTO" | "OC";
   id: string;
   codigoReferencia: string;
   concepto: string;
   pendiente: number;
   estado?: string;
   total?: number;
   pagado?: number;
   categoria?: string | null;
};

export default function SupplierDetailPage() {
   const params = useParams();
   const router = useRouter();
   const supplierId = params.id as string;
   const [currentTab, setCurrentTab] = useState("resumen");
   const { UpdateSupplier, DeleteSupplier, GetSupplierById } = useSupplierStore();
   const { GetOrdenesCompraBySupplier, PurchaseOrders: ordenes } = usePurchaseOrderStore();
   const { GetCuentas, cuentas: cuentasPagar, resumen: resumenPagos } = useCuentasPorPagarStore();
   const { GetSubcontrataciones, subcontrataciones, loading: subLoading } = useSubcontratacionStore();

   const [supplier, setSupplier] = useState<Supplier | null>(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [pagarOpen, setPagarOpen] = useState(false);
   const [pagarItems, setPagarItems] = useState<PagarItem[]>([]);
   const [subBusqueda, setSubBusqueda] = useState("");
   const [subDesde, setSubDesde] = useState("");
   const [subHasta, setSubHasta] = useState("");
   const [subEstadoPago, setSubEstadoPago] = useState<EstadoPago | "">("");
   const [ocBusqueda, setOcBusqueda] = useState("");
   const [ocDesde, setOcDesde] = useState("");
   const [ocHasta, setOcHasta] = useState("");
   const [ocEstado, setOcEstado] = useState<EstadoOrdenCompra | "">("");
   const [ocSel, setOcSel] = useState<Set<string>>(new Set());
   const [subSel, setSubSel] = useState<Set<string>>(new Set());
   const [pagoSel, setPagoSel] = useState<Set<string>>(new Set());

   const handleTabChange = (value: string) => {
      setCurrentTab(value);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", value);
      window.history.replaceState(null, "", url.toString());
   };

   useEffect(() => {
      const fromUrl = new URLSearchParams(window.location.search).get("tab");
      if (fromUrl) setCurrentTab(fromUrl);
   }, []);

   useEffect(() => {
      let active = true;

      async function load() {
         setLoading(true);
         try {
            const data = await GetSupplierById(supplierId);
            await GetOrdenesCompraBySupplier(supplierId, { force: true, limit: 1000 });
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
      await GetOrdenesCompraBySupplier(supplierId, { force: true, limit: 1000 });
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

   const totalFacturadoCombinado =
      cuentasPagar.reduce((acc, c) => acc + c.monto_total, 0) +
      (ordenes.data ?? []).reduce((acc, o) => acc + o.total, 0);
   const totalPagadoCombinado =
      cuentasPagar.reduce((acc, c) => acc + c.pagado, 0) +
      (ordenes.data ?? []).reduce((acc, o) => acc + (o.pagado ?? 0), 0);
   const totalPendienteCombinado = Math.max(0, totalFacturadoCombinado - totalPagadoCombinado);

   const ocFiltradas = (ordenes.data ?? []).filter((o) => {
      if (ocBusqueda.trim()) {
         const b = ocBusqueda.trim().toLowerCase();
         const texto = `${o.codigoReferencia} ${o.notas ?? ""} ${o.proveedor_nombre ?? ""}`.toLowerCase();
         if (!texto.includes(b)) return false;
      }
      if (ocEstado && o.estado !== ocEstado) return false;
      if (ocDesde) {
         const d = new Date(`${String(o.fecha).slice(0, 10)}T12:00:00`);
         if (d < new Date(`${ocDesde}T12:00:00`)) return false;
      }
      if (ocHasta) {
         const d = new Date(`${String(o.fecha).slice(0, 10)}T12:00:00`);
         if (d > new Date(`${ocHasta}T12:00:00`)) return false;
      }
      return true;
   });

   const ordenesPendientes = ocFiltradas.filter(o => o.estado === "PENDIENTE");

   const totalDeuda = ocFiltradas
      .filter(o => ["PENDIENTE", "APROBADA", "RECIBIDA"].includes(o.estado))
      .reduce((acc, o) => acc + o.total, 0);

   const totalPagado = ocFiltradas.reduce((acc, o) => acc + (o.pagado ?? 0), 0);

   const ocSelectables = ocFiltradas.filter(
      (o) => OC_PAGABLES.includes(o.estado) && (o.pendiente ?? 0) > 0,
   );

   const subFiltradas = subcontrataciones.filter((s) => {
      if (subBusqueda.trim()) {
         const b = subBusqueda.trim().toLowerCase();
         const texto = `${s.codigoReferencia} ${s.trabajo_descripcion ?? ""}`.toLowerCase();
         if (!texto.includes(b)) return false;
      }
      if (subEstadoPago && s.estado_pago !== subEstadoPago) return false;
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

   // ── Items pagables (tab Pagos: cuentas gasto/costo + órdenes de compra) ──
   const cuentasItems: PagarItem[] = cuentasPagar
      .filter((c) => c.pendiente > 0)
      .map((c) => ({
         kind: c.tipo,
         id: c.id,
         codigoReferencia: c.codigoReferencia,
         concepto: c.concepto,
         pendiente: c.pendiente,
         total: c.monto_total,
         pagado: c.pagado,
         categoria: c.categoria_gasto_nombre ?? c.proyecto_nombre ?? null,
      }));

   const ocItems: PagarItem[] = (ordenes.data ?? [])
      .filter((o) => OC_PAGABLES.includes(o.estado) && (o.pendiente ?? 0) > 0)
      .map((o) => ({
         kind: "OC",
         id: o.id,
         codigoReferencia: o.codigoReferencia,
         concepto: o.notas ?? "Orden de compra",
         pendiente: o.pendiente ?? 0,
         estado: o.estado,
         total: o.total,
         pagado: o.pagado ?? 0,
      }));

   const pagoItems: PagarItem[] = [...cuentasItems, ...ocItems];

   const subPagables: PagarItem[] = subcontrataciones
      .filter((s) => s.pendiente > 0 && s.gasto_id)
      .map((s) => ({
         kind: "GASTO" as const,
         id: s.gasto_id!,
         codigoReferencia: s.codigoReferencia,
         concepto: s.trabajo_descripcion ?? "Subcontratación",
         pendiente: s.pendiente,
      }));

   const subSelectables = subFiltradas.filter((s) => s.pendiente > 0 && s.gasto_id);

   const selKey = (k: PagarItem["kind"], id: string) => `${k}:${id}`;
   const toggleSel = (set: Set<string>, key: string, on: boolean) => {
      const next = new Set(set);
      if (on) next.add(key);
      else next.delete(key);
      return next;
   };

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
            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
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
                           Historial de órdenes enviadas a este proveedor, su estado y deuda.
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
                              value={`RD$ ${totalPagado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                           />
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                           <div className="min-w-[200px] flex-1">
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">Buscar por referencia</label>
                              <Input
                                 placeholder="Ej: OC-260101-001 o notas..."
                                 value={ocBusqueda}
                                 onChange={(e) => setOcBusqueda(e.target.value)}
                              />
                           </div>
                           <div>
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
                              <Input
                                 type="date"
                                 className="h-10 w-40"
                                 value={ocDesde}
                                 onChange={(e) => setOcDesde(e.target.value)}
                              />
                           </div>
                           <div>
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
                              <Input
                                 type="date"
                                 className="h-10 w-40"
                                 value={ocHasta}
                                 onChange={(e) => setOcHasta(e.target.value)}
                              />
                           </div>
                           <div>
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">Estado</label>
                              <select
                                 value={ocEstado}
                                 onChange={(e) => setOcEstado(e.target.value as EstadoOrdenCompra | "")}
                                 className="h-10 w-40 rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                              >
                                 <option value="">Todos</option>
                                 {["BORRADOR", "PENDIENTE", "APROBADA", "RECIBIDA", "CANCELADA"].map((e) => (
                                    <option key={e} value={e}>{e}</option>
                                 ))}
                              </select>
                           </div>
                           {(ocBusqueda || ocDesde || ocHasta || ocEstado) && (
                              <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => {
                                    setOcBusqueda("");
                                    setOcDesde("");
                                    setOcHasta("");
                                    setOcEstado("");
                                 }}
                              >
                                 Limpiar
                              </Button>
                           )}
                        </div>

                        {ocSel.size > 0 && (
                           <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-4 py-2.5">
                              <span className="text-sm font-medium">
                                 {ocSel.size} {ocSel.size === 1 ? "orden seleccionada" : "órdenes seleccionadas"}
                              </span>
                              <PermissionGuard resource="supplier" action="update">
                                 <Button
                                    size="sm"
                                    onClick={() => {
                                       const items = ocItems.filter((i) => ocSel.has(`OC:${i.id}`));
                                       if (items.length) {
                                          setPagarItems(items);
                                          setPagarOpen(true);
                                       }
                                    }}
                                 >
                                    <HandCoins className="mr-2 size-4" /> Pagar seleccionadas
                                 </Button>
                              </PermissionGuard>
                              <Button variant="ghost" size="sm" onClick={() => setOcSel(new Set())}>
                                 Quitar selección
                              </Button>
                           </div>
                        )}

                        {ordenes.data?.length === 0 ? (
                           <EmptyState
                              icon={<ShoppingCart className="size-8 opacity-30" />}
                              title="Sin órdenes de compra"
                              description="Aquí podrás registrar y ver el historial de órdenes de compra enviadas a este proveedor, incluyendo estado, montos y fechas."
                           />
                        ) : (
                           <div className="overflow-x-auto rounded-xl border border-border">
                              <table className="w-full text-sm">
                                 <thead>
                                    <tr className="bg-brand-blue">
                                       <th className="w-10 px-3 py-3">
                                          <Checkbox
                                             checked={ocSelectables.length > 0 && ocSel.size === ocSelectables.length}
                                             onCheckedChange={(v) => {
                                                const next = new Set(ocSel);
                                                ocSelectables.forEach((o) => {
                                                   const k = `OC:${o.id}`;
                                                   if (v) next.add(k);
                                                   else next.delete(k);
                                                });
                                                setOcSel(next);
                                             }}
                                             className="border-blue-200/70 bg-white/10 data-[state=checked]:bg-brand-600"
                                          />
                                       </th>
                                       <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Ref.</th>
                                       <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                                       <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Total</th>
                                       <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pagado</th>
                                       <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                                       <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Estado</th>
                                       <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Pago</th>
                                       <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Ver</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {ocFiltradas.map((o) => {
                                       const pagable =
                                          OC_PAGABLES.includes(o.estado) &&
                                          (o.pendiente ?? 0) > 0;
                                       const k = `OC:${o.id}`;
                                       return (
                                          <tr
                                             key={o.id}
                                             className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-blue/5"
                                             onClick={() => router.push(`/dashboard/compras/${o.id}`)}
                                          >
                                             <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                   checked={ocSel.has(k)}
                                                   disabled={!pagable}
                                                   onCheckedChange={(v) => setOcSel(toggleSel(ocSel, k, !!v))}
                                                />
                                             </td>
                                             <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                                {o.codigoReferencia}
                                             </td>
                                             <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                {fechaCorta(o.fecha)}
                                             </td>
                                             <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                                {`RD$ ${o.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`}
                                             </td>
                                             <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                                                {(o.pagado ?? 0) > 0
                                                   ? `RD$ ${o.pagado.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`
                                                   : "RD$ 0.00"}
                                             </td>
                                             <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-600">
                                                {(o.pendiente ?? 0) > 0
                                                   ? `RD$ ${o.pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`
                                                   : "RD$ 0.00"}
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                <span
                                                   className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.estado === "APROBADA"
                                                      ? "bg-blue-100 text-blue-800"
                                                      : o.estado === "RECIBIDA"
                                                         ? "bg-green-100 text-green-800"
                                                         : o.estado === "CANCELADA"
                                                            ? "bg-gray-100 text-gray-600"
                                                            : o.estado === "PENDIENTE"
                                                               ? "bg-amber-100 text-amber-800"
                                                               : "bg-gray-100 text-gray-600"
                                                      }`}
                                                >
                                                   {o.estado}
                                                </span>
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                {pagable ? (
                                                   <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={(e) => {
                                                         e.stopPropagation();
                                                         setPagarItems([
                                                            {
                                                               kind: "OC",
                                                               id: o.id,
                                                               codigoReferencia: o.codigoReferencia,
                                                               concepto: o.notas ?? "Orden de compra",
                                                               pendiente: o.pendiente ?? 0,
                                                               estado: o.estado,
                                                            },
                                                         ]);
                                                         setPagarOpen(true);
                                                      }}
                                                   >
                                                      <HandCoins className="mr-1 size-3.5" /> Pagar
                                                   </Button>
                                                ) : (
                                                   <span className="text-[10px] uppercase text-muted-foreground">
                                                      {(o.pendiente ?? 0) <= 0 ? "Saldada" : "—"}
                                                   </span>
                                                )}
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                <button
                                                   className="rounded-md p-1.5 text-brand-blue transition-colors hover:bg-brand-blue/10"
                                                   title="Ver detalle"
                                                   onClick={(e) => {
                                                      e.stopPropagation();
                                                      router.push(`/dashboard/compras/${o.id}`);
                                                   }}
                                                >
                                                   <FileText className="size-4" />
                                                </button>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
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
                                       variant={subEstadoPago === op.value ? "default" : "outline"}
                                       onClick={() => setSubEstadoPago(op.value)}
                                    >
                                       {op.label}
                                    </Button>
                                 ))}
                              </div>
                           </div>
                           {(subBusqueda || subDesde || subHasta || subEstadoPago) && (
                              <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => {
                                    setSubBusqueda("");
                                    setSubDesde("");
                                    setSubHasta("");
                                    setSubEstadoPago("");
                                 }}
                              >
                                 Limpiar
                              </Button>
                           )}
                        </div>
                        {subSel.size > 0 && (
                           <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-4 py-2.5">
                              <span className="text-sm font-medium">
                                 {subSel.size} {subSel.size === 1 ? "subcontratación seleccionada" : "subcontrataciones seleccionadas"}
                              </span>
                              <PermissionGuard resource="supplier" action="update">
                                 <Button
                                    size="sm"
                                    onClick={() => {
                                       const items = subPagables.filter((i) => subSel.has(`GASTO:${i.id}`));
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
                                       <th className="w-10 px-3 py-3">
                                          <Checkbox
                                             checked={subSelectables.length > 0 && subSel.size === subSelectables.length}
                                             onCheckedChange={(v) => {
                                                const next = new Set(subSel);
                                                subSelectables.forEach((s) => {
                                                   const k = `GASTO:${s.gasto_id}`;
                                                   if (v) next.add(k);
                                                   else next.delete(k);
                                                });
                                                setSubSel(next);
                                             }}
                                             className="border-blue-200/70 bg-white/10 data-[state=checked]:bg-brand-600"
                                          />
                                       </th>
                                       <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Ref.</th>
                                       <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                                       <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha deuda</th>
                                       <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                                       <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Trabajo</th>
                                       <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Pago</th>
                                       <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Pagar</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {subFiltradas.map((s) => {
                                       const pagable = s.pendiente > 0 && !!s.gasto_id;
                                       const k = `GASTO:${s.gasto_id ?? s.id}`;
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
                                             <td className="px-4 py-3 text-center">
                                                <span
                                                   className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.estado_pago === "PENDIENTE"
                                                      ? "bg-red-100 text-red-800"
                                                      : s.estado_pago === "PARCIAL"
                                                         ? "bg-amber-100 text-amber-800"
                                                         : "bg-green-100 text-green-800"
                                                      }`}
                                                >
                                                   {s.estado_pago}
                                                </span>
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                {pagable ? (
                                                   <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={(e) => {
                                                         e.stopPropagation();
                                                         setPagarItems([
                                                            {
                                                               kind: "GASTO",
                                                               id: s.gasto_id!,
                                                               codigoReferencia: s.codigoReferencia,
                                                               concepto: s.trabajo_descripcion ?? "Subcontratación",
                                                               pendiente: s.pendiente,
                                                            },
                                                         ]);
                                                         setPagarOpen(true);
                                                      }}
                                                   >
                                                      <HandCoins className="mr-1 size-3.5" /> Pagar
                                                   </Button>
                                                ) : (
                                                   <span className="text-[10px] uppercase text-muted-foreground">
                                                      {s.pendiente <= 0 ? "Saldada" : "Sin gasto"}
                                                   </span>
                                                )}
                                             </td>
                                          </tr>
                                       );
                                    })}
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
                        {pagoItems.length > 0 && (
                           <PermissionGuard resource="supplier" action="update">
                              <Button size="sm" onClick={() => { setPagarItems([]); setPagarOpen(true); }}>
                                 <HandCoins className="mr-2 size-4" /> Registrar pago
                              </Button>
                           </PermissionGuard>
                        )}
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                           <MiniStat
                              label="Total facturado"
                              value={`RD$ ${totalFacturadoCombinado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                           />
                           <MiniStat
                              label="Total pagado"
                              value={`RD$ ${totalPagadoCombinado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                           />
                           <MiniStat
                              label="Pendiente"
                              value={`RD$ ${totalPendienteCombinado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                           />
                        </div>

                        {pagoSel.size > 0 && (
                           <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-4 py-2.5">
                              <span className="text-sm font-medium">
                                 {pagoSel.size} {pagoSel.size === 1 ? "deuda seleccionada" : "deudas seleccionadas"}
                              </span>
                              <PermissionGuard resource="supplier" action="update">
                                 <Button
                                    size="sm"
                                    onClick={() => {
                                       const items = pagoItems.filter((i) => pagoSel.has(selKey(i.kind, i.id)));
                                       if (items.length) {
                                          setPagarItems(items);
                                          setPagarOpen(true);
                                       }
                                    }}
                                 >
                                    <HandCoins className="mr-2 size-4" /> Pagar seleccionadas
                                 </Button>
                              </PermissionGuard>
                              <Button variant="ghost" size="sm" onClick={() => setPagoSel(new Set())}>
                                 Quitar selección
                              </Button>
                           </div>
                        )}

                        {pagoItems.length === 0 ? (
                           <EmptyState
                              icon={<Receipt className="size-8 opacity-30" />}
                              title="Sin deuda registrada"
                              description="Los gastos, costos y órdenes de compra vinculados a este proveedor aparecerán aquí con su saldo."
                           />
                        ) : (
                           <div className="overflow-x-auto rounded-xl border border-border">
                              <table className="w-full text-sm">
                                 <thead>
                                    <tr className="bg-brand-blue">
                                       <th className="w-10 px-3 py-3">
                                          <Checkbox
                                             checked={pagoItems.length > 0 && pagoSel.size === pagoItems.length}
                                             onCheckedChange={(v) => {
                                                const next = new Set(pagoSel);
                                                pagoItems.forEach((i) => {
                                                   const k = selKey(i.kind, i.id);
                                                   if (v) next.add(k);
                                                   else next.delete(k);
                                                });
                                                setPagoSel(next);
                                             }}
                                             className="border-blue-200/70 bg-white/10 data-[state=checked]:bg-brand-600"
                                          />
                                       </th>
                                       <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Referencia</th>
                                       <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Concepto</th>
                                       <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                                       <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pagado</th>
                                       <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                                       <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Tipo</th>
                                       <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Pagar</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {pagoItems.map((i) => {
                                       const k = selKey(i.kind, i.id);
                                       const href =
                                          i.kind === "OC"
                                             ? `/dashboard/compras/${i.id}`
                                             : i.kind === "GASTO"
                                                ? `/dashboard/gastos/${i.id}`
                                                : `/dashboard/costos/${i.id}`;
                                       return (
                                          <tr
                                             key={k}
                                             className="cursor-pointer border-b border-border/50 transition-colors hover:bg-brand-blue/5"
                                             onClick={() => router.push(href)}
                                          >
                                             <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                   checked={pagoSel.has(k)}
                                                   onCheckedChange={(v) => setPagoSel(toggleSel(pagoSel, k, !!v))}
                                                />
                                             </td>
                                             <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                                {i.codigoReferencia}
                                             </td>
                                             <td className="max-w-[240px] px-4 py-3">
                                                <div className="truncate">{i.concepto}</div>
                                                {i.categoria && (
                                                   <div className="text-xs text-muted-foreground">{i.categoria}</div>
                                                )}
                                             </td>
                                             <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                                                {`RD$ ${(i.total ?? i.pendiente).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`}
                                             </td>
                                             <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                                                {(i.pagado ?? 0) > 0
                                                   ? `RD$ ${(i.pagado ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`
                                                   : "—"}
                                             </td>
                                             <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-600">
                                                {`RD$ ${i.pendiente.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`}
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                <span
                                                   className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${i.kind === "OC"
                                                      ? "bg-purple-100 text-purple-800"
                                                      : i.kind === "GASTO"
                                                         ? "bg-sky-100 text-sky-800"
                                                         : "bg-amber-100 text-amber-800"
                                                      }`}
                                                >
                                                   {i.kind === "OC" ? (i.estado ?? "OC") : i.kind}
                                                </span>
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                <Button
                                                   size="sm"
                                                   variant="outline"
                                                   onClick={(e) => {
                                                      e.stopPropagation();
                                                      setPagarItems([i]);
                                                      setPagarOpen(true);
                                                   }}
                                                >
                                                   <HandCoins className="mr-1 size-3.5" /> Pagar
                                                </Button>
                                             </td>
                                          </tr>
                                       );
                                    })}
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

            {/* Registrar pago (gastos, costos y órdenes de compra) */}
            <PagarDialog
               open={pagarOpen}
               onOpenChange={(open) => {
                  setPagarOpen(open);
                  if (!open) setPagarItems([]);
               }}
               items={pagarItems}
               allItems={pagoItems}
               onDone={refreshDeuda}
            />
         </div>
      </PermissionGuard>
   );
}

const METODOS_PAGO = ["CHEQUE", "EFECTIVO", "TRANSFERENCIA", "TARJETA", "DESCUENTO_NOMINA"];

function PagarDialog({
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
            const payload = {
               metodo_pago: metodo,
               monto_pagado: m,
               concepto: `Pago a ${i.codigoReferencia} — ${i.concepto}`,
               tipo_movimiento: "SALIDA",
               fecha: fechaPago,
               ...(i.kind === "OC"
                  ? { orden_compra_id: i.id }
                  : i.kind === "GASTO"
                     ? { gasto_empresa_id: i.id }
                     : { costo_cliente_id: i.id }),
            };
            const res = await fetch("/api/pagos", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? `Error al registrar el pago de ${i.codigoReferencia}`);
         }
         onOpenChange(false);
         await onDone();
      } catch (err: any) {
         setError(err?.message ?? "Ocurrió un error al registrar los pagos");
      } finally {
         setLoading(false);
      }
   }

   const INPUT =
      "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 transition-colors";

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-xl">
            <DialogHeader>
               <DialogTitle>Registrar pago</DialogTitle>
               <DialogDescription>
                  Busca las deudas del proveedor, selecciona las que quieras pagar y define los montos.
               </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
               <SelectBuscadorDeudasProveedor
                  deudas={allItems}
                  selectedIds={selected.map(key)}
                  onToggle={toggle}
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
