"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useClientStore } from "@/stores/useClientStore";
import type { Client } from "@/dtos/client.dto";
import type { ClientProps } from "@/backend/modules/clients/domain/clients.domain";
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
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   ArrowLeft,
   Building2,
   Contact as ContactIcon,
   Loader2,
   Mail, Pencil,
   Phone, Trash2,
   User
} from "lucide-react";
import { ClientForm } from "../components/client-form";
import StatCard from "./components/StatCard";
import { PermissionGuard } from "@/components/permission-guard";
import { ClienteCxcTab } from "./components/cliente-cxc-tab";

// IMPORTAMOS NUESTROS SCHEMAS Y ENUMS
import { TipoIdentificacion } from "@/dtos/schema.dto";
import { TipoCliente } from "@/dtos/client.dto";

type ClientRecord = Omit<Client, "created_at" | "updated_at"> & {
   created_at: string | Date;
   updated_at: string | Date;
};

type ContactFormState = {
   name: string;
   email: string;
   phone: string;
   job_title: string;
};

const formatPhone = (phone: string | null | undefined) => {
   if (!phone) return "—";
   if (phone.length === 10) return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
   return phone;
};

export default function ClientDetailPage() {
   const params = useParams();
   const pathname = usePathname()
   const router = useRouter();
   const clientId = params.id as string;

   const { selectedClient, GetClient } = useClientStore();

   const {
      Contacts,
      UpdateClient,
      DeleteClient,
      setSelectedClient
   } = useClientStore();

   const [loading, setLoading] = useState(false);
   const searchParams = useSearchParams();
   const activeTab = searchParams.get("tab") || "resumen";
   const [clientActionLoading, setClientActionLoading] = useState(false);

   const [editClientOpen, setEditClientOpen] = useState(false);
   const [deleteClientOpen, setDeleteClientOpen] = useState(false);
   const [contactForm, setContactForm] = useState<ContactFormState>({
      name: "",
      email: "",
      phone: "",
      job_title: "",
   });


   const handleTabChange = (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`${pathname}?${params.toString()}`);
   };


   useEffect(() => {
      const loadClient = async () => {
         setLoading(true);
         const client = await GetClient(clientId);
         setSelectedClient(client);
         document.title = client ? `${client.nombre}` : "Cargando Cliente...";
         setLoading(false);
      };

      loadClient();
   }, [clientId, GetClient, setSelectedClient]);

   const totalContacts = Contacts.length;

   const contactEmailCount = useMemo(
      () => Contacts.filter((contact) => Boolean(contact.email)).length,
      [Contacts],
   );

   const contactPhoneCount = useMemo(
      () => Contacts.filter((contact) => Boolean(contact.phone)).length,
      [Contacts],
   );

   async function refreshClient() {
      GetClient(clientId);
   }

   async function handleUpdateClient(values: {
      nombre: string;
      identificacion: string;
      tipo_identificacion: string;
      tipo_cliente: string;
      email: string;
      telefono: string;
      direccion: string;
   }) {
      if (!selectedClient) return;
      setClientActionLoading(true);
      try {
         const result = await UpdateClient(clientId, {
            nombre: values.nombre,
            identificacion: values.identificacion,
            tipo_identificacion: values.tipo_identificacion as ClientProps["tipo_identificacion"],
            tipo_cliente: values.tipo_cliente as ClientProps["tipo_cliente"],
            email: values.email || null,
            telefono: values.telefono || null,
            direccion: values.direccion || null,
         });

         if (result instanceof Error) throw result;

         await refreshClient();
         setEditClientOpen(false);
      } finally {
         setClientActionLoading(false);
      }
   }

   async function handleDeleteClient() {
      if (!selectedClient) return;
      setClientActionLoading(true);
      try {
         const result = await DeleteClient(clientId);
         if (result instanceof Error) throw result;
         router.push("/dashboard/clientes");
      } finally {
         setClientActionLoading(false);
      }
   }

   if (loading && !selectedClient) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!selectedClient) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <User className="size-12 opacity-30" />
            <p>Cliente no encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/clientes")}>
               <ArrowLeft className="mr-2 size-4" />
               Volver
            </Button>
         </div>
      );
   }

   const safeTipoCliente = (selectedClient.tipo_cliente?.toUpperCase() || "FISICA") as keyof typeof TipoCliente;
   const safeTipoId = (selectedClient.tipo_identificacion?.toUpperCase() || "CEDULA") as keyof typeof TipoIdentificacion;

   return (
      <PermissionGuard resource="client" action="read" mode="page">
         <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
               <div className="flex items-start gap-4">
                  <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/clientes")}>
                     <ArrowLeft className="size-4" />
                  </Button>
                  <div className="space-y-1">
                     <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                           {selectedClient.nombre}
                        </h1>
                        <span className="rounded-full bg-brand-yellow/20 px-2.5 py-1 text-xs font-semibold text-brand-black dark:text-brand-yellow">
                           {TipoCliente[safeTipoCliente] ?? safeTipoCliente}
                        </span>
                     </div>
                     <p className="text-sm text-muted-foreground">
                        {TipoIdentificacion[safeTipoId] ?? safeTipoId}: {selectedClient.identificacion}
                     </p>
                     <p className="text-sm text-muted-foreground">
                        {selectedClient.email ?? "Sin correo"} · {formatPhone(selectedClient.telefono) ?? "Sin teléfono"}
                     </p>
                  </div>
               </div>

               <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="outline" onClick={() => router.push(`/dashboard/clientes/${clientId}/contacts`)}>
                     <ContactIcon className="mr-2 size-4" />
                     Gestionar contactos
                  </Button>
                  <PermissionGuard resource="client" action="update">
                     <Button variant="outline" onClick={() => setEditClientOpen(true)}>
                        <Pencil className="mr-2 size-4" />
                        Editar cliente
                     </Button>
                  </PermissionGuard>
                  <PermissionGuard resource="client" action="delete">
                     <Button variant="destructive" onClick={() => setDeleteClientOpen(true)}>
                        <Trash2 className="mr-2 size-4" />
                        Eliminar
                     </Button>
                  </PermissionGuard>
               </div>
            </div>

            <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="space-y-4">
               <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                  <TabsTrigger value="resumen" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                     Resumen
                  </TabsTrigger>
                  <TabsTrigger value="proyectos" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                     Proyectos
                  </TabsTrigger>
                  <TabsTrigger value="cxc" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                     Cuentas por cobrar
                  </TabsTrigger>
                  <TabsTrigger value="cxp" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                     Cuentas por pagar
                  </TabsTrigger>
               </TabsList>

               <TabsContent value="resumen" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                     <StatCard
                        label="Contactos registrados"
                        value={totalContacts}
                        icon={<ContactIcon className="size-4" />}
                     />
                     <StatCard
                        label="Contactos con correo"
                        value={contactEmailCount}
                        icon={<Mail className="size-4" />}
                     />
                     <StatCard
                        label="Contactos con teléfono"
                        value={contactPhoneCount}
                        icon={<Phone className="size-4" />}
                     />
                     <StatCard
                        label="Última actualización"
                        value={formatDate(selectedClient.updated_at)}
                        icon={<Building2 className="size-4" />}
                        compact
                     />
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                     <Card className="lg:col-span-2">
                        <CardHeader>
                           <CardTitle>Información del cliente</CardTitle>
                           <CardDescription>Datos principales y de contacto.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="grid gap-4 sm:grid-cols-2">
                              <InfoField label="Nombre" value={selectedClient.nombre} />
                              <InfoField label="Identificación" value={selectedClient.identificacion} />
                              <InfoField label="Tipo de identificación" value={TipoIdentificacion[safeTipoId] ?? safeTipoId} />
                              <InfoField label="Tipo de cliente" value={TipoCliente[safeTipoCliente] ?? safeTipoCliente} />
                              <InfoField label="Correo" value={selectedClient.email ?? "—"} />
                              <InfoField label="Teléfono" value={formatPhone(selectedClient.telefono) ?? "—"} />
                              <div className="sm:col-span-2">
                                 <InfoField label="Dirección" value={selectedClient.direccion ?? "—"} />
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     <Card>
                        <CardHeader>
                           <CardTitle>Actividad</CardTitle>
                           <CardDescription>Fechas y estado general del registro.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <InfoField label="Creado" value={formatDate(selectedClient.created_at)} />
                           <InfoField label="Actualizado" value={formatDate(selectedClient.updated_at)} />
                           <InfoField label="Estado" value="Activo" />
                        </CardContent>
                     </Card>
                  </div>

                  <Card>
                     <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                           <div>
                              <CardTitle className="flex items-center gap-2">
                                 <ContactIcon className="size-5 text-brand-blue" />
                                 Contactos
                              </CardTitle>
                              <CardDescription>
                                 {totalContacts === 0
                                    ? "No hay contactos registrados para este cliente."
                                    : `${totalContacts} contacto${totalContacts === 1 ? "" : "s"} registrado${totalContacts === 1 ? "" : "s"}`}
                              </CardDescription>
                           </div>
                        </div>
                     </CardHeader>
                     <CardContent>
                        {Contacts.length === 0 ? (
                           <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                              <ContactIcon className="size-8 opacity-30" />
                              <p className="text-sm">Agrega el primer contacto para este cliente.</p>
                           </div>
                        ) : (
                           <Table>
                              <TableHeader>
                                 <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Cargo</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {Contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                       <TableCell className="font-medium">{contact.name}</TableCell>
                                       <TableCell>{contact.email || "—"}</TableCell>
                                       <TableCell>{formatPhone(contact.phone)}</TableCell>
                                       <TableCell>{contact.job_title || "—"}</TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        )}
                     </CardContent>
                  </Card>
               </TabsContent>

               <TabsContent value="proyectos" className="space-y-4">
                  <Card>
                     <CardHeader>
                        <CardTitle>Proyectos</CardTitle>
                        <CardDescription>Base para ver proyectos activos, en pausa o terminados asociados a este cliente.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                           <MiniStat label="Activos" value="0" />
                           <MiniStat label="En pausa" value="0" />
                           <MiniStat label="Finalizados" value="0" />
                        </div>
                        <EmptyState
                           title="Aún no hay proyectos"
                           description="Aquí luego podrás listar proyectos, su estado, avance y montos relacionados con este cliente."
                        />
                     </CardContent>
                  </Card>
               </TabsContent>

               <TabsContent value="cxc" className="space-y-4">
                  <ClienteCxcTab clientId={clientId} clienteNombre={selectedClient.nombre} />
               </TabsContent>

               <TabsContent value="cxp" className="space-y-4">
                  <Card>
                     <CardHeader>
                        <CardTitle>Cuentas por pagar</CardTitle>
                        <CardDescription>Base para compromisos pendientes, proveedores y pagos programados.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                           <MiniStat label="Pendientes" value="0" />
                           <MiniStat label="Próximos" value="0" />
                           <MiniStat label="Pagado" value="0" />
                        </div>
                        <EmptyState
                           title="Sin cuentas por pagar"
                           description="Esta pestaña queda lista para que luego conectes proveedores, saldos y fechas de pago."
                        />
                     </CardContent>
                  </Card>
               </TabsContent>
            </Tabs>

            <Dialog
               open={editClientOpen}
               onOpenChange={(open) => {
                  if (!open) setEditClientOpen(false);
               }}
            >
               <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                     <DialogTitle>Editar cliente</DialogTitle>
                     <DialogDescription>Actualiza los datos de {selectedClient.nombre}.</DialogDescription>
                  </DialogHeader>
                  <ClientForm
                     initialData={{
                        ...selectedClient,
                        tipo_cliente: safeTipoCliente,
                        tipo_identificacion: safeTipoId
                     } as unknown as Partial<ClientProps>}
                     onSubmit={handleUpdateClient}
                     onCancel={() => setEditClientOpen(false)}
                     loading={clientActionLoading}
                     submitLabel="Guardar cambios"
                  />
               </DialogContent>
            </Dialog>

            <Dialog open={deleteClientOpen} onOpenChange={(open) => setDeleteClientOpen(open)}>
               <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                     <DialogTitle>Eliminar cliente</DialogTitle>
                     <DialogDescription>
                        ¿Estás seguro de que deseas eliminar a <strong>{selectedClient.nombre}</strong>? Esta acción no se puede deshacer.
                     </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                     <Button variant="outline" onClick={() => setDeleteClientOpen(false)} disabled={clientActionLoading}>
                        Cancelar
                     </Button>
                     <Button variant="destructive" onClick={handleDeleteClient} disabled={clientActionLoading}>
                        {clientActionLoading ? "Eliminando…" : "Eliminar"}
                     </Button>
                  </DialogFooter>
               </DialogContent>
            </Dialog>


         </div>
      </PermissionGuard>
   );
}

function MiniStat({ label, value }: { label: string; value: string }) {
   return (
      <div className="rounded-lg border bg-muted/20 p-4">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      </div>
   );
}

function EmptyState({ title, description }: { title: string; description: string }) {
   return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 py-10 text-center">
         <p className="text-base font-semibold">{title}</p>
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