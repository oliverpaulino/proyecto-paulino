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
import { Plus, Tag, Truck } from "lucide-react";
import { useEquipoStore } from "@/stores/useEquipoStore";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import type { Equipo } from "@/dtos/equipo.dto";
import { EquipoForm, type EquipoFormValues } from "./components/equipo-form";
import { EquipoTable } from "./components/equipo-table";
import { DeleteEquipoDialog } from "./components/delete-equipo-dialog";
import { CategoriaEquipoManager } from "./components/categoria-equipo-manager";
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

export default function EquiposPage() {
   const { Equipos, loading, GetEquipos, CreateEquipo, UpdateEquipo, DeleteEquipo } = useEquipoStore();
   const { CategoriaEquipos, GetCategoriaEquipos } = useCategoriaEquipoStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Equipo | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Equipo | null>(null);
   const [manageOpen, setManageOpen] = useState(false);

   useEffect(() => {
      GetEquipos();
      GetCategoriaEquipos();
   }, [GetEquipos, GetCategoriaEquipos]);

   const filtered = Equipos.filter((e) => {
      const q = search.toLowerCase();
      return (
         e.nombre.toLowerCase().includes(q) ||
         e.categoria_nombre.toLowerCase().includes(q) ||
         e.cobra_en.toLowerCase().includes(q) ||
         (e.placa ?? "").toLowerCase().includes(q) ||
         (e.modelo ?? "").toLowerCase().includes(q)
      );
   });

   const total = Equipos.length;
   const activos = Equipos.filter((e) => e.estado === "ACTIVO").length;
   const enMantenimiento = Equipos.filter((e) => e.estado === "EN_MANTENIMIENTO").length;
   const fueraDeServicio = Equipos.filter((e) => e.estado === "INACTIVO").length;

   function toForm(data: EquipoFormValues) {
      return {
         nombre: data.nombre,
         categoria_id: data.categoria_id,
         estado: data.estado,
         costo_por_hora: data.costo_por_hora === "" ? 0 : Number(data.costo_por_hora),
         placa: data.placa || null,
         modelo: data.modelo || null,
         ano: data.ano === "" ? null : Number(data.ano),
      };
   }

   async function handleCreate(data: EquipoFormValues) {
      setFormLoading(true);
      try {
         const result = await CreateEquipo(toForm(data));
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: EquipoFormValues) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateEquipo(editTarget.id, toForm(data));
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
         const result = await DeleteEquipo(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <PermissionGuard resource="machinery" action="read">
      <div className="flex flex-col gap-6 p-6">

         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Truck className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Equipos
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona la maquinaria de la empresa, sus estados y disponibilidad
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Equipos" value={total} accent="blue" />
            <StatCard label="Disponibles" value={activos} accent="yellow" />
            <StatCard label="En Mantenimiento" value={enMantenimiento} accent="dark" />
            <StatCard label="Fuera de Servicio" value={fueraDeServicio} accent="red" />
         </div>

         {/* Search + actions */}
         <div className="flex flex-wrap items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
               placeholder="Buscar equipos..."
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
                  <PermissionGuard resource="machinery" action="create">
                  <DialogTrigger asChild>
                     <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nuevo Equipo
                     </Button>
                  </DialogTrigger>
                  </PermissionGuard>
                  <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Nuevo Equipo</DialogTitle>
                        <DialogDescription>
                           Registra una nueva pieza de maquinaria.
                        </DialogDescription>
                     </DialogHeader>
                     <EquipoForm
                        onSubmit={handleCreate}
                        onCancel={() => setCreateOpen(false)}
                        loading={formLoading}
                        onManageCategorias={() => { setCreateOpen(false); setManageOpen(true); }}
                     />
                  </DialogContent>
               </Dialog>
            </div>
         </div>

         {/* Table */}
         {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando equipos…
            </div>
         ) : (
            <EquipoTable
               equipos={filtered}
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
                  <DialogTitle>Editar Equipo</DialogTitle>
                  <DialogDescription>
                     Modifica los datos del equipo.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <EquipoForm
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                     onManageCategorias={() => { setEditTarget(null); setManageOpen(true); }}
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteEquipoDialog
            equipo={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={formLoading}
         />

         <CategoriaEquipoManager open={manageOpen} onOpenChange={setManageOpen} />
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
