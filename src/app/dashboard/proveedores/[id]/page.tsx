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
import {
   ArrowLeft,
   Building2,
   FileText,
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
import { OrdenesCompraTable } from "./components/ordenes-compra-table";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import { PurchaseOrder } from "@/dtos/purchase-order.dto";

const TIPO_LABEL: Record<string, string> = {
   SUPLIDOR: "SUPLIDOR",
   SUB_CONTRATISTA: "SUB_CONTRATISTA",
};

const TIPO_BADGE: Record<string, string> = {
   SUPLIDOR: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   SUB_CONTRATISTA: "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
};

export default function SupplierDetailPage() {
   const params = useParams();
   const router = useRouter();
   const supplierId = params.id as string;

   const { UpdateSupplier, DeleteSupplier, GetSupplierById } = useSupplierStore();
   const { GetOrdenesCompraBySupplier, PurchaseOrders: ordenes } = usePurchaseOrderStore();

   const [supplier, setSupplier] = useState<Supplier | null>(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);

   useEffect(() => {
      let active = true;

      async function load() {
         setLoading(true);
         try {
            const data = await GetSupplierById(supplierId);
            await GetOrdenesCompraBySupplier(supplierId);

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
               <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar proveedor
               </Button>
               <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
               </Button>
            </div>
         </div>

         {/* Tabs */}
         <Tabs defaultValue="resumen" className="space-y-4">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               {[
                  { value: "resumen", label: "Resumen" },
                  { value: "compras", label: "Órdenes de compra" },
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
                  <MiniStatCard
                     icon={<ShoppingCart className="size-4 text-brand-blue" />}
                     label="Órdenes de compra"
                     value={ordenes.data?.length.toString() ?? 0}
                     index={0}

                  />
                  <MiniStatCard
                     icon={<Receipt className="size-4 text-brand-blue" />}
                     label="Monto total"
                     value={ordenes.data.reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString("es-DO", { style: "currency", currency: "DOP" })}
                     index={1}
                  />
                  <MiniStatCard
                     icon={<Building2 className="size-4 text-brand-blue" />}
                     label="Última actualización"
                     value={formatDate(supplier.updated_at)}
                     compact
                     index={3}
                  />
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
                     <OrdenesCompraTable ordenes={ordenes} onPageChange={() => { }} onEdit={() => { }} onDelete={() => { }} />
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

            {/* ── PAGOS ── */}
            <TabsContent value="pagos" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Receipt className="size-5 text-brand-blue" />
                        Pagos
                     </CardTitle>
                     <CardDescription>
                        Registro de pagos realizados a este proveedor.
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid gap-4 md:grid-cols-3">
                        <MiniStat label="Pendientes" value="0" />
                        <MiniStat label="Próx. vencimientos" value="0" />
                        <MiniStat label="Total pagado" value="RD$0" />
                     </div>
                     <EmptyState
                        icon={<Receipt className="size-8 opacity-30" />}
                        title="Sin pagos registrados"
                        description="Aquí conectarás pagos, facturas y fechas de vencimiento asociadas a este proveedor."
                     />
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
      </div>
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
