"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
   AlertTriangle, 
   Banknote, 
   CalendarDays, 
   RotateCcw, 
   Trash2, 
   Edit2, 
   Layers,
   ArrowDownRight,
   Tag,
   Clock,
   ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Deduccion, UpdateDeduccionForm } from "@/dtos/deducciones.dto";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDeduccionStore } from "@/stores/useDeduccionStore";
import { DeleteDeduccionDialog } from "../../components/delete-deduccion-dialog";
import { RestoreDeduccionDialog } from "../../components/restore-deduccion-dialog";
import { DeduccionForm } from "../../components/deduccion-form";

export function DeduccionDetail({ deduccion, onRefresh }: { deduccion: Deduccion; onRefresh: () => void }) {
   const { DeleteDeduccion, UpdateDeduccion, RestoreDeduccion } = useDeduccionStore();
   const router = useRouter();

   const [actionLoading, setActionLoading] = useState(false);
   const [showDelete, setShowDelete] = useState(false);
   const [showRestore, setShowRestore] = useState(false);
   const [showEdit, setShowEdit] = useState(false);

   const isDeleted = !!deduccion.deleted_at;
   const fechaCita = new Date(deduccion.fecha);

   const handleDelete = async (reason: string) => {
      setActionLoading(true);
      try {
         await DeleteDeduccion(deduccion.id, { deleted_reason: reason });
         setShowDelete(false);
         onRefresh();
      } finally {
         setActionLoading(false);
      }
   };

   const handleRestore = async () => {
      setActionLoading(true);
      try {
         await RestoreDeduccion(deduccion.id);
         setShowRestore(false);
         onRefresh();
      } finally {
         setActionLoading(false);
      }
   };

   const handleEdit = async (data: UpdateDeduccionForm) => {
      setActionLoading(true);
      try {
         await UpdateDeduccion(deduccion.id, data);
         setShowEdit(false);
         onRefresh();
      } finally {
         setActionLoading(false);
      }
   };

   return (
      <div className="flex flex-col gap-6">
         
         {/* ── ENCABEZADO Y CONTROLES ── */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4 min-w-0">
               <Button variant="outline" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white truncate">
                        Deducción: {deduccion.codigoReferencia}
                     </h1>
                     <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDeleted ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"}`}>
                        {isDeleted ? "Anulada" : "Activa"}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                     <Clock className="size-4 text-brand-blue" />
                     {format(fechaCita, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                     Empleado: <span className="font-semibold">{deduccion.empleado_nombre || "No asociado"}</span>
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end shrink-0">
               {!isDeleted ? (
                  <>
                     <Button variant="outline" onClick={() => setShowEdit(true)} disabled={actionLoading}>
                        <Edit2 className="mr-2 size-4" />
                        Editar
                     </Button>
                     <Button variant="destructive" onClick={() => setShowDelete(true)} disabled={actionLoading}>
                        <Trash2 className="mr-2 size-4" />
                        Anular
                     </Button>
                  </>
               ) : (
                  <Button onClick={() => setShowRestore(true)} disabled={actionLoading} className="bg-amber-500 hover:bg-amber-600 text-white">
                     <RotateCcw className="size-4" />
                     Restaurar Deducción
                  </Button>
               )}
            </div>
         </div>

         {/* Banner de Estado Eliminado */}
         {isDeleted && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3 w-full">
               <AlertTriangle className="size-5 text-destructive mt-0.5 shrink-0" />
               <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-destructive">Deducción Anulada</h3>
                  <p className="text-sm text-destructive/80 mt-1 break-words">
                     <span className="font-semibold">Motivo:</span> {deduccion.deleted_reason || "No especificado"}
                  </p>
                  <p className="text-xs text-destructive/60 mt-1">
                     Anulado el {format(new Date(deduccion.deleted_at!), "dd/MM/yyyy HH:mm")}
                     {deduccion.deleted_by && ` (ID: ${deduccion.deleted_by})`}
                  </p>
               </div>
            </div>
         )}

         {/* ── PESTAÑAS DE INFORMACIÓN ── */}
         <Tabs defaultValue="detalles" className="space-y-4 w-full">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               <TabsTrigger value="detalles" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Detalles de la Deducción
               </TabsTrigger>
               <TabsTrigger value="clasificacion" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Auditoría
               </TabsTrigger>
            </TabsList>

            {/* ── DETALLES ── */}
            <TabsContent value="detalles" className="space-y-4">
               
               {/* Tarjetas de Métricas Principales */}
               <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl p-4 bg-brand-blue text-white shadow-sm flex items-center justify-between overflow-hidden">
                     <div className="min-w-0">
                        <p className="text-xs font-medium text-brand-yellow uppercase tracking-wider truncate">Monto Total</p>
                        <p className="text-2xl font-bold mt-1 truncate">${deduccion.monto_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                     </div>
                     <Banknote className="size-6 opacity-70 text-brand-yellow shrink-0 ml-2" />
                  </div>

                  <div className="rounded-xl p-4 bg-brand-yellow text-brand-black shadow-sm flex items-center justify-between overflow-hidden">
                     <div className="min-w-0">
                        <p className="text-xs font-medium text-brand-blue uppercase tracking-wider truncate">Balance Pendiente</p>
                        <p className="text-lg font-bold mt-1 truncate">
                           {deduccion.balance_pendiente != null ? `$${deduccion.balance_pendiente.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "-"}
                        </p>
                     </div>
                     <CalendarDays className="size-6 opacity-70 text-brand-blue shrink-0 ml-2" />
                  </div>

                  <div className="rounded-xl p-4 bg-brand-black text-white shadow-sm flex items-center justify-between overflow-hidden">
                     <div className="min-w-0">
                        <p className="text-xs font-medium text-brand-yellow uppercase tracking-wider truncate">Estado Actual</p>
                        <p className="text-lg font-bold mt-1 truncate">{isDeleted ? "Anulada" : "Activa"}</p>
                     </div>
                     <ArrowDownRight className="size-6 opacity-70 shrink-0 ml-2" />
                  </div>
               </div>

               {/* Información General */}
               <Card className="flex flex-col">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <ArrowDownRight className="size-5 text-brand-blue" />
                        Información del Descuento
                     </CardTitle>
                     <CardDescription>Detalles operativos y de vinculación.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="grid gap-4 sm:grid-cols-2">
                        <InfoField label="Referencia Interna" value={deduccion.codigoReferencia} />
                        <InfoField 
                           label="Empleado Asociado" 
                           value={deduccion.empleado_nombre || "No vinculado"} 
                        />
                        <div className="sm:col-span-2">
                           <InfoField 
                              label="Equipo Asociado" 
                              value={deduccion.equipo_codigo_referencia || "No vinculado a un equipo en específico"} 
                           />
                        </div>
                     </div>
                  </CardContent>
               </Card>

               {/* Concepto */}
               <Card className="w-full">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Layers className="size-5 text-brand-blue" />
                        Concepto de Deducción
                     </CardTitle>
                     <CardDescription>Motivo y justificación detallada del descuento a aplicar.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     {/* min-w-0 y w-full contienen al texto, break-words fuerza el salto vertical */}
                     <div className="w-full min-w-0 rounded-lg border border-border bg-muted/20 p-4 text-sm text-foreground font-medium">
                        <p className="break-words whitespace-pre-wrap">
                           {deduccion.concepto}
                        </p>
                     </div>
                  </CardContent>
               </Card>
            </TabsContent>

            {/* ── CLASIFICACIÓN Y AUDITORÍA ── */}
            <TabsContent value="clasificacion" className="space-y-4">
                  <Card className="w-full">
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Clock className="size-5 text-brand-blue" />
                           Auditoría del Sistema
                        </CardTitle>
                        <CardDescription>Metadatos sobre la creación y modificación.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <InfoField 
                           label="Registrado el" 
                           value={format(new Date(deduccion.created_at), "dd/MM/yyyy HH:mm", { locale: es })} 
                        />
                        <InfoField 
                           label="Última modificación el" 
                           value={format(new Date(deduccion.updated_at), "dd/MM/yyyy HH:mm", { locale: es })} 
                        />
                        {isDeleted && (
                           <InfoField 
                              label="Anulado por ID" 
                              value={deduccion.deleted_by || "No registrado"} 
                           />
                        )}
                     </CardContent>
                  </Card>
            </TabsContent>
         </Tabs>

         {/* ── DIÁLOGOS DE ACCIONES ── */}
         <DeleteDeduccionDialog 
            deduccion={showDelete ? deduccion : null} 
            onConfirm={handleDelete} 
            onClose={() => setShowDelete(false)} 
            loading={actionLoading} 
         />
         
         <RestoreDeduccionDialog 
            deduccion={showRestore ? deduccion : null} 
            onConfirm={handleRestore} 
            onClose={() => setShowRestore(false)} 
            loading={actionLoading} 
         />

         <Dialog open={showEdit} onOpenChange={setShowEdit}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Deducción</DialogTitle>
               </DialogHeader>
               <DeduccionForm 
                  initialData={deduccion} 
                  onSubmit={handleEdit} 
                  onCancel={() => setShowEdit(false)} 
                  loading={actionLoading} 
               />
            </DialogContent>
         </Dialog>
      </div>
   );
}

// Componente auxiliar blindado contra textos ultra largos sin espacios (como un UUID enorme)
function InfoField({ label, value }: { label: string; value: string }) {
   return (
      <div className="w-full min-w-0 rounded-lg border border-border bg-muted/20 p-3">
         <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
         <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
   );
}