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
import { Plus, Tags, Shield, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useCategoriaGastoStore } from "@/stores/useCategoriaGastoStore";
import type { CategoriaGasto, CreateCategoriaGastoForm, UpdateCategoriaGastoForm } from "@/dtos/categoria-gasto.dto";
import { CategoriaGastoForm } from "./components/categoria-gasto-form";
import { CategoriaGastoTable } from "./components/categoria-gasto-table";
import { DeleteCategoriaDialog } from "./components/delete-categoria-gasto-dialog";
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
} as const;

export default function CategoriaGastosPage() {
   const router = useRouter();
   const session = useSession();
   const role = session?.data?.user?.role;

   const { Categorias, loading, GetCategorias, CreateCategoria, UpdateCategoria, DeleteCategoria } = useCategoriaGastoStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<CategoriaGasto | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<CategoriaGasto | null>(null);

   useEffect(() => {
      document.title = "Categorías de Gastos";
      if (role === "administrador") {
         // Obtenemos un límite alto para poder agruparlas y filtrarlas localmente de forma fluida
         GetCategorias({ limit: 500 });
      }
   }, [role, GetCategorias]);

   if (session?.isPending) {
      return (
         <div className="flex items-center justify-center p-12">
            <div className="size-6 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
         </div>
      );
   }

   if (role !== "administrador") {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <Shield className="size-12 opacity-30" />
            <p>Solo los administradores pueden gestionar las categorías de gastos.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/gastos")}>
               <ArrowLeft className="mr-2 size-4" /> Volver
            </Button>
         </div>
      );
   }

   const filtered = Categorias.filter((c) => {
      const q = search.toLowerCase();
      return (
         c.nombre.toLowerCase().includes(q) ||
         c.grupo.toLowerCase().includes(q)
      );
   });

   const total = Categorias.length;
   const gruposActivos = new Set(Categorias.map((c) => c.grupo)).size;

   async function handleCreate(data: CreateCategoriaGastoForm) {
      setFormLoading(true);
      try {
         const result = await CreateCategoria(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: UpdateCategoriaGastoForm) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateCategoria(editTarget.id, data);
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
         const result = await DeleteCategoria(deleteTarget.id);
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
               <Tags className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Categorías de Gastos
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona las categorías de gastos y agrúpalas por su naturaleza
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Total Categorías" value={String(total)} accent="blue" />
            <StatCard label="Grupos Utilizados" value={String(gruposActivos)} accent="yellow" />
         </div>

         {/* Search + New */}
         <div className="flex items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
               placeholder="Buscar categorías por nombre o grupo..."
               debounceDelay={350}
               className="w-full max-w-sm"
            />

            <div className="ml-auto">
               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                     <Button className="font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nueva Categoría
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Nueva Categoría de Gasto</DialogTitle>
                        <DialogDescription>
                           Registra una nueva categoría para clasificar los gastos de la empresa.
                        </DialogDescription>
                     </DialogHeader>
                     <CategoriaGastoForm
                        onSubmit={handleCreate}
                        onCancel={() => setCreateOpen(false)}
                        loading={formLoading}
                     />
                  </DialogContent>
               </Dialog>
            </div>
         </div>

         {/* Table */}
         {loading && Categorias.length === 0 ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando categorías…
            </div>
         ) : (
            <CategoriaGastoTable
               categorias={filtered}
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
                  <DialogTitle>Editar Categoría</DialogTitle>
                  <DialogDescription>
                     Modifica los datos de la categoría de gasto.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <CategoriaGastoForm
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteCategoriaDialog
            categoria={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={formLoading}
         />
      </div>
   );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: keyof typeof STAT_STYLES }) {
   const s = STAT_STYLES[accent];
   return (
      <div className={`rounded-xl ${s.card} p-5`}>
         <p className={`text-sm font-medium ${s.label}`}>{label}</p>
         <p className={`mt-1 text-4xl font-bold ${s.value}`}>{value}</p>
         <div className={`mt-3 h-1 w-10 rounded-full ${s.bar}`} />
      </div>
   );
}