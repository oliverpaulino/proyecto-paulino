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
import { Plus, Wrench } from "lucide-react";
import { useServiceStore } from "@/stores/useServiceStore";
import type { Servicio } from "@/dtos/service.dto";
import { ServiceForm } from "./components/service-form";
import { ServiceTable } from "./components/service-table";
import { DeleteServiceDialog } from "./components/delete-service-dialog";
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

const currencyFormatter = new Intl.NumberFormat("es-DO", {
   style: "currency",
   currency: "DOP",
   minimumFractionDigits: 0,
   maximumFractionDigits: 0,
});

export default function ServiciosPage() {
   const { Services, loading, GetServices, CreateService, UpdateService, DeleteService } = useServiceStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Servicio | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Servicio | null>(null);

   useEffect(() => {
      GetServices();
   }, [GetServices]);

   const filtered = Services.filter((s) => {
      const q = search.toLowerCase();
      return (
         s.nombre.toLowerCase().includes(q) ||
         (s.descripcion ?? "").toLowerCase().includes(q) ||
         s.tipo.toLowerCase().includes(q)
      );
   });

   const total = Services.length;
   const tipos = new Set(Services.map((s) => s.tipo)).size;
   const precioPromedio =
      Services.length > 0
         ? Services.reduce((acc, s) => acc + Number(s.precio_base), 0) / Services.length
         : 0;

   async function handleCreate(data: {
      nombre: string;
      tipo: Servicio["tipo"];
      precio_base: number;
      descripcion: string | null;
   }) {
      setFormLoading(true);
      try {
         const result = await CreateService(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: {
      nombre: string;
      tipo: Servicio["tipo"];
      precio_base: number;
      descripcion: string | null;
   }) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateService(editTarget.id, data);
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
         const result = await DeleteService(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <PermissionGuard resource="service" action="read">
      <div className="flex flex-col gap-6 p-6">

         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Wrench className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Servicios
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona el catálogo de servicios y sus precios base
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-3">
            <StatCard label="Total Servicios" value={String(total)} accent="blue" />
            <StatCard label="Tipos de Servicio" value={String(tipos)} accent="yellow" />
            <StatCard label="Precio Base Promedio" value={currencyFormatter.format(precioPromedio)} accent="red" />
         </div>

         {/* Search + New */}
         <div className="flex items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
               placeholder="Buscar servicios..."
               debounceDelay={350}
               className="w-full max-w-sm"
            />

            <div className="ml-auto">
               <PermissionGuard resource="service" action="create">
               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                     <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nuevo Servicio
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Nuevo Servicio</DialogTitle>
                        <DialogDescription>
                           Registra un nuevo servicio llenando este formulario.
                        </DialogDescription>
                     </DialogHeader>
                     <ServiceForm
                        onSubmit={handleCreate}
                        onCancel={() => setCreateOpen(false)}
                        loading={formLoading}
                     />
                  </DialogContent>
               </Dialog>
               </PermissionGuard>
            </div>
         </div>

         {/* Table */}
         {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando servicios…
            </div>
         ) : (
            <ServiceTable
               services={filtered}
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
                  <DialogTitle>Editar Servicio</DialogTitle>
                  <DialogDescription>
                     Modifica los datos del servicio.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <ServiceForm
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteServiceDialog
            service={deleteTarget}
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
   value: string;
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
