"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClientStore } from "@/stores/useClientStore";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MoreHorizontal, Plus, Pencil, Trash2, User, Loader2 } from "lucide-react";
import type { Contact } from "@/dtos/client.dto";
import { useDebounce } from "@/hooks/use-debounce";
import { TableSearch } from "@/components/table-search";

interface ClientContactsViewProps {
   clientId: string;
}

export function ClientContactsView({ clientId }: ClientContactsViewProps) {
   const router = useRouter();

   const {
      Contacts,
      Clients,
      GetClientContacts,
      CreateContact,
      UpdateContact,
      DeleteContact,
      GetClients,
   } = useClientStore();

   const [createOpen, setCreateOpen] = useState(false);
   const [search, setSearch] = useState("");
   const debouncedSearch = useDebounce(search, 400);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
   const [loading, setLoading] = useState(false);
   const [loadingContact, setLoadingContact] = useState(false);

   const [formData, setFormData] = useState<{
      name: string;
      email: string;
      phone: string;
      job_title: string;
   }>({
      name: "",
      email: "",
      phone: "",
      job_title: "",
   });

   const searchTermRef = useRef<string>("");
   const lastQueryRef = useRef<string>("");
   const searchInFlightRef = useRef<boolean>(false);

   const client = Clients.find((c) => c.id === clientId);

   // FIX: Limpiar pointer-events cuando cambie el estado de los diálogos
   useEffect(() => {
      if (!createOpen && !editOpen && !deleteOpen) {
         // Limpiar pointer-events del body cuando todos los diálogos estén cerrados
         document.body.style.pointerEvents = '';
      }
   }, [createOpen, editOpen, deleteOpen]);

   useEffect(() => {
      (async () => {
         setLoading(true);
         try {
            await GetClientContacts(clientId);
         } catch (e) {
            // silent
         }
         if (Clients.length === 0) {
            try {
               await GetClients();
            } catch (e) {
               // silent
            }
         }
         setLoading(false);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [clientId]);

   const handleSearch = useCallback(async (searchValue: string) => {
      if (searchValue === lastQueryRef.current) return;
      lastQueryRef.current = searchValue ?? "";

      if (searchInFlightRef.current) return;
      searchInFlightRef.current = true;
      setLoadingContact(true);

      try {
         await (GetClientContacts as any)(clientId, searchValue);
      } catch (e) {
         console.error("Search error:", e);
      } finally {
         searchInFlightRef.current = false;
         setLoadingContact(false);
      }
   }, [GetClientContacts, clientId]);

   const resetForm = () => {
      setFormData({ name: "", email: "", phone: "", job_title: "" });
   };

   const handleCreate = async () => {
      if (!formData.name.trim()) return;
      setLoading(true);
      try {
         await CreateContact({
            client_id: clientId,
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            job_title: formData.job_title || undefined,
         });
         await GetClientContacts(clientId);
         setCreateOpen(false);
         resetForm();
      } catch (error) {
         console.error("Error creating contact:", error);
      } finally {
         setLoading(false);
      }
   };

   const handleEdit = async () => {
      if (!selectedContact || !formData.name.trim()) return;
      setLoading(true);
      try {
         await UpdateContact({
            client_id: clientId,
            id: selectedContact.id,
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            job_title: formData.job_title || undefined,
         } as any);
         await GetClientContacts(clientId);
         setEditOpen(false);
         setSelectedContact(null);
         resetForm();
      } catch (error) {
         console.error("Error updating contact:", error);
      } finally {
         setLoading(false);
      }
   };

   const handleDelete = async () => {
      if (!selectedContact) return;
      setLoading(true);
      try {
         await DeleteContact(clientId, selectedContact.id);
         await GetClientContacts(clientId);
         setDeleteOpen(false);
         setSelectedContact(null);
      } catch (error) {
         console.error("Error deleting contact:", error);
      } finally {
         setLoading(false);
      }
   };

   const openEditDialog = (contact: Contact) => {
      setSelectedContact(contact);
      setFormData({
         name: contact.name || "",
         email: contact.email || "",
         phone: contact.phone || "",
         job_title: contact.job_title || "",
      });
      setEditOpen(true);
   };

   const openDeleteDialog = (contact: Contact) => {
      setSelectedContact(contact);
      setDeleteOpen(true);
   };

   const filteredContacts = useMemo(() => {
      if (!debouncedSearch) return Contacts;
      const q = debouncedSearch.toLowerCase();
      return Contacts.filter((c) => {
         const name = (c.name || "").toLowerCase();
         const job = (c.job_title || "").toLowerCase();
         return name.includes(q) || job.includes(q);
      });
   }, [Contacts, debouncedSearch]);

   return (
      <div className="space-y-4 sm:space-y-6">
         {/* Header */}
         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
               <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => router.push("/dashboard/clientes")}
               >
                  <ArrowLeft className="h-4 w-4" />
               </Button>
               <div className="min-w-0">
                  <h1 className="text-lg font-bold tracking-tight sm:text-2xl truncate">
                     Contactos {client ? `— ${client.nombre}` : ""}
                  </h1>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                     Gestiona los contactos asociados a este cliente.
                  </p>
               </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row min-w-[25vw]  sm:items-center">
               <TableSearch
                  value={search}
                  onValueChange={setSearch}
                  onSearch={handleSearch}
                  placeholder="Buscar por nombre o cargo..."
                  loading={loadingContact}
                  className="md:w-full w-[90vw] m-auto"
               />
               <Button className="w-full sm:w-auto" onClick={() => { resetForm(); setCreateOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Contacto
               </Button>
            </div>
         </div>

         {/* Contacts Table */}
         <Card>
            <CardHeader>
               <CardTitle>Contactos</CardTitle>
               <CardDescription>
                  {filteredContacts.length} contacto{filteredContacts.length !== 1 ? "s" : ""} mostrado{filteredContacts.length !== 1 ? "s" : ""}
               </CardDescription>
            </CardHeader>
            <CardContent>
               {loading ? (
                  <div className="flex items-center justify-center py-12">
                     <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
               ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                     <User className="h-12 w-12 text-muted-foreground mb-4" />
                     <h3 className="text-lg font-medium">No hay contactos</h3>
                     <p className="text-sm text-muted-foreground mt-1">
                        {Contacts.length === 0 ? "Agrega el primer contacto para este cliente." : "No se encontraron contactos que coincidan con la búsqueda."}
                     </p>
                  </div>
               ) : (
                  <>
                     {/* Desktop table */}
                     <div className="hidden md:block overflow-x-auto">
                        <Table>
                           <TableHeader>
                              <TableRow>
                                 <TableHead>Nombre</TableHead>
                                 <TableHead>Email</TableHead>
                                 <TableHead>Teléfono</TableHead>
                                 <TableHead>Cargo</TableHead>
                                 <TableHead>Fecha de creación</TableHead>
                                 <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {filteredContacts.map((contact) => (
                                 <TableRow key={contact.id}>
                                    <TableCell className="font-medium">{contact.name}</TableCell>
                                    <TableCell>{contact.email || "—"}</TableCell>
                                    <TableCell>{contact.phone || "—"}</TableCell>
                                    <TableCell>{contact.job_title || "—"}</TableCell>
                                    <TableCell>
                                       {contact.created_at
                                          ? new Date(contact.created_at).toLocaleDateString()
                                          : "—"}
                                    </TableCell>
                                    <TableCell>
                                       <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                             </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                             <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                             </DropdownMenuItem>
                                             <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => openDeleteDialog(contact)}
                                             >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Eliminar
                                             </DropdownMenuItem>
                                          </DropdownMenuContent>
                                       </DropdownMenu>
                                    </TableCell>
                                 </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     </div>

                     {/* Mobile cards */}
                     <div className="grid gap-3 md:hidden">
                        {filteredContacts.map((contact) => (
                           <Card key={contact.id} className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                 <div className="min-w-0 flex-1 space-y-1">
                                    <p className="font-medium truncate">{contact.name}</p>
                                    {contact.job_title && (
                                       <p className="text-sm text-muted-foreground">{contact.job_title}</p>
                                    )}
                                    {contact.email && (
                                       <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                                    )}
                                    {contact.phone && (
                                       <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                    )}
                                    {contact.created_at && (
                                       <p className="text-xs text-muted-foreground">
                                          {new Date(contact.created_at).toLocaleDateString()}
                                       </p>
                                    )}
                                 </div>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                          <MoreHorizontal className="h-4 w-4" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                       <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Editar
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => openDeleteDialog(contact)}
                                       >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Eliminar
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </div>
                           </Card>
                        ))}
                     </div>
                  </>
               )}
            </CardContent>
         </Card>

         {/* Create Dialog */}
         <Dialog
            open={createOpen}
            onOpenChange={(open) => {
               setCreateOpen(open);
               if (!open) {
                  resetForm();
                  setLoading(false);
                  // Forzar limpieza del pointer-events
                  setTimeout(() => {
                     document.body.style.pointerEvents = '';
                  }, 0);
               }
            }}
         >
            <DialogContent className="w-[95vw] max-w-lg sm:max-w-[50vw]">
               <DialogHeader>
                  <DialogTitle>Nuevo Contacto</DialogTitle>
                  <DialogDescription>
                     Agrega un nuevo contacto para este cliente.
                  </DialogDescription>
               </DialogHeader>
               <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                     <Label htmlFor="create-name">Nombre *</Label>
                     <Input
                        id="create-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nombre del contacto"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="create-email">Email</Label>
                     <Input
                        id="create-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="correo@ejemplo.com"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="create-phone">Teléfono</Label>
                     <Input
                        id="create-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (809) 000-0000"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="create-job">Cargo</Label>
                     <Input
                        id="create-job"
                        value={formData.job_title}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                        placeholder="Gerente, Director, etc."
                     />
                  </div>
               </div>
               <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCreateOpen(false)}>
                     Cancelar
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={handleCreate} disabled={loading || !formData.name.trim()}>
                     {loading ? "Creando..." : "Crear Contacto"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Edit Dialog */}
         <Dialog
            modal={editOpen}
            open={editOpen}
            onOpenChange={(open) => {
               setEditOpen(open);
               if (!open) {
                  setSelectedContact(null);
                  resetForm();
                  setLoading(false);
                  // Forzar limpieza del pointer-events
                  setTimeout(() => {
                     document.body.style.pointerEvents = '';
                  }, 0);
               }
            }}
         >
            <DialogContent className="w-[95vw] max-w-lg sm:max-w-[50vw]">
               <DialogHeader>
                  <DialogTitle>Editar Contacto</DialogTitle>
                  <DialogDescription>
                     Modifica la información del contacto.
                  </DialogDescription>
               </DialogHeader>
               <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                     <Label htmlFor="edit-name">Nombre *</Label>
                     <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nombre del contacto"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="edit-email">Email</Label>
                     <Input
                        id="edit-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="correo@ejemplo.com"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="edit-phone">Teléfono</Label>
                     <Input
                        id="edit-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (809) 000-0000"
                     />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="edit-job">Cargo</Label>
                     <Input
                        id="edit-job"
                        value={formData.job_title}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                        placeholder="Gerente, Director, etc."
                     />
                  </div>
               </div>
               <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditOpen(false)}>
                     Cancelar
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={handleEdit} disabled={loading || !formData.name.trim()}>
                     {loading ? "Guardando..." : "Guardar Cambios"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Delete Confirmation Dialog */}
         <Dialog
            modal={deleteOpen}
            open={deleteOpen}
            onOpenChange={(open) => {
               setDeleteOpen(open);
               if (!open) {
                  setSelectedContact(null);
                  setLoading(false);
                  // Forzar limpieza del pointer-events
                  setTimeout(() => {
                     document.body.style.pointerEvents = '';
                  }, 0);
               }
            }}
         >
            <DialogContent className="w-[95vw] max-w-lg sm:max-w-[50vw]">
               <DialogHeader>
                  <DialogTitle>Eliminar Contacto</DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de que deseas eliminar a{" "}
                     <strong>{selectedContact?.name}</strong>? Esta acción no se puede
                     deshacer.
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteOpen(false)}>
                     Cancelar
                  </Button>
                  <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete} disabled={loading}>
                     {loading ? "Eliminando..." : "Eliminar"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}