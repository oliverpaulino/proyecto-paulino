"use client";

import { useEffect, useState, useMemo } from "react";
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
import {
   ArrowLeft,
   MoreHorizontal,
   Plus,
   Pencil,
   Trash2,
   Phone,
   Mail,
   Loader2,
} from "lucide-react";
import type { ContactEmployee } from "@/dtos/employee.dto";

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

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

   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [selectedContact, setSelectedContact] = useState<ContactEmployee | null>(null);
   const [loading, setLoading] = useState(false);

   const [formData, setFormData] = useState({
      tipo_contacto: "TELEFONO" as "TELEFONO" | "EMAIL",
      contacto: "",
   });

   useEffect(() => {
      (async () => {
         setLoading(true);
         try {
            await GetEmployeeDetails(empleadoId);
         } finally {
            setLoading(false);
         }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [empleadoId]);

   function resetForm() {
      setFormData({ tipo_contacto: "TELEFONO", contacto: "" });
   }

   const contactos = selectedEmployee?.contactos ?? [];
   const empleado = selectedEmployee?.empleado;

   const filteredContacts = useMemo(() => {
      if (!search) return contactos;
      const q = search.toLowerCase();
      return contactos.filter(
         (c) =>
            c.contacto.toLowerCase().includes(q) ||
            c.tipo_contacto.toLowerCase().includes(q)
      );
   }, [contactos, search]);

   async function handleCreate() {
      if (!formData.contacto.trim()) return;
      setLoading(true);
      try {
         await CreateContact({
            empleado_id: empleadoId,
            tipo_contacto: formData.tipo_contacto,
            contacto: formData.contacto,
         });
         setCreateOpen(false);
         resetForm();
      } finally {
         setLoading(false);
      }
   }

   async function handleEdit() {
      if (!selectedContact || !formData.contacto.trim()) return;
      setLoading(true);
      try {
         await UpdateContact(selectedContact.id, {
            tipo_contacto: formData.tipo_contacto,
            contacto: formData.contacto,
         });
         setEditOpen(false);
         setSelectedContact(null);
         resetForm();
      } finally {
         setLoading(false);
      }
   }

   async function handleDelete() {
      if (!selectedContact) return;
      setLoading(true);
      try {
         await DeleteContact(empleadoId, selectedContact.id);
         setDeleteOpen(false);
         setSelectedContact(null);
      } finally {
         setLoading(false);
      }
   }

   function openEdit(contact: ContactEmployee) {
      setSelectedContact(contact);
      setFormData({
         tipo_contacto: contact.tipo_contacto,
         contacto: contact.contacto,
      });
      setEditOpen(true);
   }

   return (
      <div className="space-y-6">
         {/* Header */}
         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
               <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push(`/dashboard/empleados/${empleadoId}`)}
               >
                  <ArrowLeft className="size-4" />
               </Button>
               <div>
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                     Contactos{" "}
                     {empleado ? (
                        <span className="text-muted-foreground">— {empleado.nombre}</span>
                     ) : (
                        <Loader2 className="inline size-5 animate-spin" />
                     )}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                     Información de contacto del empleado
                  </p>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar contactos..."
                  className="w-56"
               />
               <Button
                  onClick={() => {
                     resetForm();
                     setCreateOpen(true);
                  }}
               >
                  <Plus className="size-4 mr-2" />
                  Nuevo Contacto
               </Button>
            </div>
         </div>

         {/* Contacts Table */}
         <Card>
            <CardHeader>
               <CardTitle>Contactos</CardTitle>
               <CardDescription>
                  {filteredContacts.length} contacto{filteredContacts.length !== 1 ? "s" : ""}
               </CardDescription>
            </CardHeader>
            <CardContent>
               {loading ? (
                  <div className="flex items-center justify-center py-12">
                     <Loader2 className="size-6 animate-spin" />
                  </div>
               ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                     <Phone className="size-10 opacity-30" />
                     <p className="text-sm">
                        {contactos.length === 0
                           ? "Agrega el primer contacto para este empleado."
                           : "No se encontraron contactos."}
                     </p>
                  </div>
               ) : (
                  <>
                     {/* Desktop */}
                     <div className="hidden md:block overflow-x-auto">
                        <Table>
                           <TableHeader>
                              <TableRow>
                                 <TableHead>Tipo</TableHead>
                                 <TableHead>Contacto</TableHead>
                                 <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {filteredContacts.map((contact) => (
                                 <TableRow key={contact.id}>
                                    <TableCell>
                                       <TipoBadge tipo={contact.tipo_contacto} />
                                    </TableCell>
                                    <TableCell>
                                       <ContactoLink contact={contact} />
                                    </TableCell>
                                    <TableCell>
                                       <ContactoMenu
                                          contact={contact}
                                          onEdit={() => openEdit(contact)}
                                          onDelete={() => {
                                             setSelectedContact(contact);
                                             setDeleteOpen(true);
                                          }}
                                       />
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
                                 <div className="space-y-1">
                                    <TipoBadge tipo={contact.tipo_contacto} />
                                    <div className="pt-1">
                                       <ContactoLink contact={contact} />
                                    </div>
                                 </div>
                                 <ContactoMenu
                                    contact={contact}
                                    onEdit={() => openEdit(contact)}
                                    onDelete={() => {
                                       setSelectedContact(contact);
                                       setDeleteOpen(true);
                                    }}
                                 />
                              </div>
                           </Card>
                        ))}
                     </div>
                  </>
               )}
            </CardContent>
         </Card>

         {/* Create Dialog */}
         <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Nuevo Contacto</DialogTitle>
                  <DialogDescription>Agrega un dato de contacto para este empleado.</DialogDescription>
               </DialogHeader>
               <ContactFormFields form={formData} onChange={setFormData} selectClass={SELECT_CLASS} />
               <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={loading}>
                     Cancelar
                  </Button>
                  <Button
                     onClick={handleCreate}
                     disabled={loading || !formData.contacto.trim()}
                  >
                     {loading ? "Creando…" : "Crear Contacto"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Edit Dialog */}
         <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setSelectedContact(null); resetForm(); } }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar Contacto</DialogTitle>
               </DialogHeader>
               <ContactFormFields form={formData} onChange={setFormData} selectClass={SELECT_CLASS} />
               <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>
                     Cancelar
                  </Button>
                  <Button onClick={handleEdit} disabled={loading || !formData.contacto.trim()}>
                     {loading ? "Guardando…" : "Guardar cambios"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Delete Dialog */}
         <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setSelectedContact(null); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Eliminar Contacto</DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de que deseas eliminar este contacto (
                     <strong>{selectedContact?.contacto}</strong>)? Esta acción no se puede deshacer.
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={loading}>
                     Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                     {loading ? "Eliminando…" : "Eliminar"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: "TELEFONO" | "EMAIL" }) {
   if (tipo === "EMAIL") {
      return (
         <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
            <Mail className="size-3" />
            Email
         </span>
      );
   }
   return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
         <Phone className="size-3" />
         Teléfono
      </span>
   );
}

function ContactoLink({ contact }: { contact: ContactEmployee }) {
   if (contact.tipo_contacto === "EMAIL") {
      return (
         <a
            href={`mailto:${contact.contacto}`}
            className="flex items-center gap-1.5 text-brand-blue hover:underline text-sm"
         >
            {contact.contacto}
         </a>
      );
   }
   return (
      <a
         href={`tel:${contact.contacto}`}
         className="flex items-center gap-1.5 text-brand-blue hover:underline text-sm"
      >
         {contact.contacto}
      </a>
   );
}

function ContactoMenu({
   contact,
   onEdit,
   onDelete,
}: {
   contact: ContactEmployee;
   onEdit: () => void;
   onDelete: () => void;
}) {
   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
               <MoreHorizontal className="size-4" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
               <Pencil className="size-4 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
               <Trash2 className="size-4 mr-2" /> Eliminar
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}

function ContactFormFields({
   form,
   onChange,
   selectClass,
}: {
   form: { tipo_contacto: "TELEFONO" | "EMAIL"; contacto: string };
   onChange: (v: typeof form) => void;
   selectClass: string;
}) {
   return (
      <div className="flex flex-col gap-3 py-2">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-tipo">Tipo *</Label>
            <select
               id="cf-tipo"
               value={form.tipo_contacto}
               onChange={(e) =>
                  onChange({ ...form, tipo_contacto: e.target.value as "TELEFONO" | "EMAIL", contacto: "" })
               }
               className={selectClass}
            >
               <option value="TELEFONO">Teléfono</option>
               <option value="EMAIL">Email</option>
            </select>
         </div>
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-contacto">
               {form.tipo_contacto === "EMAIL" ? "Dirección de email *" : "Número de teléfono *"}
            </Label>
            <Input
               id="cf-contacto"
               type={form.tipo_contacto === "EMAIL" ? "email" : "tel"}
               value={form.contacto}
               onChange={(e) => onChange({ ...form, contacto: e.target.value })}
               placeholder={
                  form.tipo_contacto === "EMAIL"
                     ? "ejemplo@correo.com"
                     : "+1 (809) 000-0000"
               }
            />
         </div>
      </div>
   );
}
