"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, ReceiptText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Pago, MetodoPago } from "@/dtos/pagos.dto";
import { usePagoStore } from "@/stores/usePagoStore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PagoForm } from "@/app/dashboard/pagos/components/pago-form";
import { DeletePagoDialog } from "@/app/dashboard/pagos/components/delete-pago-dialog";

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

export function PurchaseOrderPagos({
   orderId,
   codigoReferencia,
   total,
   estado,
   onPaymentsChanged,
}: {
   orderId: string;
   codigoReferencia: string;
   total: number;
   estado: string;
   onPaymentsChanged: () => void;
}) {
   const { CreatePago, DeletePago } = usePagoStore();
   const [pagos, setPagos] = useState<Pago[]>([]);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [createOpen, setCreateOpen] = useState(false);
   const [deletingPago, setDeletingPago] = useState<Pago | null>(null);

   const puedePagarse = ["APROBADA", "RECIBIDA"].includes(estado);

   const loadPagos = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch(`/api/pagos?orden_compra_id=${orderId}&limit=50`);
         if (!res.ok) throw new Error("Error al cargar pagos");
         const items: Pago[] = await res.json();
         setPagos(items);
      } catch (error) {
         console.error(error);
         setPagos([]);
      } finally {
         setLoading(false);
      }
   }, [orderId]);

   useEffect(() => {
      loadPagos();
   }, [loadPagos]);

   const refresh = useCallback(async () => {
      await loadPagos();
      onPaymentsChanged();
   }, [loadPagos, onPaymentsChanged]);

   async function handleCreate(data: any) {
      setActionLoading(true);
      try {
         const result = await CreatePago(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
         await refresh();
      } finally {
         setActionLoading(false);
      }
   }

   async function handleDelete(reason: string) {
      if (!deletingPago) return;
      setActionLoading(true);
      try {
         await DeletePago(deletingPago.id, { deleted_reason: reason });
         setDeletingPago(null);
         await refresh();
      } finally {
         setActionLoading(false);
      }
   }

   const pagado = pagos.reduce((acc, p) => acc + Number(p.monto_pagado), 0);
   const pendiente = Math.max(0, total - pagado);

   return (
      <div className="flex flex-col gap-4">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 flex-1">
               <SummaryChip label="Total de la orden" value={formatMoney(total)} />
               <SummaryChip label="Pagado" value={formatMoney(pagado)} />
               <SummaryChip label="Pendiente" value={formatMoney(pendiente)} />
            </div>
            <Button onClick={() => setCreateOpen(true)} disabled={actionLoading || !puedePagarse}>
               <Plus className="mr-2 size-4" />
               Registrar Pago
            </Button>
         </div>

         {!puedePagarse && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
               No se pueden realizar pagos a esta orden en estado <strong>{estado}</strong>. Solo se permite para órdenes <strong>aprobadas</strong> o <strong>recibidas</strong>.
            </div>
         )}

         <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            {loading ? (
               <div className="flex items-center justify-center p-12">
                  <Loader2 className="size-6 animate-spin text-brand-blue" />
               </div>
            ) : pagos.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-sm text-muted-foreground gap-2">
                  <ReceiptText className="size-10 opacity-30" />
                  <span>Esta orden aún no tiene pagos directos.</span>
               </div>
            ) : (
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Referencia</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Concepto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Método</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Acciones</th>
                     </tr>
                  </thead>
                  <tbody>
                     {pagos.map((p) => {
                        const metodoLabel = MetodoPago[p.metodo_pago as keyof typeof MetodoPago] ?? p.metodo_pago;
                        return (
                           <tr key={p.id} className="border-b border-border/50 hover:bg-brand-blue/5 transition-colors">
                              <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                 {p.codigoReferencia}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                 {format(new Date(p.fecha), "dd MMM yyyy", { locale: es })}
                              </td>
                              <td className="px-4 py-3 font-medium truncate max-w-[200px]" title={p.concepto}>
                                 {p.concepto}
                              </td>
                              <td className="px-4 py-3 text-xs">{metodoLabel}</td>
                              <td className="px-4 py-3 text-right font-semibold text-brand-blue">
                                 ${p.monto_pagado.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <button
                                    onClick={() => setDeletingPago(p)}
                                    className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                                    title="Anular"
                                 >
                                    <Trash2 className="size-4" />
                                 </button>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            )}
         </div>

         <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false); }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Registrar Pago a la Orden</DialogTitle>
                  <DialogDescription>
                     Total de la orden: <strong>{formatMoney(total)}</strong> — pendiente: <strong>{formatMoney(pendiente)}</strong>
                  </DialogDescription>
               </DialogHeader>
               <PagoForm
                  predefinedValues={{ orden_compra_id: orderId }}
                  predefinedOrdenCompraLabel={codigoReferencia}
                  onSubmit={handleCreate}
                  onCancel={() => setCreateOpen(false)}
                  loading={actionLoading}
               />
            </DialogContent>
         </Dialog>

         <DeletePagoDialog
            pago={deletingPago}
            onConfirm={handleDelete}
            onClose={() => setDeletingPago(null)}
            loading={actionLoading}
         />
      </div>
   );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
   return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className="mt-0.5 text-xl font-bold text-brand-blue dark:text-white">{value}</p>
      </div>
   );
}
