"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Trash2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PurchaseOrder } from "@/dtos/purchase-order.dto";
import Link from "next/link";
import { PermissionGuard } from "@/components/permission-guard";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { usePagoStore } from "@/stores/usePagoStore";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import { PagoForm } from "@/app/dashboard/pagos/components/pago-form";

interface PurchaseOrderTableProps {
   orders: PurchaseOrder[];
   onEdit: (order: PurchaseOrder) => void;
   onDelete: (order: PurchaseOrder) => void;
}

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

const ESTADO_PAGO_BADGE: Record<string, string> = {
   PENDIENTE:
      "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
   PARCIAL:
      "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
   PAGADO:
      "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
};

const ESTADO_PAGO_LABEL: Record<string, string> = {
   PENDIENTE: "Sin pagos",
   PARCIAL: "Pago parcial",
   PAGADO: "Pagada",
};

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

export function PurchaseOrderTable({
   orders,
   onEdit,

   onDelete,
}: PurchaseOrderTableProps) {
   const router = useRouter();
   const { CreatePago } = usePagoStore();
   const { GetPurchaseOrders } = usePurchaseOrderStore();

   const [payOrder, setPayOrder] = useState<PurchaseOrder | null>(null);
   const [payLoading, setPayLoading] = useState(false);

   async function handlePay(data: any) {
      setPayLoading(true);
      try {
         const result = await CreatePago(data);
         if (result instanceof Error) throw result;
         setPayOrder(null);
         await GetPurchaseOrders({ force: true });
      } finally {
         setPayLoading(false);
      }
   }

   if (orders.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">🛒</span>
            <span>No hay órdenes de compra que mostrar.</span>
         </div>
      );
   }

   return (
      <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                     Nº / Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                     Proveedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                     Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
                     Pago
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">
                     Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">
                     Acciones
                  </th>
               </tr>
            </thead>
            <tbody>
               {orders.map((order) => (
                  <tr
                     key={order.codigoReferencia}
                     className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                  >
                     <td className="px-4 py-3">
                        <Link href={`/dashboard/compras/${order.id}`} className="hover:underline">
                           <span className="inline-block rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                              {order.codigoReferencia}
                           </span>
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                           {new Date(order.fecha).toLocaleDateString("es-DO")}
                        </div>
                     </td>
                     <td className="px-4 py-3">
                        <div className="font-semibold text-brand-blue dark:text-white">
                           {order.proveedor_nombre ?? order.proveedor_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                           {new Date(order.created_at).toLocaleDateString("es-DO")}
                        </div>
                     </td>
                     <td className="px-4 py-3">
                        <span
                           title="Estado logístico"
                           className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[order.estado] ?? ""}`}
                        >
                           {ESTADO_LABEL[order.estado] ?? order.estado}
                        </span>
                     </td>
                     <td className="px-4 py-3">
                        <span
                           title="Estado financiero"
                           className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_PAGO_BADGE[order.estado_pago] ?? ""}`}
                        >
                           {ESTADO_PAGO_LABEL[order.estado_pago] ?? order.estado_pago}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-right font-semibold text-brand-blue dark:text-white">
                        {formatMoney(order.total)}
                     </td>
                     <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <PermissionGuard resource="material_request" action="update">
                           <button
                              onClick={() => onEdit(order)}
                              className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                              title="Editar"
                           >
                              <Pencil className="size-4" />
                           </button>
                           </PermissionGuard>
                           <PermissionGuard resource="material_request" action="delete">
                           <button
                              onClick={() => onDelete(order)}
                              className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                              title="Eliminar"
                           >
                              <Trash2 className="size-4" />
                           </button>
                           </PermissionGuard>

                           <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                 align="end"
                                 className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                              >
                                 <DropdownMenuItem
                                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => router.push(
                                       `/dashboard/compras/${order.id}`
                                    )}
                                 >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver en detalle
                                 </DropdownMenuItem>
                                 {["APROBADA", "RECIBIDA"].includes(order.estado) && (
                                 <DropdownMenuItem
                                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => setPayOrder(order)}
                                 >
                                    <Wallet className="w-4 h-4 mr-2" />
                                    Realizar pago
                                 </DropdownMenuItem>
                                 )}
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                     </td>
                  </tr>
               ))}
               </tbody>
            </table>
         </div>

         <Dialog open={!!payOrder} onOpenChange={(open) => { if (!open) setPayOrder(null); }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Realizar Pago a la Orden</DialogTitle>
                  {payOrder && (
                     <DialogDescription>
                        {payOrder.codigoReferencia} — Total: <strong>{formatMoney(payOrder.total)}</strong>
                     </DialogDescription>
                  )}
               </DialogHeader>
               {payOrder && (
                  <PagoForm
                     predefinedValues={{ orden_compra_id: payOrder.id }}
                     predefinedOrdenCompraLabel={payOrder.codigoReferencia}
                     onSubmit={handlePay}
                     onCancel={() => setPayOrder(null)}
                     loading={payLoading}
                  />
               )}
            </DialogContent>
         </Dialog>
      </>
   );
}
