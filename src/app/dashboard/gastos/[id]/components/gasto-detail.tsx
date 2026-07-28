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
   Receipt,
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
import type { Gasto, UpdateGastoForm } from "@/dtos/gastos.dto";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useGastoStore } from "@/stores/useGastoStore";
import { DeleteGastoDialog } from "../../components/delete-gasto-dialog";
import { RestoreGastoDialog } from "../../components/restore-gasto-dialog";
import { GastoForm } from "../../components/gasto-form";

export function GastoDetail({ gasto, onRefresh }: { gasto: Gasto; onRefresh: () => void }) {
   const { DeleteGasto, UpdateGasto, RestoreGasto } = useGastoStore();
   const router = useRouter();

   const [actionLoading, setActionLoading] = useState(false);
   const [showDelete, setShowDelete] = useState(false);
   const [showRestore, setShowRestore] = useState(false);
   const [showEdit, setShowEdit] = useState(false);

   const isDeleted = !!gasto.deleted_at;
   const fechaCita = new Date(gasto.fecha);

   const handleDelete = async (reason: string) => {
      setActionLoading(true);
      try {
         await DeleteGasto(gasto.id, { deleted_reason: reason });
         setShowDelete(false);
         onRefresh();
      } finally {
         setActionLoading(false);
      }
   };

   const handleRestore = async () => {
      setActionLoading(true);
      try {
         await RestoreGasto(gasto.id);
         setShowRestore(false);
         onRefresh();
      } finally {
         setActionLoading(false);
      }
   };

   const handleEdit = async (data: UpdateGastoForm) => {
      setActionLoading(true);
      try {
         await UpdateGasto(gasto.id, data);
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
                        Gasto: {gasto.codigoReferencia}
                     </h1>
                     <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDeleted ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"}`}>
                        {isDeleted ? "Anulado" : "Activo"}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                     <Clock className="size-4 text-brand-blue" />
                     {format(fechaCita, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                     Tipo: <span className="font-semibold">{gasto.categoria_gasto_grupo}</span>
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
                     Restaurar Gasto
                  </Button>
               )}
            </div>
         </div>

         {/* Banner de Estado Eliminado */}
         {isDeleted && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3 w-full">
               <AlertTriangle className="size-5 text-destructive mt-0.5 shrink-0" />
               <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-destructive">Gasto Anulado</h3>
                  <p className="text-sm text-destructive/80 mt-1 break-words">
                     <span className="font-semibold">Motivo:</span> {gasto.deleted_reason || "No especificado"}
                  </p>
                  <p className="text-xs text-destructive/60 mt-1">
                     Anulado el {format(new Date(gasto.deleted_at!), "dd/MM/yyyy HH:mm")}
                     {gasto.deleted_by && ` (ID: ${gasto.deleted_by})`}
                  </p>
               </div>
            </div>
         )}

         {/* ── PESTAÑAS DE INFORMACIÓN ── */}
         <Tabs defaultValue="detalles" className="space-y-4 w-full">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               <TabsTrigger value="detalles" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Detalles del Gasto
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
                        <p className="text-2xl font-bold mt-1 truncate">${gasto.monto_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                     </div>
                     <Banknote className="size-6 opacity-70 text-brand-yellow shrink-0 ml-2" />
                  </div>

                  <div className="rounded-xl p-4 bg-brand-yellow text-brand-black shadow-sm flex items-center justify-between overflow-hidden">
                     <div className="min-w-0">
                        <p className="text-xs font-medium text-brand-blue uppercase tracking-wider truncate">Fecha de Gasto</p>
                        <p className="text-lg font-bold mt-1 truncate">{format(fechaCita, "dd 'de' MMM yyyy", { locale: es })}</p>
                     </div>
                     <CalendarDays className="size-6 opacity-70 text-brand-blue shrink-0 ml-2" />
                  </div>

                  <div className="rounded-xl p-4 bg-brand-black text-white shadow-sm flex items-center justify-between overflow-hidden">
                     <div className="min-w-0">
                        <p className="text-xs font-medium text-brand-yellow uppercase tracking-wider truncate">Estado Actual</p>
                        <p className="text-lg font-bold mt-1 truncate">{isDeleted ? "Anulado" : "Activo"}</p>
                     </div>
                     <Receipt className="size-6 opacity-70 shrink-0 ml-2" />
                  </div>
               </div>

               {/* Información General del Comprobante */}
               <Card className="flex flex-col">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Receipt className="size-5 text-brand-blue" />
                        Información del Comprobante
                     </CardTitle>
                     <CardDescription>Detalles fiscales y operativos registrados.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="grid gap-4 sm:grid-cols-2">
                        <InfoField label="Número de Comprobante Fiscal (NCF)" value={gasto.ncf || "──"} />
                        <InfoField label="Referencia Interna" value={gasto.codigoReferencia} />
                     </div>
                  </CardContent>
               </Card>

               {/* Concepto del Gasto */}
               <Card className="w-full">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Layers className="size-5 text-brand-blue" />
                        Concepto del Gasto
                     </CardTitle>
                     <CardDescription>Motivo y justificación detallada del gasto emitido.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     {/* min-w-0 y w-full contienen al texto, break-words fuerza el salto vertical */}
                     <div className="w-full min-w-0 rounded-lg border border-border bg-muted/20 p-4 text-sm text-foreground font-medium">
                        <p className="break-words whitespace-pre-wrap">
                           {gasto.concepto}
                        </p>
                     </div>
                  </CardContent>
               </Card>


               {/* Clasificacion del Gasto */}
               <Card className="w-full">
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Tag className="size-5 text-brand-blue" />
                           Clasificación y Origen
                        </CardTitle>
                        <CardDescription>Vinculación operativa dentro de la empresa.</CardDescription>
                     </CardHeader>
                     <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                           <div className="sm:col-span-2">
                              <InfoField 
                                 label="Categoría de Gasto" 
                                 value={`${gasto.categoria_gasto_nombre}`} 
                              />
                           </div>
                           <InfoField 
                              label="Proyecto" 
                              value={gasto.proyecto_codigo_referencia || "No vinculado proyecto"} 
                           />
                           <InfoField 
                              label="Orden de Compra" 
                              value={gasto.orden_compra_codigo_referencia || "No vinculado a orden de compra"} 
                           />
                           <div className="sm:col-span-2">
                              <InfoField 
                                 label="Equipo" 
                                 value={gasto.equipo_codigo_referencia || "No vinculado a equipo"} 
                              />
                           </div>
                        </div>
                     </CardContent>
                  </Card>
            </TabsContent>

            {/* ── AUDITORÍA ── */}
            <TabsContent value="clasificacion" className="space-y-4">
               {/*<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">*/}
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
                           value={format(new Date(gasto.created_at), "dd/MM/yyyy HH:mm", { locale: es })} 
                        />
                        <InfoField 
                           label="Última modificación el" 
                           value={format(new Date(gasto.updated_at), "dd/MM/yyyy HH:mm", { locale: es })} 
                        />
                        {isDeleted && (
                           <InfoField 
                              label="Anulado por ID" 
                              value={gasto.deleted_by || "No registrado"} 
                           />
                        )}
                     </CardContent>
                  </Card>
             {/*</div>*/}
            </TabsContent>
         </Tabs>

         {/* ── DIÁLOGOS DE ACCIONES ── */}
         <DeleteGastoDialog 
            gasto={showDelete ? gasto : null} 
            onConfirm={handleDelete} 
            onClose={() => setShowDelete(false)} 
            loading={actionLoading} 
         />
         
         <RestoreGastoDialog 
            gasto={showRestore ? gasto : null} 
            onConfirm={handleRestore} 
            onClose={() => setShowRestore(false)} 
            loading={actionLoading} 
         />

         <Dialog open={showEdit} onOpenChange={setShowEdit}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Gasto</DialogTitle>
               </DialogHeader>
               <GastoForm 
                  initialData={gasto} 
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