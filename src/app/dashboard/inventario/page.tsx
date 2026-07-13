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
import { Package, Plus, Tag } from "lucide-react";
import { useItemStore } from "@/stores/useItemStore";
import { useTipoItemStore } from "@/stores/useTipoItemStore";
import type { Item } from "@/dtos/item.dto";
import { ItemForm, type ItemFormValues } from "./components/item-form";
import { ItemTable } from "./components/item-table";
import { DeleteItemDialog } from "./components/delete-item-dialog";
import { TipoItemManager } from "./components/tipo-item-manager";
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

export default function InventarioPage() {
   const { Items, loading, GetItems, CreateItem, UpdateItem, DeleteItem } = useItemStore();
   const { TipoItems, GetTipoItems } = useTipoItemStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Item | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
   const [manageOpen, setManageOpen] = useState(false);

   useEffect(() => {
      document.title = "Inventario"
      GetItems();
      GetTipoItems();
   }, [GetItems, GetTipoItems]);

   const filtered = Items.filter((i) => {
      const q = search.toLowerCase();
      return (
         i.nombre.toLowerCase().includes(q) ||
         (i.tipo_nombre ?? "").toLowerCase().includes(q) ||
         (i.unidad ?? "").toLowerCase().includes(q) ||
         (i.descripcion ?? "").toLowerCase().includes(q)
      );
   });

   const total = Items.length;
   const totalCategorias = TipoItems.length;
   const stockTotal = Items.reduce((sum, i) => sum + Number(i.stock), 0);
   const sinStock = Items.filter((i) => Number(i.stock) <= 0).length;

   function toForm(data: ItemFormValues) {
      return {
         nombre: data.nombre,
         tipo_id: data.tipo_id,
         stock: data.stock === "" ? 0 : Number(data.stock),
         unidad: data.unidad || null,
         descripcion: data.descripcion || null,
      };
   }

   async function handleCreate(data: ItemFormValues) {
      setFormLoading(true);
      try {
         const result = await CreateItem(toForm(data));
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: ItemFormValues) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateItem(editTarget.id, toForm(data));
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
         const result = await DeleteItem(deleteTarget.id);
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
               <Package className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Inventario
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona tus items de inventario y categorías
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Items" value={total} accent="blue" />
            <StatCard label="Categorías" value={totalCategorias} accent="yellow" />
            <StatCard label="Stock Total" value={stockTotal.toLocaleString("es-DO", { maximumFractionDigits: 2 })} accent="dark" />
            <StatCard label="Sin Stock" value={sinStock} accent="red" />
         </div>

         {/* Search + actions */}
         <div className="flex flex-wrap items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
               placeholder="Buscar items..."
               debounceDelay={350}
               className="w-full max-w-sm"
            />

            <div className="ml-auto flex gap-2">
               <Button
                  variant="outline"
                  onClick={() => setManageOpen(true)}
                  className="font-semibold"
               >
                  <Tag className="size-4 mr-2" />
                  Gestionar categorías
               </Button>

               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                     <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nuevo Item
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Nuevo Item</DialogTitle>
                        <DialogDescription>
                           Registra un nuevo item de inventario.
                        </DialogDescription>
                     </DialogHeader>
                     <ItemForm
                        onSubmit={handleCreate}
                        onCancel={() => setCreateOpen(false)}
                        loading={formLoading}
                        onManageCategories={() => { setCreateOpen(false); setManageOpen(true); }}
                     />
                  </DialogContent>
               </Dialog>
            </div>
         </div>

         {/* Table */}
         {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando items…
            </div>
         ) : (
            <ItemTable
               items={filtered}
               onEdit={setEditTarget}
               onDelete={setDeleteTarget}
            />
         )}

         {/* Edit dialog */}
         <Dialog
            open={!!editTarget}
            onOpenChange={(open) => { if (!open) setEditTarget(null); }}
         >
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar Item</DialogTitle>
                  <DialogDescription>
                     Modifica los datos del item.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <ItemForm
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                     onManageCategories={() => { setEditTarget(null); setManageOpen(true); }}
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteItemDialog
            item={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={formLoading}
         />

         <TipoItemManager open={manageOpen} onOpenChange={setManageOpen} />
      </div>
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
