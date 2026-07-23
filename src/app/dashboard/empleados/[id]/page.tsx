"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import {
   ArrowLeft,
   User,
   Loader2,
   Pencil,
   Trash2,
   Contact,
   ReceiptText,
} from "lucide-react";
import { EmployeeForm, type OperadorFormData } from "../components/employee-form";
import { DeleteEmployeeDialog } from "../components/delete-employee-dialog";
import StatCard from "./components/StatCard";
import { EmployeeConceptsWidget } from "../conceptos/components/concept-employee-widget";
import { PermissionGuard } from "@/components/permission-guard";

const ROL_LABEL: Record<string, string> = {
   OPERADOR: "Operador",
   INGENIERO: "Ingeniero",
   MECANICO: "Mecánico",
   CONTABLE: "Contable",
   MENSAJERO: "Mensajero",
};

const TIPO_ID_LABEL: Record<string, string> = {
   CEDULA: "Cédula",
   RNC: "RNC",
   PASAPORTE: "Pasaporte",
};

export default function EmployeeDetailPage() {
   const params = useParams();
   const router = useRouter();
   const empleadoId = params.id as string;

   const { selectedEmployee, loading, GetEmployeeDetails, UpdateEmployee, DeleteEmployee, UpdateOperator, CreateOperator } =
      useEmployeeStore();

   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [actionLoading, setActionLoading] = useState(false);

   useEffect(() => {
      GetEmployeeDetails(empleadoId);
   }, [empleadoId, GetEmployeeDetails]);

   async function handleEdit(data: Parameters<typeof UpdateEmployee>[1], operadorData?: OperadorFormData) {
      setActionLoading(true);
      try {
         const payload = { ...data, operador: operadorData };
         
         const result = await UpdateEmployee(empleadoId, payload as any);
         if (result instanceof Error) throw result;

         setEditOpen(false);
         GetEmployeeDetails(empleadoId); 
      } finally {
         setActionLoading(false);
      }
   }

   async function handleDelete() {
      setActionLoading(true);
      try {
         const result = await DeleteEmployee(empleadoId);
         if (result instanceof Error) throw result;
         router.push("/dashboard/empleados");
      } finally {
         setActionLoading(false);
      }
   }

   if (loading && !selectedEmployee) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!selectedEmployee) {
      return (
         <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
            <User className="size-12 opacity-30" />
            <p>Empleado no encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/empleados")}>
               <ArrowLeft className="size-4 mr-2" /> Volver
            </Button>
         </div>
      );
   }

   const { empleado, contactos } = selectedEmployee;


   return (
      <PermissionGuard resource="users" action="read" mode="page">
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/empleados")}>
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                        {empleado.nombre}
                     </h1>
                     <span className="rounded-full bg-brand-yellow/20 px-2.5 py-1 text-xs font-semibold text-brand-black dark:text-brand-yellow">
                        {ROL_LABEL[empleado.rol] ?? empleado.rol}
                     </span>
                     <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        empleado.activo
                           ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                           : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                     }`}>
                        {empleado.activo ? "Activo" : "Inactivo"}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                     {TIPO_ID_LABEL[empleado.tipo_identificacion] ?? empleado.tipo_identificacion}: {empleado.identificacion}
                  </p>
                  <p className="text-sm text-muted-foreground">
                     Salario: RD$ {empleado.salario.toLocaleString("es-DO")} / mes
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
               <Button variant="outline" onClick={() => router.push(`/dashboard/empleados/${empleadoId}/contacts`)}>
                  <Contact className="mr-2 size-4" />
                  Contactos
               </Button>
               <PermissionGuard resource="users" action="update">
               <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
               </Button>
               </PermissionGuard>
               <PermissionGuard resource="users" action="delete">
               <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
               </Button>
               </PermissionGuard>
            </div>
         </div>

         {/* Tabs */}
         <Tabs defaultValue="resumen" className="space-y-4">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               <TabsTrigger value="resumen" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Resumen
               </TabsTrigger>
               <TabsTrigger value="conceptos" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Conceptos
               </TabsTrigger>
            </TabsList>

            {/* ── RESUMEN ── */}
            <TabsContent value="resumen" className="space-y-4">
               <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <StatCard
                     label="Salario mensual"
                     value={`RD$ ${empleado.salario.toLocaleString("es-DO")}`}
                     icon={<ReceiptText className="size-4" />}
                     compact
                     bgColor="bg-brand-blue"
                     textColor="text-white"
                     labelColor="text-brand-yellow"
                  />
                  <StatCard
                     label="Contactos registrados"
                     value={contactos.length}
                     icon={<Contact className="size-4" />}
                     bgColor="bg-brand-yellow"
                     textColor="text-brand-black"
                     labelColor="text-brand-blue"
                  />
                  <StatCard
                     label="Última actualización"
                     value={new Date(empleado.updated_at).toLocaleDateString("es-DO")}
                     icon={<User className="size-4" />}
                     compact
                     bgColor="bg-brand-black"
                     textColor="text-white"
                     labelColor="text-brand-yellow"
                  />
               </div>

               <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                     <CardHeader>
                        <CardTitle>Información del empleado</CardTitle>
                        <CardDescription>Datos personales y laborales.</CardDescription>
                     </CardHeader>
                     <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                           <InfoField label="Nombre" value={empleado.nombre} />
                           <InfoField label="Identificación" value={empleado.identificacion} />
                           <InfoField label="Tipo de identificación" value={TIPO_ID_LABEL[empleado.tipo_identificacion] ?? empleado.tipo_identificacion} />
                           <InfoField label="Rol" value={ROL_LABEL[empleado.rol] ?? empleado.rol} />
                           <InfoField label="Salario" value={`RD$ ${empleado.salario.toLocaleString("es-DO")}`} />
                           <InfoField label="Estado" value={empleado.activo ? "Activo" : "Inactivo"} />
                        </div>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle>Actividad</CardTitle>
                        <CardDescription>Fechas del registro.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <InfoField label="Creado" value={new Date(empleado.created_at).toLocaleDateString("es-DO")} />
                        <InfoField label="Actualizado" value={new Date(empleado.updated_at).toLocaleDateString("es-DO")} />
                     </CardContent>
                  </Card>
               </div>

               {/* Contactos preview */}
               <Card>
                  <CardHeader>
                     <div className="flex items-center justify-between">
                        <div>
                           <CardTitle className="flex items-center gap-2">
                              <Contact className="size-5 text-brand-blue" />
                              Contactos
                           </CardTitle>
                           <CardDescription>
                              {contactos.length === 0
                                 ? "No hay contactos registrados."
                                 : `${contactos.length} contacto${contactos.length !== 1 ? "s" : ""} registrado${contactos.length !== 1 ? "s" : ""}`}
                           </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/empleados/${empleadoId}/contacts`)}>
                           Gestionar
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent>
                     {contactos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                           <Contact className="size-8 opacity-30" />
                           <p className="text-sm">Agrega el primer contacto para este empleado.</p>
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
                              {contactos.map((c) => (
                                 <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell>{c.email || "—"}</TableCell>
                                    <TableCell>{c.phone || "—"}</TableCell>
                                    <TableCell>{c.job_title || "—"}</TableCell>
                                 </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>

            {/* ── CONCEPTOS ── */}
            <TabsContent value="conceptos" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle>Conceptos</CardTitle>
                     <CardDescription>Bonos, descuentos, amonestaciones y otros conceptos aplicados al empleado.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid gap-4 md:grid-cols-3">
                        <MiniStat label="Bonos" value="0" />
                        <MiniStat label="Descuentos" value="0" />
                        <MiniStat label="Amonestaciones" value="0" />
                     </div>
                     <EmployeeConceptsWidget employeeId={empleadoId} />
                  </CardContent>
               </Card>
            </TabsContent>
         </Tabs>

         {/* Edit Dialog */}
         <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar empleado</DialogTitle>
                  <DialogDescription>Actualiza los datos de {empleado.nombre}.</DialogDescription>
               </DialogHeader>
               <EmployeeForm
                  initialData={empleado}
                  existingOperador={selectedEmployee?.operador ?? null}
                  onSubmit={handleEdit}
                  onCancel={() => setEditOpen(false)}
                  loading={actionLoading}
                  submitLabel="Guardar cambios"
               />
            </DialogContent>
         </Dialog>

         {/* Delete Dialog */}
         <DeleteEmployeeDialog
            employee={deleteOpen ? empleado : null}
            onConfirm={handleDelete}
            onClose={() => setDeleteOpen(false)}
            loading={actionLoading}
         />
      </div>
      </PermissionGuard>
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
