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
   Wallet,
   ArrowUpRight,
   ArrowDownRight,
   Link as LinkIcon,
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
import { Pago, UpdatePagoForm, MetodoPago } from "@/dtos/pagos.dto";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePagoStore } from "@/stores/usePagoStore";
import { DeletePagoDialog } from "../../components/delete-pago-dialog";
import { RestorePagoDialog } from "../../components/restore-pago-dialog";
import { PagoForm } from "../../components/pago-form";

export function PagoDetail({ pago, onRefresh }: { pago: Pago; onRefresh: () => void }) {
   const { DeletePago, UpdatePago, RestorePago } = usePagoStore();
   const router = useRouter();

   const [actionLoading, setActionLoading] = useState(false);
   const [showDelete, setShowDelete] = useState(false);
   const [showRestore, setShowRestore] = useState(false);
   const [showEdit, setShowEdit] = useState(false);

   const isDeleted = !!pago.deleted_at;
   const fechaPago = new Date(pago.fecha);
   const isEntrada = pago.tipo_movimiento === 'ENTRADA';
   
   const metodoPagoLabel = MetodoPago[pago.metodo_pago as keyof typeof MetodoPago] ?? pago.metodo_pago;

   const handleDelete = async (reason: string) => {
      setActionLoading(true);
      try {
         await DeletePago(pago.id, { deleted_reason: reason });
         setShowDelete(false);
         onRefresh();
      } finally {
         setActionLoading(false);
      }
   };

   const handleRestore = async () => {
      setActionLoading(true);
      try {
         await RestorePago(pago.id);
         setShowRestore(false);
         onRefresh();
      } finally {
         setActionLoading(false);
      }
   };

   const handleEdit = async (data: UpdatePagoForm) => {
      setActionLoading(true);
      try {
         await UpdatePago(pago.id, data);
         setShowEdit(false);
         onRefresh();
      } finally {
         setActionLoading(false);
      }
   };

   const referencias = [
   {
      label: "Gasto de Empresa",
      value: pago.gasto_codigo_referencia,
   },
   {
      label: "Costo de Cliente",
      value: pago.costo_codigo_referencia,
   },
   {
      label: "Deducción de Empleado",
      value: pago.deduccion_codigo_referencia,
   },
   {
      label: "Proyecto",
      value: pago.proyecto_codigo_referencia,
   },
   {
      label: "Orden de Compra",
      value: pago.orden_compra_codigo_referencia,
   },
   ].filter((item) => item.value);

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
                        Pago: {pago.codigoReferencia}
                     </h1>
                     <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDeleted ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"}`}>
                        {isDeleted ? "Anulado" : "Procesado"}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                     <Clock className="size-4 text-brand-blue" />
                     {format(fechaPago, "EEEE, d 'de' MMMM yyyy", { locale: es })}
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
                     Restaurar Pago
                  </Button>
               )}
            </div>
         </div>

         {/* Banner de Estado Eliminado */}
         {isDeleted && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3 w-full">
               <AlertTriangle className="size-5 text-destructive mt-0.5 shrink-0" />
               <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-destructive">Transacción Anulada</h3>
                  <p className="text-sm text-destructive/80 mt-1 break-words">
                     <span className="font-semibold">Motivo:</span> {pago.deleted_reason || "No especificado"}
                  </p>
                  <p className="text-xs text-destructive/60 mt-1">
                     Anulado el {format(new Date(pago.deleted_at!), "dd/MM/yyyy HH:mm")}
                     {pago.deleted_by && ` (ID: ${pago.deleted_by})`}
                  </p>
               </div>
            </div>
         )}

         {/* ── PESTAÑAS DE INFORMACIÓN ── */}
         <Tabs defaultValue="detalles" className="space-y-4 w-full">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               <TabsTrigger value="detalles" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Detalles del Pago
               </TabsTrigger>
               <TabsTrigger value="clasificacion" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Auditoría
               </TabsTrigger>
            </TabsList>

            {/* ── DETALLES ── */}
            <TabsContent value="detalles" className="space-y-4">
               
               {/* Tarjetas de Métricas Principales */}
               <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className={`rounded-xl p-4 text-white shadow-sm flex items-center justify-between overflow-hidden ${isEntrada ? 'bg-green-600' : 'bg-rose-600'}`}>
                     <div className="min-w-0">
                        <p className="text-xs font-medium text-white/80 uppercase tracking-wider truncate">Monto Transaccionado</p>
                        <p className="text-2xl font-bold mt-1 truncate">${pago.monto_pagado.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                     </div>
                     <Banknote className="size-6 opacity-70 shrink-0 ml-2" />
                  </div>

                  <div className="rounded-xl p-4 bg-brand-yellow text-brand-black shadow-sm flex items-center justify-between overflow-hidden">
                     <div className="min-w-0">
                        <p className="text-xs font-medium text-brand-blue uppercase tracking-wider truncate">Tipo y Método</p>
                        <p className="text-lg font-bold mt-1 truncate flex items-center gap-1.5">
                           {isEntrada ? <ArrowUpRight className="size-5 text-green-700" /> : <ArrowDownRight className="size-5 text-rose-700" />}
                           {metodoPagoLabel}
                        </p>
                     </div>
                     <Wallet className="size-6 opacity-70 text-brand-blue shrink-0 ml-2" />
                  </div>

                  <div className="rounded-xl p-4 bg-brand-black text-white shadow-sm flex items-center justify-between overflow-hidden">
                     <div className="min-w-0">
                        <p className="text-xs font-medium text-brand-yellow uppercase tracking-wider truncate">Estado Actual</p>
                        <p className="text-lg font-bold mt-1 truncate">{isDeleted ? "Reversado" : "Procesado"}</p>
                     </div>
                     <CalendarDays className="size-6 opacity-70 shrink-0 ml-2" />
                  </div>
               </div>

               {/* Información General */}
               <Card className="flex flex-col">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="size-5 text-brand-blue" />
                        Vinculación y Origen
                     </CardTitle>
                     <CardDescription>Entidad financiera asociada a la transacción actual.</CardDescription>
                  </CardHeader>
                   <CardContent>
                     <div className="w-full">
                     {referencias.map(({ label, value }) => (
                        <InfoField
                           key={label}
                           label={label}
                           value={value!}
                        />
                     ))}
                     </div>
                   </CardContent>
               </Card>

               {/* Concepto */}
               <Card className="w-full">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Layers className="size-5 text-brand-blue" />
                        Concepto o Referencia del Pago
                     </CardTitle>
                     <CardDescription>Justificación y notas anexas a la transacción de los fondos.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="w-full min-w-0 rounded-lg border border-border bg-muted/20 p-4 text-sm text-foreground font-medium">
                        <p className="break-words whitespace-pre-wrap">
                           {pago.concepto}
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
                        <CardDescription>Metadatos sobre la creación y modificación en la base de datos.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <InfoField 
                           label="Transacción Registrada el" 
                           value={format(new Date(pago.created_at), "dd/MM/yyyy HH:mm", { locale: es })} 
                        />
                        <InfoField 
                           label="Última modificación el" 
                           value={format(new Date(pago.updated_at), "dd/MM/yyyy HH:mm", { locale: es })} 
                        />
                        {isDeleted && (
                           <InfoField 
                              label="Anulado por ID" 
                              value={pago.deleted_by || "No registrado"} 
                           />
                        )}
                     </CardContent>
                  </Card>
            </TabsContent>
         </Tabs>

         {/* ── DIÁLOGOS DE ACCIONES ── */}
         <DeletePagoDialog 
            pago={showDelete ? pago : null} 
            onConfirm={handleDelete} 
            onClose={() => setShowDelete(false)} 
            loading={actionLoading} 
         />
         
         <RestorePagoDialog 
            pago={showRestore ? pago : null} 
            onConfirm={handleRestore} 
            onClose={() => setShowRestore(false)} 
            loading={actionLoading} 
         />

         <Dialog open={showEdit} onOpenChange={setShowEdit}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Pago</DialogTitle>
               </DialogHeader>
               <PagoForm 
                  initialData={pago} 
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