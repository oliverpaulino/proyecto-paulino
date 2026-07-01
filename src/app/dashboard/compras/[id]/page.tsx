"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   ArrowLeft,
   Download,
   Loader2,
   Pencil,
   ShoppingCart,
   Trash2,
} from "lucide-react";
import type { PurchaseOrder, EstadoOrdenCompra } from "@/dtos/purchase-order.dto";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import { DeletePurchaseOrderDialog } from "../components/delete-purchase-order-dialog";
import { PurchaseOrderForm } from "../components/purchase-order-form";
import { generatePurchaseOrderPDF } from "./components/purchase-order-pdf";

const ESTADO_BADGE: Record<string, string> = {
   BORRADOR:
      "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-600",
   PENDIENTE:
      "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
   APROBADA:
      "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   RECIBIDA:
      "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   CANCELADA:
      "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
};

const ESTADO_LABEL: Record<string, string> = {
   BORRADOR: "Borrador",
   PENDIENTE: "Pendiente",
   APROBADA: "Aprobada",
   RECIBIDA: "Recibida",
   CANCELADA: "Cancelada",
};

const TRANSITIONS: Record<EstadoOrdenCompra, EstadoOrdenCompra[]> = {
   BORRADOR: ["PENDIENTE", "CANCELADA"],
   PENDIENTE: ["APROBADA", "BORRADOR", "CANCELADA"],
   APROBADA: ["RECIBIDA", "CANCELADA"],
   RECIBIDA: [],
   CANCELADA: [],
};

const TRANSITION_BUTTON_LABEL: Record<EstadoOrdenCompra, string> = {
   BORRADOR: "Pasar a Borrador",
   PENDIENTE: "Enviar a Revisión",
   APROBADA: "Aprobar",
   RECIBIDA: "Marcar como Recibida",
   CANCELADA: "Cancelar",
};

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function formatDate(value: string | Date) {
   return new Date(value).toLocaleDateString("es-DO");
}

interface FormPayload {
   proveedor_id: string;
   fecha: string;
   notas: string;
   items: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
   }>;
}

export default function PurchaseOrderDetailPage() {
   const params = useParams();
   const router = useRouter();
   const orderId = params.id as string;

   const { UpdatePurchaseOrder, ChangeStatus, DeletePurchaseOrder, CheckIsApprover } =
      usePurchaseOrderStore();

   const [order, setOrder] = useState<PurchaseOrder | null>(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);
   const [isApprover, setIsApprover] = useState(false);
   const [approveError, setApproveError] = useState<string | null>(null);

   useEffect(() => {
      let active = true;

      async function load() {
         setLoading(true);
         try {
            const [orderRes] = await Promise.all([
               fetch(`/api/purchase-orders/${orderId}`),
               CheckIsApprover().then((v) => { if (active) setIsApprover(v); }),
            ]);
            if (!orderRes.ok) throw new Error("Not found");
            const data: PurchaseOrder = await orderRes.json();
            if (active) setOrder(data);
         } catch {
            if (active) setOrder(null);
         } finally {
            if (active) setLoading(false);
         }
      }

      load();
      return () => { active = false; };
   }, [orderId, CheckIsApprover]);

   async function refreshOrder() {
      const res = await fetch(`/api/purchase-orders/${orderId}`);
      if (!res.ok) return;
      const data: PurchaseOrder = await res.json();
      setOrder(data);
   }

   async function handleUpdate(values: FormPayload) {
      setActionLoading(true);
      try {
         const result = await UpdatePurchaseOrder(orderId, {
            proveedor_id: values.proveedor_id,
            fecha: new Date(values.fecha),
            notas: values.notas || null,
            items: values.items,
         });
         if (result instanceof Error) throw result;
         await refreshOrder();
         setEditOpen(false);
      } finally {
         setActionLoading(false);
      }
   }

   async function handleStatusChange(nuevoEstado: EstadoOrdenCompra) {
      setActionLoading(true);
      setApproveError(null);
      try {
         const result = await ChangeStatus(orderId, nuevoEstado);
         if (result instanceof Error) {
            if (nuevoEstado === "APROBADA") {
               setApproveError(result.message);
            }
            throw result;
         }
         await refreshOrder();
      } finally {
         setActionLoading(false);
      }
   }

   async function handleDelete() {
      setActionLoading(true);
      try {
         const result = await DeletePurchaseOrder(orderId);
         if (result instanceof Error) throw result;
         router.push("/dashboard/compras");
      } finally {
         setActionLoading(false);
      }
   }

   if (loading) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!order) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <ShoppingCart className="size-12 opacity-30" />
            <p>Orden no encontrada.</p>
            <Button
               variant="outline"
               onClick={() => router.push("/dashboard/compras")}
            >
               <ArrowLeft className="mr-2 size-4" />
               Volver
            </Button>
         </div>
      );
   }

   const nextStates = TRANSITIONS[order.estado] ?? [];
   // Only show the APROBADA transition if current user is an approved signer
   const visibleNextStates = nextStates.filter(
      (s) => s !== "APROBADA" || isApprover
   );

   return (
      <div className="flex flex-col gap-6 p-6">

         {/* Header */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/dashboard/compras")}
               >
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                        Orden {order.codigoReferencia}…
                     </h1>
                     <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_BADGE[order.estado] ?? ""}`}
                     >
                        {ESTADO_LABEL[order.estado] ?? order.estado}
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                     Proveedor:{" "}
                     <strong>{order.proveedor_nombre ?? order.proveedor_id}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                     Fecha: {formatDate(order.fecha)}
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
               {/* PDF download */}
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generatePurchaseOrderPDF(order)}
               >
                  <Download className="mr-2 size-4" />
                  Descargar PDF
               </Button>

               {/* Status transition buttons */}
               {visibleNextStates.map((estado) => (
                  <Button
                     key={estado}
                     variant={estado === "CANCELADA" ? "destructive" : "outline"}
                     onClick={() => handleStatusChange(estado)}
                     disabled={actionLoading}
                     size="sm"
                  >
                     {TRANSITION_BUTTON_LABEL[estado]}
                  </Button>
               ))}

               {/* Hint when APROBADA is hidden */}
               {nextStates.includes("APROBADA") && !isApprover && (
                  <p className="self-center text-xs text-muted-foreground italic">
                     Solo firmantes autorizados pueden aprobar
                  </p>
               )}

               <Button
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                  disabled={
                     order.estado !== "BORRADOR"
                  }
               >
                  <Pencil className="mr-2 size-4" />
                  Editar
               </Button>
               <Button
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
               >
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
               </Button>
            </div>
         </div>

         {approveError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
               {approveError}
            </div>
         )}

         {/* Summary cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoCard className="bg-brand-black" color="text-white" label="Total" value={formatMoney(order.total)} />
            <InfoCard className="bg-brand-red " color="text-white" label="Ítems" value={String(order.items.length)} />
            <InfoCard className="bg-brand-yellow " color="text-brand-black" label="Actualizado" value={formatDate(order.updated_at)} />
         </div>

         {/* Order header info */}
         <Card>
            <CardHeader>
               <CardTitle>Información de la orden</CardTitle>
               <CardDescription>Datos generales de la orden de compra.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="grid gap-4 sm:grid-cols-2">
                  <InfoField label="ID" value={order.codigoReferencia} />
                  <InfoField
                     label="Proveedor"
                     value={order.proveedor_nombre ?? order.proveedor_id}
                  />
                  <InfoField label="Fecha" value={formatDate(order.fecha)} />
                  <InfoField
                     label="Estado"
                     value={ESTADO_LABEL[order.estado] ?? order.estado}
                  />
                  {order.notas && (
                     <InfoField label="Notas" value={order.notas} />
                  )}
                  <InfoField label="Registrado" value={formatDate(order.created_at)} />
                  {order.approved_by_name && (
                     <InfoField
                        label="Aprobado por"
                        value={order.approved_by_name}
                     />
                  )}
                  {order.approved_at && (
                     <InfoField
                        label="Fecha aprobación"
                        value={formatDate(order.approved_at)}
                     />
                  )}
               </div>
            </CardContent>
         </Card>

         {/* Items table */}
         <Card>
            <CardHeader>
               <CardTitle>Ítems</CardTitle>
               <CardDescription>Líneas de la orden de compra.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               {order.items.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                     Sin ítems
                  </div>
               ) : (
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm">
                        <thead>
                           <tr className="bg-muted/40 border-b border-border">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Descripción
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Cantidad
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 P. Unitario
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Subtotal
                              </th>
                           </tr>
                        </thead>
                        <tbody>
                           {order.items.map((item) => (
                              <tr
                                 key={item.id}
                                 className="border-t border-border hover:bg-muted/20"
                              >
                                 <td className="px-4 py-3">{item.descripcion}</td>
                                 <td className="px-4 py-3 text-right">
                                    {item.cantidad}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    {formatMoney(item.precio_unitario)}
                                 </td>
                                 <td className="px-4 py-3 text-right font-semibold">
                                    {formatMoney(item.subtotal)}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                        <tfoot>
                           <tr className="border-t-2 border-brand-blue/20 bg-muted/20">
                              <td
                                 colSpan={3}
                                 className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                              >
                                 Total
                              </td>
                              <td className="px-4 py-3 text-right text-base font-bold text-brand-blue dark:text-white">
                                 {formatMoney(order.total)}
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               )}
            </CardContent>
         </Card>

         {/* Edit dialog */}
         <Dialog
            open={editOpen}
            onOpenChange={(open) => { if (!open) setEditOpen(false); }}
         >
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar orden de compra</DialogTitle>
                  <DialogDescription>
                     Actualiza los datos de la orden.
                  </DialogDescription>
               </DialogHeader>
               <PurchaseOrderForm
                  initialData={order}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditOpen(false)}
                  loading={actionLoading}
                  submitLabel="Guardar cambios"
               />
            </DialogContent>
         </Dialog>

         {/* Delete dialog */}
         <DeletePurchaseOrderDialog
            order={deleteOpen ? order : null}
            onConfirm={handleDelete}
            onClose={() => setDeleteOpen(false)}
            loading={actionLoading}
         />
      </div>
   );
}

function InfoCard({ color, className, label, value }: { color?: string; className?: string; label: string; value: string }) {
   return (
      <div className={`flex items-start gap-3 rounded-xl border border-border p-4 shadow-sm ${className}`}>
         <div className="min-w-0">
            <p className={`text-xs font-medium ${color ? color : 'text-muted-foreground'}`}>{label}</p>
            <p className={`mt-0.5 text-2xl font-bold ${color ? color : 'text-muted-foreground'}`}>{value}</p>
         </div>
      </div>
   );
}

function InfoField({ label, value }: { label: string; value: string }) {
   return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
         </p>
         <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
   );
}
