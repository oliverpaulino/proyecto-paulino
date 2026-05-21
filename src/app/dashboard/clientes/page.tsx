"use client";

import { useEffect, useState, useCallback } from "react";
import { ClientProps, TipoCliente, TipoIdentificacion } from "@/modules/clients/domain/client";
import { ClientTable } from "@/components/clients/client-table";
import { ClientForm } from "@/components/clients/client-form";
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { fetchClients, createClient, updateClient, deleteClient } from "@/lib/clients-api";
import { Plus, Search } from "lucide-react";

interface FormValues {
   nombre: string;
   identificacion: string;
   tipo_identificacion: TipoIdentificacion;
   tipo_cliente: TipoCliente;
   email: string;
   telefono: string;
   direccion: string;
}

export default function ClientsPage() {
   const [clients, setClients] = useState<ClientProps[]>([]);
   const [loading, setLoading] = useState(true);
   const [formLoading, setFormLoading] = useState(false);
   const [search, setSearch] = useState("");

   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<ClientProps | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<ClientProps | null>(null);

   const loadClients = useCallback(async () => {
      setLoading(true);
      try {
         const data = await fetchClients();
         setClients(data);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => { loadClients(); }, [loadClients]);

   const filtered = clients.filter((c) => {
      const q = search.toLowerCase();
      return (
         c.nombre.toLowerCase().includes(q) ||
         c.identificacion.toLowerCase().includes(q) ||
         (c.email ?? "").toLowerCase().includes(q) ||
         (c.telefono ?? "").toLowerCase().includes(q)
      );
   });

   const total = clients.length;
   const fisica = clients.filter((c) => c.tipo_cliente === "fisica").length;
   const juridica = clients.filter((c) => c.tipo_cliente === "juridica").length;
   const gubernamental = clients.filter((c) => c.tipo_cliente === "gubernamental").length;

   async function handleCreate(data: FormValues) {
      setFormLoading(true);
      try {
         await createClient({
            ...data,
            email: data.email || null,
            telefono: data.telefono || null,
            direccion: data.direccion || null,
         });
         setCreateOpen(false);
         await loadClients();
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: FormValues) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         await updateClient(editTarget.id, {
            ...data,
            email: data.email || null,
            telefono: data.telefono || null,
            direccion: data.direccion || null,
         });
         setEditTarget(null);
         await loadClients();
      } finally {
         setFormLoading(false);
      }
   }

   async function handleDelete() {
      if (!deleteTarget) return;
      setFormLoading(true);
      try {
         await deleteClient(deleteTarget.id);
         setDeleteTarget(null);
         await loadClients();
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <h1 className="text-2xl font-bold">Clientes</h1>

         {/* Stats cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Clientes" value={total} />
            <StatCard label="Personas Físicas" value={fisica} color="text-green-600 dark:text-green-400" />
            <StatCard label="Jurídicas" value={juridica} color="text-blue-600 dark:text-blue-400" />
            <StatCard label="Gubernamentales" value={gubernamental} color="text-purple-600 dark:text-purple-400" />
         </div>

         {/* Search + New button */}
         <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
               <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar clientes..."
                  className="pl-9"
               />
            </div>

            <div className="ml-auto">
               <Dialog open={createOpen} onOpenChange={(open: boolean) => setCreateOpen(open)}>
                  <DialogTrigger render={<Button />}>
                     <Plus className="size-4" />
                     Nuevo Cliente
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
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
               Cargando…
            </div>
         ) : (
            <ClientTable
               clients={filtered}
               onEdit={(client) => setEditTarget(client)}
               onDelete={(client) => setDeleteTarget(client)}
            />
         )}

         {/* Edit dialog */}
         <Dialog
            open={!!editTarget}
            onOpenChange={(open: boolean) => { if (!open) setEditTarget(null); }}
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
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                  />
               )}
            </DialogContent>
         </Dialog>

         {/* Delete dialog */}
         <DeleteClientDialog
            client={deleteTarget}
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
   color = "text-foreground",
}: {
   label: string;
   value: number;
   color?: string;
}) {
   return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
         <p className="text-sm text-muted-foreground">{label}</p>
         <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      </div>
   );
}