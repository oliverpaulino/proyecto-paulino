"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
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
import type { ContactEmployee } from "@/dtos/employee.dto";
import { useDebounce } from "@/hooks/use-debounce";
import { TableSearch } from "@/components/table-search";
import { GeneralSchemasDTO } from "@/dtos/schema.dto";
import { PermissionGuard } from "@/components/permission-guard";

interface EmployeeContactsViewProps {
   empleadoId: string;
}

export function EmployeeContactsView({ empleadoId }: EmployeeContactsViewProps) {
   const router = useRouter();

   const {
      selectedEmployee,
      GetEmployeeDetails,
      CreateContact,
      UpdateContact,
      DeleteContact,
   } = useEmployeeStore();

   const [createOpen, setCreateOpen] = useState(false);
   const [search, setSearch] = useState("");
   const debouncedSearch = useDebounce(search, 400);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [selectedContact, setSelectedContact] = useState<ContactEmployee | null>(null);
   const [loading, setLoading] = useState(false);
   const [loadingContact] = useState(false);

   const [errors, setErrors] = useState<Record<string, string>>({});

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

   const lastQueryRef = useRef<string>("");
   const searchInFlightRef = useRef<boolean>(false);

   const empleado = selectedEmployee?.empleado;
   const contactos: ContactEmployee[] = (selectedEmployee?.contactos ?? []) as ContactEmployee[];

   useEffect(() => {
      if (!createOpen && !editOpen && !deleteOpen) {
         document.body.style.pointerEvents = "";
      }
   }, [createOpen, editOpen, deleteOpen]);

   useEffect(() => {
      (async () => {
         setLoading(true);
         try {
            await GetEmployeeDetails(empleadoId);
         } catch {
            // silent
         }
         setLoading(false);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [empleadoId]);

   const handleSearch = useCallback(async (searchValue: string) => {
      if (searchValue === lastQueryRef.current) return;
      lastQueryRef.current = searchValue ?? "";
      if (searchInFlightRef.current) return;
      searchInFlightRef.current = true;
      try {
         await GetEmployeeDetails(empleadoId);
      } catch {
         // silent
      } finally {
         searchInFlightRef.current = false;
      }
   }, [GetEmployeeDetails, empleadoId]);

   const resetForm = () => {
      setFormData({ name: "", email: "", phone: "", job_title: "" });
      setErrors({});
   };

   const validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!formData.name.trim()) {
         newErrors.name = "El nombre es obligatorio";
      }

      if (formData.email) {
         const emailValidation = GeneralSchemasDTO.EmailSchema.safeParse(formData.email);
         if (!emailValidation.success) {
            newErrors.email = emailValidation.error.issues[0].message;
         }
      }

      if (formData.phone) {
         const phoneValidation = GeneralSchemasDTO.TelefonoSchema.safeParse(formData.phone);
         if (!phoneValidation.success) {
            newErrors.phone = phoneValidation.error.issues[0].message;
         }
      }

      if (!formData.phone && !formData.email) {
         newErrors.phone = "Se requiere al menos un teléfono o un email";
         newErrors.email = "Se requiere al menos un teléfono o un email";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
   };

   const handleCreate = async () => {
      if (!validateForm()) return;

      setLoading(true);
      try {
         await CreateContact({
            empleado_id: empleadoId,
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            job_title: formData.job_title || undefined,
         });
         setCreateOpen(false);
         resetForm();
      } catch (error) {
         console.error("Error creating contact:", error);
      } finally {
         setLoading(false);
      }
   };

   const handleEdit = async () => {
      if (!selectedContact || !validateForm()) return;

      setLoading(true);
      try {
         await UpdateContact(selectedContact.id, {
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            job_title: formData.job_title || undefined,
         });
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
         await DeleteContact(empleadoId, selectedContact.id);
         setDeleteOpen(false);
         setSelectedContact(null);
      } catch (error) {
         console.error("Error deleting contact:", error);
      } finally {
         setLoading(false);
      }
   };

   const openEditDialog = (contact: ContactEmployee) => {
      setSelectedContact(contact);
      setFormData({
         name: contact.name || "",
         email: (contact.email as string) || "",
         phone: (contact.phone as string) || "",
         job_title: contact.job_title || "",
      });
      setErrors({});
      setEditOpen(true);
   };

   const openDeleteDialog = (contact: ContactEmployee) => {
      setSelectedContact(contact);
      setDeleteOpen(true);
   };

   const filteredContacts = useMemo(() => {
      if (!debouncedSearch) return contactos;
      const q = debouncedSearch.toLowerCase();
      return contactos.filter((c) => {
         const name = (c.name || "").toLowerCase();
         const job = (c.job_title || "").toLowerCase();
         return name.includes(q) || job.includes(q);
      });
   }, [contactos, debouncedSearch]);

   const formatPhone = (phone: string | null | undefined) => {
      if (!phone) return "—";
      if (phone.length === 10) return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
      return phone;
   };

   return (
      <PermissionGuard resource="users" action="read" mode="page">
      <div className="space-y-4 sm:space-y-6">
         {/* Header */}
         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
               <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => router.push("/dashboard/empleados")}
               >
                  <ArrowLeft className="h-4 w-4" />
               </Button>
               <div className="min-w-0">
                  <h1 className="text-lg font-bold tracking-tight sm:text-2xl truncate">
                     Contactos {empleado ? `— ${empleado.nombre}` : <Loader2 className="h-6 w-6 inline animate-spin" />}
                  </h1>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                     Gestiona los contactos asociados a este empleado.
                  </p>
               </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
               <TableSearch
                  value={search}
                  onValueChange={setSearch}
                  onSearch={handleSearch}
                  placeholder="Buscar por nombre o cargo..."
                  loading={loadingContact}
                  className="w-full sm:w-64"
               />
               <PermissionGuard resource="users" action="create">
               <Button className="w-full sm:w-auto" onClick={() => { resetForm(); setCreateOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Contacto
               </Button>
               </PermissionGuard>
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
                        {contactos.length === 0 ? "Agrega el primer contacto para este empleado." : "No se encontraron contactos que coincidan con la búsqueda."}
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
                                 <TableHead>Fecha</TableHead>
                                 <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {filteredContacts.map((contact) => (
                                 <TableRow key={contact.id}>
                                    <TableCell className="font-medium">{contact.name}</TableCell>
                                    <TableCell>{(contact.email as string) || "—"}</TableCell>
                                    <TableCell>{formatPhone(contact.phone as string)}</TableCell>
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
                                             <PermissionGuard resource="users" action="update">
                                             <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                             </DropdownMenuItem>
                                             </PermissionGuard>
                                             <PermissionGuard resource="users" action="delete">
                                             <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => openDeleteDialog(contact)}
                                             >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Eliminar
                                             </DropdownMenuItem>
                                             </PermissionGuard>
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
                                       <p className="text-sm text-muted-foreground truncate">{contact.email as string}</p>
                                    )}
                                    {contact.phone && (
                                       <p className="text-sm text-muted-foreground">{formatPhone(contact.phone as string)}</p>
                                    )}
                                 </div>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                          <MoreHorizontal className="h-4 w-4" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                       <PermissionGuard resource="users" action="update">
                                       <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Editar
                                       </DropdownMenuItem>
                                       </PermissionGuard>
                                       <PermissionGuard resource="users" action="delete">
                                       <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => openDeleteDialog(contact)}
                                       >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Eliminar
                                       </DropdownMenuItem>
                                       </PermissionGuard>
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
                  setTimeout(() => { document.body.style.pointerEvents = ""; }, 0);
               }
            }}
         >
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Nuevo Contacto</DialogTitle>
                  <DialogDescription>Agrega un nuevo contacto para este empleado.</DialogDescription>
               </DialogHeader>

               <ContactFormFields formData={formData} setFormData={setFormData} errors={errors} />

               <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCreateOpen(false)}>
                     Cancelar
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={handleCreate} disabled={loading}>
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
                  setTimeout(() => { document.body.style.pointerEvents = ""; }, 0);
               }
            }}
         >
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Editar Contacto</DialogTitle>
                  <DialogDescription>Modifica la información del contacto.</DialogDescription>
               </DialogHeader>

               <ContactFormFields formData={formData} setFormData={setFormData} errors={errors} />

               <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditOpen(false)}>
                     Cancelar
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={handleEdit} disabled={loading}>
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
                  setTimeout(() => { document.body.style.pointerEvents = ""; }, 0);
               }
            }}
         >
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Eliminar Contacto</DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de que deseas eliminar a{" "}
                     <strong>{selectedContact?.name}</strong>? Esta acción no se puede deshacer.
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
      </PermissionGuard>
   );
}


function ContactFormFields({
   formData,
   setFormData,
   errors,
}: {
   formData: { name: string; email: string; phone: string; job_title: string };
   setFormData: React.Dispatch<React.SetStateAction<any>>;
   errors: Record<string, string>;
}) {
   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleanValue = e.target.value.replace(/\D/g, "");
      setFormData({ ...formData, phone: cleanValue });
   };

   const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleanValue = e.target.value.toLowerCase().trim();
      setFormData({ ...formData, email: cleanValue });
   };

   return (
      <div className="grid gap-4 py-4">
         <div className="grid gap-2">
            <Label htmlFor="contact-name">Nombre *</Label>
            <Input
               id="contact-name"
               value={formData.name}
               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
               placeholder="Nombre del contacto"
               className={errors.name ? "border-destructive focus-visible:ring-destructive/50" : ""}
            />
            {errors.name && <p className="text-xs font-medium text-destructive">{errors.name}</p>}
         </div>
         <div className="grid gap-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
               id="contact-email"
               type="email"
               value={formData.email}
               onChange={handleEmailChange}
               placeholder="correo@ejemplo.com"
               className={errors.email ? "border-destructive focus-visible:ring-destructive/50" : ""}
            />
            {errors.email && <p className="text-xs font-medium text-destructive">{errors.email}</p>}
         </div>
         <div className="grid gap-2">
            <Label htmlFor="contact-phone">Teléfono</Label>
            <Input
               id="contact-phone"
               type="tel"
               value={formData.phone}
               onChange={handlePhoneChange}
               placeholder="Ej: 8091234567"
               className={errors.phone ? "border-destructive focus-visible:ring-destructive/50" : ""}
            />
            {errors.phone && <p className="text-xs font-medium text-destructive">{errors.phone}</p>}
         </div>
         <div className="grid gap-2">
            <Label htmlFor="contact-job">Cargo</Label>
            <Input
               id="contact-job"
               value={formData.job_title}
               onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
               placeholder="Gerente, Director, etc."
            />
         </div>
      </div>
   );
}
