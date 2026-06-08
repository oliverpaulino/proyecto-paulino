"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClientStore } from "@/stores/useClientStore";
import type { Client, Contact } from "@/dtos/client.dto";
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
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
   Mail,
   MoreHorizontal,
   Pencil,
   Phone,
   Plus,
   Trash2,
   User,
} from "lucide-react";
import { ClientForm } from "../components/client-form";
import StatCard from "./components/StatCard";

// IMPORTAMOS NUESTROS SCHEMAS Y ENUMS
import { TipoCliente, TipoIdentificacion } from "@/dtos/schema.dto";

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
   const router = useRouter();
   const clientId = params.id as string;

   const {
      Contacts,
      GetClientContacts,
      CreateContact,
      UpdateContact,
      DeleteContact,
      UpdateClient,
      DeleteClient,
   } = useClientStore();

   const [client, setClient] = useState<ClientRecord | null>(null);
   const [loading, setLoading] = useState(true);
   const [clientActionLoading, setClientActionLoading] = useState(false);
   const [contactActionLoading, setContactActionLoading] = useState(false);

   const [editClientOpen, setEditClientOpen] = useState(false);
   const [deleteClientOpen, setDeleteClientOpen] = useState(false);
   const [createContactOpen, setCreateContactOpen] = useState(false);
   const [editContactOpen, setEditContactOpen] = useState(false);
   const [deleteContactOpen, setDeleteContactOpen] = useState(false);
   const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
   const [contactForm, setContactForm] = useState<ContactFormState>({
      name: "",
      email: "",
      phone: "",
      job_title: "",
   });

   useEffect(() => {
      let active = true;

      async function loadClient() {
         setLoading(true);
         try {
            const [clientResponse] = await Promise.all([
               fetch(`/api/clients/${clientId}`),
               GetClientContacts(clientId, true).catch(() => undefined),
            ]);

            const data = (await clientResponse.json()) as ClientRecord;
            if (active) setClient(data);
         } catch {
            if (active) setClient(null);
         } finally {
            if (active) setLoading(false);
         }
      }

      loadClient();

      return () => {
         active = false;
      };
   }, [clientId, GetClientContacts]);

   const totalContacts = Contacts.length;

   const contactEmailCount = useMemo(
      () => Contacts.filter((contact) => Boolean(contact.email)).length,
      [Contacts],
   );

   const contactPhoneCount = useMemo(
      () => Contacts.filter((contact) => Boolean(contact.phone)).length,
      [Contacts],
   );

   function resetContactForm() {
      setContactForm({
         name: "",
         email: "",
         phone: "",
         job_title: "",
      });
   }

   async function refreshClient() {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) return;
      const data = (await response.json()) as ClientRecord;
      setClient(data);
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
      if (!client) return;
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
      if (!client) return;
      setClientActionLoading(true);
      try {
         const result = await DeleteClient(clientId);
         if (result instanceof Error) throw result;
         router.push("/dashboard/clientes");
      } finally {
         setClientActionLoading(false);
      }
   }

   async function handleCreateContact() {
      if (!contactForm.name.trim()) return;
      setContactActionLoading(true);
      try {
         const result = await CreateContact({
            client_id: clientId,
            name: contactForm.name,
            email: contactForm.email || undefined,
            phone: contactForm.phone || undefined,
            job_title: contactForm.job_title || undefined,
         });

         if (result instanceof Error) throw result;

         setCreateContactOpen(false);
         resetContactForm();
      } finally {
         setContactActionLoading(false);
      }
   }

   async function handleUpdateContact() {
      if (!selectedContact || !contactForm.name.trim()) return;
      setContactActionLoading(true);
      try {
         const result = await UpdateContact({
            client_id: clientId,
            id: selectedContact.id,
            name: contactForm.name,
            email: contactForm.email || undefined,
            phone: contactForm.phone || undefined,
            job_title: contactForm.job_title || undefined,
         } as any);

         if (result instanceof Error) throw result;

         setEditContactOpen(false);
         setSelectedContact(null);
         resetContactForm();
      } finally {
         setContactActionLoading(false);
      }
   }

   async function handleDeleteContact() {
      if (!selectedContact) return;
      setContactActionLoading(true);
      try {
         const result = await DeleteContact(clientId, selectedContact.id);
         if (result instanceof Error) throw result;

         setDeleteContactOpen(false);
         setSelectedContact(null);
      } finally {
         setContactActionLoading(false);
      }
   }

   function openEditContact(contact: Contact) {
      setSelectedContact(contact);
      setContactForm({
         name: contact.name ?? "",
         email: contact.email ?? "",
         phone: contact.phone ?? "",
         job_title: contact.job_title ?? "",
      });
      setEditContactOpen(true);
   }

   function openDeleteContact(contact: Contact) {
      setSelectedContact(contact);
      setDeleteContactOpen(true);
   }

   if (loading && !client) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!client) {
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

   const safeTipoCliente = (client.tipo_cliente?.toUpperCase() || "FISICA") as keyof typeof TipoCliente;
   const safeTipoId = (client.tipo_identificacion?.toUpperCase() || "CEDULA") as keyof typeof TipoIdentificacion;

   return (
      <div className="flex flex-col gap-6 p-6">
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/clientes")}>
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                        {client.nombre}
                     </h1>
                     <span className="rounded-full bg-brand-yellow/20 px-2.5 py-1 text-xs font-semibold text-brand-black dark:text-brand-yellow">
                        {TipoCliente[safeTipoCliente] ?? safeTipoCliente}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                     {TipoIdentificacion[safeTipoId] ?? safeTipoId}: {client.identificacion}
                  </p>
                  <p className="text-sm text-muted-foreground">
                     {client.email ?? "Sin correo"} · {formatPhone(client.telefono) ?? "Sin teléfono"}
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
               <Button variant="outline" onClick={() => router.push(`/dashboard/clientes/${clientId}/contacts`)}>
                  <ContactIcon className="mr-2 size-4" />
                  Gestionar contactos
               </Button>
               <Button variant="outline" onClick={() => setEditClientOpen(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar cliente
               </Button>
               <Button variant="destructive" onClick={() => setDeleteClientOpen(true)}>
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
               </Button>
            </div>
         </div>

         <Tabs defaultValue="resumen" className="space-y-4">
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
                     value={formatDate(client.updated_at)}
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
                           <InfoField label="Nombre" value={client.nombre} />
                           <InfoField label="Identificación" value={client.identificacion} />
                           <InfoField label="Tipo de identificación" value={TipoIdentificacion[safeTipoId] ?? safeTipoId} />
                           <InfoField label="Tipo de cliente" value={TipoCliente[safeTipoCliente] ?? safeTipoCliente} />
                           <InfoField label="Correo" value={client.email ?? "—"} />
                           <InfoField label="Teléfono" value={formatPhone(client.telefono) ?? "—"} />
                           <div className="sm:col-span-2">
                              <InfoField label="Dirección" value={client.direccion ?? "—"} />
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
                        <InfoField label="Creado" value={formatDate(client.created_at)} />
                        <InfoField label="Actualizado" value={formatDate(client.updated_at)} />
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
               <Card>
                  <CardHeader>
                     <CardTitle>Cuentas por cobrar</CardTitle>
                     <CardDescription>Base para facturas, saldos pendientes y vencimientos.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid gap-4 md:grid-cols-3">
                        <MiniStat label="Pendientes" value="0" />
                        <MiniStat label="Vencidas" value="0" />
                        <MiniStat label="Cobrado" value="0" />
                     </div>
                     <EmptyState
                        title="Sin cuentas por cobrar"
                        description="Más adelante podrás ver aquí facturas, pagos pendientes y alertas de vencimiento."
                     />
                  </CardContent>
               </Card>
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
                  <DialogDescription>Actualiza los datos de {client.nombre}.</DialogDescription>
               </DialogHeader>
               <ClientForm
                  initialData={{
                     ...client,
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
                     ¿Estás seguro de que deseas eliminar a <strong>{client.nombre}</strong>? Esta acción no se puede deshacer.
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

         <Dialog
            open={editContactOpen}
            onOpenChange={(open) => {
               setEditContactOpen(open);
               if (!open) {
                  setSelectedContact(null);
                  resetContactForm();
               }
            }}
         >
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar contacto</DialogTitle>
                  <DialogDescription>Modifica la información del contacto.</DialogDescription>
               </DialogHeader>
               {/* <ContactFormFields form={contactForm} onChange={setContactForm} /> */}
               <DialogFooter>
                  <Button variant="outline" onClick={() => setEditContactOpen(false)} disabled={contactActionLoading}>
                     Cancelar
                  </Button>
                  <Button onClick={handleUpdateContact} disabled={contactActionLoading || !contactForm.name.trim()}>
                     {contactActionLoading ? "Guardando…" : "Guardar cambios"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog
            open={deleteContactOpen}
            onOpenChange={(open) => {
               setDeleteContactOpen(open);
               if (!open) setSelectedContact(null);
            }}
         >
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Eliminar contacto</DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer.
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteContactOpen(false)} disabled={contactActionLoading}>
                     Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteContact} disabled={contactActionLoading}>
                     {contactActionLoading ? "Eliminando…" : "Eliminar"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
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