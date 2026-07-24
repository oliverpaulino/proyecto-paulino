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
   Boxes,
   Calendar,
   FileText,
   Layers,
   Loader2,
   Package,
   Pencil,
   Ruler,
   Trash2,
} from "lucide-react";
import type { Item } from "@/dtos/item.dto";
import { useItemStore } from "@/stores/useItemStore";
import { ItemForm, type ItemFormValues } from "../components/item-form";
import { TipoItemManager } from "../components/tipo-item-manager";
import { PermissionGuard } from "@/components/permission-guard";

export default function ItemDetailPage() {
   const params = useParams();
   const router = useRouter();
   const itemId = params.id as string;

   const { UpdateItem, DeleteItem } = useItemStore();

   const [item, setItem] = useState<Item | null>(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [manageOpen, setManageOpen] = useState(false);

   useEffect(() => {

      let active = true;

      async function load() {
         setLoading(true);
         try {
            const res = await fetch(`/api/items/${itemId}`);
            if (!res.ok) throw new Error("Not found");
            const data: Item = await res.json();
            document.title = `Item ${data.nombre} - Inventario`;
            if (active) setItem(data);
         } catch {
            if (active) setItem(null);
         } finally {
            if (active) setLoading(false);
         }
      }

      load();
      return () => { active = false; };
   }, [itemId]);

   async function refreshItem() {
      const res = await fetch(`/api/items/${itemId}`);
      if (!res.ok) return;
      const data: Item = await res.json();
      setItem(data);
   }

   async function handleUpdate(values: ItemFormValues) {
      setActionLoading(true);
      try {
         const result = await UpdateItem(itemId, {
            nombre: values.nombre,
            tipo_id: values.tipo_id,
            stock: values.stock === "" ? 0 : Number(values.stock),
            unidad: values.unidad || null,
            descripcion: values.descripcion || null,
         });
         if (result instanceof Error) throw result;
         await refreshItem();
         setEditOpen(false);
      } finally {
         setActionLoading(false);
      }
   }

   async function handleDelete() {
      setActionLoading(true);
      try {
         const result = await DeleteItem(itemId);
         if (result instanceof Error) throw result;
         router.push("/dashboard/inventario");
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

   if (!item) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <Package className="size-12 opacity-30" />
            <p>Item no encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/inventario")}>
               <ArrowLeft className="mr-2 size-4" />
               Volver
            </Button>
         </div>
      );
   }

   const sinStock = Number(item.stock) <= 0;

   return (
      <PermissionGuard resource="material_request" action="read" mode="page">
      <div className="flex flex-col gap-6 p-6">

         {/* Header */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/inventario")}>
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                        {item.nombre}
                     </h1>
                     <span className="inline-flex items-center rounded-full border border-brand-blue/30 bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {item.tipo_nombre ?? "—"}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                     Stock:{" "}
                     <span className={`font-semibold ${sinStock ? "text-brand-red" : "text-foreground"}`}>
                        {Number(item.stock).toLocaleString("es-DO", { maximumFractionDigits: 2 })}
                        {item.unidad ? ` ${item.unidad}` : ""}
                     </span>
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
               <PermissionGuard resource="material_request" action="update">
               <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar item
               </Button>
               </PermissionGuard>
               <PermissionGuard resource="material_request" action="delete">
               <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
               </Button>
               </PermissionGuard>
            </div>
         </div>

         {/* Tabs */}
         <Tabs defaultValue="resumen" className="space-y-4">
            <TabsList className="w-full flex-wrap justify-start gap-1 p-0">
               {[
                  { value: "resumen", label: "Resumen" },
                  { value: "movimientos", label: "Movimientos" },
                  { value: "documentos", label: "Documentos" },
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
               <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <MiniStatCard
                     icon={<Boxes className="size-4 text-brand-blue" />}
                     label="Stock actual"
                     value={Number(item.stock).toLocaleString("es-DO", { maximumFractionDigits: 2 })}
                     index={0}
                  />
                  <MiniStatCard
                     icon={<Ruler className="size-4 text-brand-blue" />}
                     label="Unidad"
                     value={item.unidad ?? "—"}
                     index={1}
                  />
                  <MiniStatCard
                     icon={<Layers className="size-4 text-brand-blue" />}
                     label="Categoría"
                     value={item.tipo_nombre ?? "—"}
                     index={2}
                  />
                  <MiniStatCard
                     icon={<Calendar className="size-4 text-brand-blue" />}
                     label="Última actualización"
                     value={formatDate(item.updated_at)}
                     compact
                     index={3}
                  />
               </div>

               <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                     <CardHeader>
                        <CardTitle>Información del item</CardTitle>
                        <CardDescription>Detalles del registro de inventario.</CardDescription>
                     </CardHeader>
                     <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                           <InfoField label="Nombre" value={item.nombre} />
                           <InfoField label="Categoría" value={item.tipo_nombre ?? "—"} />
                           <InfoField label="Stock" value={Number(item.stock).toLocaleString("es-DO", { maximumFractionDigits: 2 })} />
                           <InfoField label="Unidad" value={item.unidad ?? "—"} />
                           <div className="sm:col-span-2">
                              <InfoField label="Descripción" value={item.descripcion ?? "—"} />
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
                        <InfoField label="Registrado" value={formatDate(item.created_at)} />
                        <InfoField label="Actualizado" value={formatDate(item.updated_at)} />
                        <InfoField label="Estado" value={sinStock ? "Sin stock" : "Disponible"} />
                     </CardContent>
                  </Card>
               </div>
            </TabsContent>

            {/* ── MOVIMIENTOS ── */}
            <TabsContent value="movimientos" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Boxes className="size-5 text-brand-blue" />
                        Movimientos de stock
                     </CardTitle>
                     <CardDescription>
                        Entradas y salidas de inventario para este item.
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <EmptyState
                        icon={<Boxes className="size-8 opacity-30" />}
                        title="Sin movimientos"
                        description="Aquí podrás registrar y ver entradas, salidas y ajustes de stock de este item, con fechas y cantidades."
                     />
                  </CardContent>
               </Card>
            </TabsContent>

            {/* ── DOCUMENTOS ── */}
            <TabsContent value="documentos" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <FileText className="size-5 text-brand-blue" />
                        Documentos
                     </CardTitle>
                     <CardDescription>
                        Fichas técnicas, facturas y archivos relacionados.
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <EmptyState
                        icon={<FileText className="size-8 opacity-30" />}
                        title="Sin documentos"
                        description="Aquí podrás subir y gestionar fichas técnicas, facturas de compra y cualquier otro documento de este item."
                     />
                  </CardContent>
               </Card>
            </TabsContent>
         </Tabs>

         {/* Edit dialog */}
         <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar item</DialogTitle>
                  <DialogDescription>Actualiza los datos de {item.nombre}.</DialogDescription>
               </DialogHeader>
               <ItemForm
                  initialData={item}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditOpen(false)}
                  loading={actionLoading}
                  submitLabel="Guardar cambios"
                  onManageCategories={() => { setEditOpen(false); setManageOpen(true); }}
               />
            </DialogContent>
         </Dialog>

         {/* Delete dialog */}
         <Dialog open={deleteOpen} onOpenChange={(open) => setDeleteOpen(open)}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Eliminar item</DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de que deseas eliminar <strong>{item.nombre}</strong>? Esta acción no se puede deshacer.
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

         <TipoItemManager open={manageOpen} onOpenChange={setManageOpen} />
      </div>
      </PermissionGuard>
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
      <div className={`flex items-start gap-3 rounded-xl border border-border p-4 shadow-sm ${index !== undefined && index % 2 === 0 ? "bg-brand-yellow" : "bg-brand-red/60"}`}>
         <div className={`mt-0.5 rounded-lg ${index !== undefined && index % 2 === 0 ? "bg-brand-red/50" : "bg-brand-yellow/50"} p-2`}>{icon}</div>
         <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`mt-0.5 font-bold text-foreground ${compact ? "text-base" : "text-2xl"}`}>{value}</p>
         </div>
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
