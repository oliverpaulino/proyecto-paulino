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
import { Plus, Users } from "lucide-react";

import { useClientStore } from "@/stores/useClientStore";
import type { Client } from "@/dtos/client.dto";
import { ClientForm } from "./components/client-form";
import { ClientTable } from "./components/client-table";
import { DeleteClientDialog } from "./components/delete-client-dialog";
import { TableSearch } from "@/components/table-search";

import { TipoIdentificacion } from "@/dtos/schema.dto";
import { TipoCliente } from "@/dtos/client.dto";

interface FormValues {
   nombre: string;
   identificacion: string;
   tipo_identificacion: keyof typeof TipoIdentificacion;
   tipo_cliente: keyof typeof TipoCliente;
   email: string;
   telefono: string;
   direccion: string;
}

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

export default function ClientsPage() {
   const { Clients, loading, GetClients, CreateClient, UpdateClient, DeleteClient } = useClientStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Client | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

   useEffect(() => {
      GetClients();
   }, [GetClients]);

   const filtered = Clients.filter((c) => {
      const q = search.toLowerCase();
      return (
         c.nombre.toLowerCase().includes(q) ||
         c.identificacion.toLowerCase().includes(q) ||
         (c.email ?? "").toLowerCase().includes(q) ||
         (c.telefono ?? "").toLowerCase().includes(q)
      );
   });

   const total = Clients.length;
   
   const fisica = Clients.filter((c) => c.tipo_cliente?.toUpperCase() === "FISICA").length;
   const juridica = Clients.filter((c) => c.tipo_cliente?.toUpperCase() === "JURIDICA").length;
   const gubernamental = Clients.filter((c) => c.tipo_cliente?.toUpperCase() === "GUBERNAMENTAL").length;

   async function handleCreate(data: FormValues) {
      setFormLoading(true);
      try {
         const result = await CreateClient({
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

   async function handleEdit(data: FormValues) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateClient(editTarget.id, {
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
         const result = await DeleteClient(deleteTarget.id);
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
               <Users className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Clientes
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona tu cartera de clientes
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Clientes" value={total} accent="blue" />
            <StatCard label="Personas Físicas" value={fisica} accent="yellow" />
            <StatCard label="Jurídicas" value={juridica} accent="red" />
            <StatCard label="Gubernamentales" value={gubernamental} accent="dark" />
         </div>

         {/* Search + New */}
         <div className="flex items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
               placeholder="Buscar clientes..."
               debounceDelay={350}
               className="w-full max-w-sm"
            />

            <div className="ml-auto">
               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                     <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nuevo Cliente
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Nuevo Cliente</DialogTitle>
                        <DialogDescription>
                           Crea un nuevo cliente llenando este formulario.
                        </DialogDescription>
                     </DialogHeader>
                     <ClientForm
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
               Cargando clientes…
            </div>
         ) : (
            <ClientTable
               clients={filtered.map(c => ({
                  ...c,
                  email: c.email ?? null,
                  telefono: c.telefono ?? null,
               }))}
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
                  <DialogTitle>Editar Cliente</DialogTitle>
                  <DialogDescription>
                     Modifica los datos del cliente.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <ClientForm
                     initialData={{
                        ...editTarget,
                        // Normalizamos al editar para que el ClientForm lo reciba limpio
                        tipo_cliente: editTarget.tipo_cliente?.toUpperCase() as keyof typeof TipoCliente,
                        tipo_identificacion: editTarget.tipo_identificacion?.toUpperCase() as keyof typeof TipoIdentificacion,
                     }}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteClientDialog
            client={
               deleteTarget
                  ? {
                       ...deleteTarget,
                       email: deleteTarget.email ?? null,
                       telefono: deleteTarget.telefono ?? null,
                    }
                  : null
            }
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