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
import { Plus, Ruler } from "lucide-react";
import { useUnitStore } from "@/stores/useUnitStore";
import type { Unit, CreateUnitForm, UpdateUnitForm } from "@/dtos/unit.dto";
import { UnitForm } from "./components/unit-form";
import { UnitTable } from "./components/unit-table";
import { DeleteUnitDialog } from "./components/delete-unit-dialog";
import { TableSearch } from "@/components/table-search";
import { SelectBuscadorUnidad } from "@/components/shared/selectBuscadorUnidad";
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
} as const;

export default function UnidadesPage() {
   const { Units, loading, GetUnits, CreateUnit, UpdateUnit, DeleteUnit } = useUnitStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Unit | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

   useEffect(() => {
      GetUnits();
   }, [GetUnits]);

   const filtered = Units.filter((u) => {
      const q = search.toLowerCase();
      return (
         u.nombre.toLowerCase().includes(q) ||
         u.abreviatura.toLowerCase().includes(q) ||
         u.tipo_unidad.toLowerCase().includes(q)
      );
   });

   const total = Units.length;
   const tipos = new Set(Units.map((u) => u.tipo_unidad)).size;

   async function handleCreate(data: CreateUnitForm) {
      setFormLoading(true);
      try {
         const result = await CreateUnit(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: UpdateUnitForm) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateUnit(editTarget.id, data);
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
         const result = await DeleteUnit(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <PermissionGuard resource="category" action="read" mode="page">
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Ruler className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Unidades
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona las unidades de medida y sus conversiones
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Total Unidades" value={String(total)} accent="blue" />
            <StatCard label="Categorías de Medida" value={String(tipos)} accent="yellow" />
         </div>

         {/* Search + New */}
         <div className="flex items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
               placeholder="Buscar unidades por nombre o abreviatura..."
               debounceDelay={350}
               className="w-full max-w-sm"
            />

            <div className="ml-auto">
               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <PermissionGuard resource="category" action="create">
                  <DialogTrigger asChild>
                     <Button className="hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nueva Unidad
                     </Button>
                  </DialogTrigger>
                  </PermissionGuard>
                  <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Nueva Unidad</DialogTitle>
                        <DialogDescription>
                           Registra una nueva unidad de medida en el sistema.
                        </DialogDescription>
                     </DialogHeader>
                     <UnitForm
                        onSubmit={handleCreate}
                        onCancel={() => setCreateOpen(false)}
                        loading={formLoading}
                     />
                  </DialogContent>
               </Dialog>
            </div>
         </div>

         {/* Table */}
         {loading && Units.length === 0 ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando unidades…
            </div>
         ) : (
            <UnitTable
               units={filtered}
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
                  <DialogTitle>Editar Unidad</DialogTitle>
                  <DialogDescription>
                     Modifica los datos de la unidad de medida.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <UnitForm
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteUnitDialog
            unit={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={formLoading}
         />
      </div>
      </PermissionGuard>
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