"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ShoppingCart } from "lucide-react";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import type { PurchaseOrder } from "@/dtos/purchase-order.dto";
import { PurchaseOrderForm } from "./purchase-order-form";
import { PurchaseOrderTable } from "./purchase-order-table";
import { DeletePurchaseOrderDialog } from "./delete-purchase-order-dialog";
import { TableSearch } from "@/components/table-search";

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
   red: {
      card: "bg-brand-red shadow-lg shadow-brand-red/20",
      label: "text-red-200",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
   dark: {
      card: "bg-brand-black shadow-lg shadow-black/30",
      label: "text-gray-400",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
} as const;

interface FormPayload {
   proveedor_id: string;
   fecha: string;
   notas: string;
   items: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
   }>;
}

export default function ComprasView() {
   const {
      PurchaseOrders,
      loading,
      GetPurchaseOrders,
      CreatePurchaseOrder,
      UpdatePurchaseOrder,
      DeletePurchaseOrder,
   } = usePurchaseOrderStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [page, setPage] = useState(1);
   const limit = 10;
   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<PurchaseOrder | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);

   useEffect(() => {
      GetPurchaseOrders({
         force: true,
         page,
         limit,
         search,
      });
   }, [GetPurchaseOrders, page, search]);


   const total = PurchaseOrders.total;
   const pendientes = PurchaseOrders.data.filter((o) => o.estado === "PENDIENTE").length;
   const aprobadas = PurchaseOrders.data.filter((o) => o.estado === "APROBADA").length;

   async function handleCreate(data: FormPayload) {
      setFormLoading(true);
      try {
         const result = await CreatePurchaseOrder({
            proveedor_id: data.proveedor_id,
            fecha: new Date(data.fecha),
            notas: data.notas || null,
            items: data.items,
         });
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: FormPayload) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdatePurchaseOrder(editTarget.id, {
            proveedor_id: data.proveedor_id,
            fecha: new Date(data.fecha),
            notas: data.notas || null,
            items: data.items,
         });
         if (result instanceof Error) throw result;
         setEditTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleDelete() {
      if (!deleteTarget) return;
      setFormLoading(true);
      try {
         const result = await DeletePurchaseOrder(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } finally {
         setFormLoading(false);
      }
   }
   return (
      <div className="flex flex-col gap-6 p-6">

         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <ShoppingCart className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Órdenes de Compra
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona las órdenes de compra a proveedores
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-3">
            <StatCard label="Total Órdenes" value={total} accent="blue" />
            <StatCard label="Pendientes" value={pendientes} accent="yellow" />
            <StatCard label="Aprobadas" value={aprobadas} accent="red" />
         </div>

         {/* Search + New */}
         <div className="flex items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={(value) => {
                  setPage(1);
                  setSearch(value);
               }}
               placeholder="Buscar por proveedor, estado…"
               debounceDelay={350}
               className="w-full max-w-sm"
            />

            <div className="ml-auto">
               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                     <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nueva Orden
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                     <DialogHeader>
                        <DialogTitle>Nueva Orden de Compra</DialogTitle>
                        <DialogDescription>
                           Registra una nueva orden de compra con sus ítems.
                        </DialogDescription>
                     </DialogHeader>
                     <PurchaseOrderForm
                        onSubmit={handleCreate}
                        onCancel={() => setCreateOpen(false)}
                        loading={formLoading}
                     />
                  </DialogContent>
               </Dialog>
            </div>
         </div>

         {/* Table */}
         {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando órdenes de compra…
            </div>
         ) : (
            <PurchaseOrderTable
               orders={PurchaseOrders.data}
               onEdit={setEditTarget}
               onDelete={setDeleteTarget}
            />
         )}
         <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
               Página {page} de {Math.ceil(PurchaseOrders.total / limit)}
            </p>

            <div className="flex gap-2">
               <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
               >
                  Anterior
               </Button>

               <Button
                  variant="outline"
                  disabled={page >= Math.ceil(PurchaseOrders.total / limit)}
                  onClick={() => setPage((p) => p + 1)}
               >
                  Siguiente
               </Button>
            </div>
         </div>

         {/* Edit dialog */}
         <Dialog
            open={!!editTarget}
            onOpenChange={(open) => { if (!open) setEditTarget(null); }}
         >
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Orden de Compra</DialogTitle>
                  <DialogDescription>
                     Modifica los datos de la orden de compra.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <PurchaseOrderForm
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeletePurchaseOrderDialog
            order={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={formLoading}
         />
      </div>
   );
}

function StatCard({
   label,
   value,
   accent,
}: {
   label: string;
   value: number;
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
