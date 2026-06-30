"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppointmentStore } from "@/stores/useAppointmentStore"; 
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
import { Textarea } from "@/components/ui/textarea"; // Asegúrate de tener este componente de shadcn
import {
   ArrowLeft,
   Clock,
   Loader2,
   Pencil,
   Trash2,
   User,
   CalendarDays,
   FileText,
   Layers,
} from "lucide-react";
import { AppointmentForm } from "../components/appointment-form"; 

const ESTADO_LABEL: Record<string, string> = {
   EN_REVISION: "En Revisión",
   PENDIENTE: "Pendiente",
   REALIZADA: "Realizada",
   CANCELADA: "Cancelada",
};

const ESTADO_THEME: Record<string, string> = {
   PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
   EN_REVISION: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
   REALIZADA: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
   CANCELADA: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function AppointmentDetailPage() {
   const params = useParams();
   const router = useRouter();
   const citaId = params.id as string;

   const { Appointments, GetAppointments, UpdateAppointment, DeleteAppointment, loading } =
      useAppointmentStore();

   const cita = Appointments.find((a) => a.id === citaId);

   const [editOpen, setEditOpen] = useState(false);
   const [notesOpen, setNotesOpen] = useState(false); // Estado para el modal de notas
   const [notesText, setNotesText] = useState("");     // Estado para el texto del Textarea
   const [actionLoading, setActionLoading] = useState(false);

   useEffect(() => {
      GetAppointments({ limit: 100, force: true });
   }, [citaId, GetAppointments]);

   // Sincroniza el texto del textarea cuando la cita cambia o se abre el modal
   useEffect(() => {
      if (cita) setNotesText(cita.notas || "");
   }, [cita, notesOpen]);

   async function handleEdit(formData: any) {
      setActionLoading(true);
      try {
         await UpdateAppointment(citaId, formData);
         setEditOpen(false);
      } finally {
         setActionLoading(false);
      }
   }

   async function handleSaveNotes() {
      setActionLoading(true);
      try {
         await UpdateAppointment(citaId, { notas: notesText });
         setNotesOpen(false);
      } finally {
         setActionLoading(false);
      }
   }

   async function handleDelete() {
      if (!confirm("¿Estás seguro de que deseas eliminar esta cita de forma permanente?")) return;
      setActionLoading(true);
      try {
         await DeleteAppointment(citaId);
         router.push("/dashboard/citas"); 
      } finally {
         setActionLoading(false);
      }
   }

   if (loading && !cita) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!cita) {
      return (
         <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
            <CalendarDays className="size-12 opacity-30" />
            <p>Cita no encontrada.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/citas")}>
               <ArrowLeft className="size-4 mr-2" /> Volver
            </Button>
         </div>
      );
   }

   const fechaCita = new Date(cita.fecha);

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/citas")}>
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                        Cita: {cita.cliente_nombre || "Sin cliente"}
                     </h1>
                     <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_THEME[cita.estado] ?? "bg-gray-100"}`}>
                        {ESTADO_LABEL[cita.estado] ?? cita.estado}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                     <Clock className="size-4 text-brand-blue" />
                     {fechaCita.toLocaleDateString("es-DO", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} a las {fechaCita.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                     Asignado a: <span className="font-semibold">{cita.employee_nombre || "Sin asignar"}</span>
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
               <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
               </Button>
               <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                  Eliminar
               </Button>
            </div>
         </div>

         {/* Tabs */}
         <Tabs defaultValue="detalles" className="space-y-4">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               <TabsTrigger value="detalles" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Detalles de la Cita
               </TabsTrigger>
               <TabsTrigger value="notas_avanzadas" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Notas Avanzadas
               </TabsTrigger>
            </TabsList>

            {/* ── DETALLES ── */}
            <TabsContent value="detalles" className="space-y-4">
               <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl p-4 bg-brand-blue text-white shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-xs font-medium text-brand-yellow uppercase tracking-wider">Fecha Programada</p>
                        <p className="text-lg font-bold mt-1">{fechaCita.toLocaleDateString("es-DO")}</p>
                     </div>
                     <CalendarDays className="size-5 opacity-70" />
                  </div>

                  <div className="rounded-xl p-4 bg-brand-yellow text-brand-black shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-xs font-medium text-brand-blue uppercase tracking-wider">Hora Estipulada</p>
                        <p className="text-lg font-bold mt-1">{fechaCita.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                     </div>
                     <Clock className="size-5 opacity-70" />
                  </div>

                  <div className="rounded-xl p-4 bg-brand-black text-white shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-xs font-medium text-brand-yellow uppercase tracking-wider">Estado Actual</p>
                        <p className="text-lg font-bold mt-1">{ESTADO_LABEL[cita.estado] ?? cita.estado}</p>
                     </div>
                     <User className="size-5 opacity-70" />
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                     <CardHeader>
                        <CardTitle>Información General</CardTitle>
                        <CardDescription>Detalles operativos de la agenda.</CardDescription>
                     </CardHeader>
                     <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                           <InfoField label="Cliente" value={cita.cliente_nombre || "No especificado"} />
                           <InfoField label="Personal Asignado" value={cita.employee_nombre || "Sin asignar"} />
                           <InfoField label="Estado del Flujo" value={ESTADO_LABEL[cita.estado] ?? cita.estado} />
                           <InfoField label="Última Modificación" value={new Date(cita.updated_at).toLocaleDateString("es-DO")} />
                        </div>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle>Metadatos del Registro</CardTitle>
                        <CardDescription>Auditoría de tiempos del sistema.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <InfoField label="Creado el" value={new Date(cita.created_at).toLocaleDateString("es-DO") + " " + new Date(cita.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} />
                        <InfoField label="Actualizado el" value={new Date(cita.updated_at).toLocaleDateString("es-DO") + " " + new Date(cita.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} />
                     </CardContent>
                  </Card>
               </div>

               {/* Motivo de la cita */}
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Layers className="size-5 text-brand-blue" />
                        Motivo del Cliente
                     </CardTitle>
                     <CardDescription>Servicio o razón principal estipulada para esta cita.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     {cita.motivo ? (
                        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap text-foreground font-medium">
                           {cita.motivo}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                           <Layers className="size-8 opacity-30" />
                           <p className="text-sm">No se especificó un motivo para esta cita.</p>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Notas de la cita */}
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <FileText className="size-5 text-brand-blue" />
                        Observaciones de la evaluación
                     </CardTitle>
                     <CardDescription>Comentarios adicionales provistos del servicio.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     {cita.notas ? (
                        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap text-foreground">
                           {cita.notas}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                           <FileText className="size-8 opacity-30" />
                           <p className="text-sm">No se han registrado anotaciones para esta cita.</p>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>

            {/* ── NOTAS AVANZADAS ── */}
            <TabsContent value="notas_avanzadas" className="space-y-4">
               <Card>
                  <CardHeader>
                     <div className="flex items-center justify-between">
                        <div>
                           <CardTitle className="flex items-center gap-2">
                              <FileText className="size-5 text-brand-blue" />
                              Notas Avanzadas de Seguimiento
                           </CardTitle>
                           <CardDescription>Anotaciones privadas, evolución médica/estética o comentarios internos del personal.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setNotesOpen(true)}>
                           <Pencil className="mr-2 size-3.5" /> Editar Notas
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent>
                     {cita.notas ? (
                        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap text-foreground">
                           {cita.notas}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center text-muted-foreground">
                           <FileText className="size-10 opacity-20" />
                           <div>
                              <p className="text-base font-semibold text-foreground">Sin anotaciones internas</p>
                              <p className="mt-1 text-sm max-w-sm">
                                 No hay notas avanzadas registradas para esta cita. Haz clic en el botón superior para agregar comentarios.
                              </p>
                           </div>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>
         </Tabs>

         {/* Diálogo General de Edición / Reprogramación */}
         <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar Cita</DialogTitle>
               </DialogHeader>
               <AppointmentForm
                  initialData={cita}
                  onSubmit={handleEdit}
                  onCancel={() => setEditOpen(false)}
                  loading={actionLoading}
               />
            </DialogContent>
         </Dialog>

         {/* NUEVO: Diálogo dedicado solo para Editar Notas Avanzadas */}
         <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
            <DialogContent className="sm:max-w-lg">
               <DialogHeader>
                  <DialogTitle>Modificar Notas Avanzadas</DialogTitle>
                  <DialogDescription>
                     Estas anotaciones son privadas y de uso exclusivo para el seguimiento del cliente.
                  </DialogDescription>
               </DialogHeader>
               <div className="py-2">
                  <Textarea
                     value={notesText}
                     onChange={(e) => setNotesText(e.target.value)}
                     placeholder="Escribe la evolución, fórmulas, observaciones del servicio o comentarios de seguimiento aquí..."
                     className="min-h-[180px] text-sm leading-relaxed resize-none"
                  />
               </div>
               <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setNotesOpen(false)} disabled={actionLoading}>
                     Cancelar
                  </Button>
                  <Button onClick={handleSaveNotes} disabled={actionLoading} className="bg-brand-black text-white hover:bg-brand-blue/90">
                     {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                     Guardar cambios
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
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