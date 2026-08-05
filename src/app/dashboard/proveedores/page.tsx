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
import { Plus, Truck } from "lucide-react";
import { useSupplierStore } from "@/stores/useSupplierStore";
import type { Supplier, SupplierForm } from "@/dtos/supplier.dto";
import { SupplierForm as SupplierFormComponent } from "./components/supplier-form";
import { SupplierTable } from "./components/supplier-table";
import { DeleteSupplierDialog } from "./components/delete-supplier-dialog";
import { TableSearch } from "@/components/table-search";
import { PermissionGuard } from "@/components/permission-guard";

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

export default function ProveedoresPage() {
   const { Suppliers, loading, GetSuppliers, CreateSupplier, UpdateSupplier, DeleteSupplier } = useSupplierStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [tipoFilter, setTipoFilter] = useState<string>("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Supplier | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

   useEffect(() => {
      document.title = "Proveedores";
      GetSuppliers();
   }, [GetSuppliers]);

   const filtered = Suppliers.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
         s.nombre.toLowerCase().includes(q) ||
         s.rnc.toLowerCase().includes(q) ||
         (s.email ?? "").toLowerCase().includes(q) ||
         (s.telefono ?? "").toLowerCase().includes(q);
      const matchTipo = tipoFilter === "" || s.tipo === tipoFilter;
      return matchSearch && matchTipo;
   });

   const total = Suppliers.length;
   const SUB_CONTRATISTAs = Suppliers.filter((s) => s.tipo === "SUB_CONTRATISTA" || s.tipo === "AMBOS").length;
   const suplidor = Suppliers.filter((s) => s.tipo === "SUPLIDOR" || s.tipo === "AMBOS").length;
   const ambos = Suppliers.filter((s) => s.tipo === "AMBOS").length;

   async function handleCreate(data: SupplierForm) {
      setFormLoading(true);
      try {
         const result = await CreateSupplier({
            ...data,
            email: data.email || null,
            telefono: data.telefono || null,
            direccion: data.direccion || null,
         });
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: SupplierForm) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateSupplier(editTarget.id, {
            ...data,
            email: data.email || null,
            telefono: data.telefono || null,
            direccion: data.direccion || null,
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
         const result = await DeleteSupplier(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <PermissionGuard resource="supplier" action="read" mode="page">
      <div className="flex flex-col gap-6 p-6">

         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Truck className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Proveedores
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona tu directorio de proveedores
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Proveedores" value={total} accent="blue" />
            <StatCard label="Subcontratistas" value={SUB_CONTRATISTAs} accent="yellow" />
            <StatCard label="Suplidores" value={suplidor} accent="red" />
            <StatCard label="Ambos" value={ambos} accent="dark" />
         </div>

         {/* Search + New */}
         <div className="flex items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
               placeholder="Buscar proveedores..."
               debounceDelay={350}
               className="w-full max-w-sm"
            />

            <div className="ml-auto">
               <PermissionGuard resource="supplier" action="create">
               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                     <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nuevo Proveedor
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Nuevo Proveedor</DialogTitle>
                        <DialogDescription>
                           Registra un nuevo proveedor llenando este formulario.
                        </DialogDescription>
                     </DialogHeader>
                     <SupplierFormComponent
                        onSubmit={handleCreate}
                        onCancel={() => setCreateOpen(false)}
                        loading={formLoading}
                     />
                  </DialogContent>
               </Dialog>
               </PermissionGuard>
            </div>
         </div>

         {/* Filtro por tipo */}
         <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
            {[
               { value: "", label: "Todos" },
               { value: "SUPLIDOR", label: "Suplidores" },
               { value: "SUB_CONTRATISTA", label: "Subcontratistas" },
               { value: "AMBOS", label: "Ambos" },
            ].map((t) => (
               <Button
                  key={t.value}
                  size="sm"
                  variant={tipoFilter === t.value ? "default" : "outline"}
                  onClick={() => setTipoFilter(t.value)}
               >
                  {t.label}
               </Button>
            ))}
         </div>

         {/* Table */}
         {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando proveedores…
            </div>
         ) : (
            <SupplierTable
               suppliers={filtered}
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
                  <DialogTitle>Editar Proveedor</DialogTitle>
                  <DialogDescription>
                     Modifica los datos del proveedor.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <SupplierFormComponent
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteSupplierDialog
            supplier={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={formLoading}
         />
      </div>
      </PermissionGuard>
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
