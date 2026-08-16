"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Wallet, Trash2, Pencil, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Pago, UpdatePagoForm, TipoMovimiento } from "@/dtos/pagos.dto";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePagoStore } from "@/stores/usePagoStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PagoForm } from "./pago-form";
import { DeletePagoDialog } from "./delete-pago-dialog";

export function PagoTable({ pagos }: { pagos: Pago[] }) {
   const { UpdatePago, DeletePago } = usePagoStore();
   
   const [editingPago, setEditingPago] = useState<Pago | null>(null);
   const [deletingPago, setDeletingPago] = useState<Pago | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const handleEdit = async (data: UpdatePagoForm) => {
      if (!editingPago) return;
      setActionLoading(true);
      try {
         await UpdatePago(editingPago.id, data);
         setEditingPago(null);
      } finally {
         setActionLoading(false);
      }
   };

   const handleDelete = async (reason: string) => {
      if (!deletingPago) return;
      setActionLoading(true);
      try {
         await DeletePago(deletingPago.id, { deleted_reason: reason });
         setDeletingPago(null);
      } finally {
         setActionLoading(false);
      }
   };

   if (pagos.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <Wallet className="size-10 opacity-30" />
            <span>No se encontraron pagos con los filtros actuales.</span>
         </div>
      );
   }

   return (
      <>
         <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
               <thead>
                  <tr className="bg-brand-blue">
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Referencia</th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Concepto</th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Tipo</th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Destino Exclusivo</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                     <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {pagos.map((p) => {
                     const isEntrada = p.tipo_movimiento === 'ENTRADA';
                      const destinoNombre = p.gasto_codigo_referencia || p.deduccion_codigo_referencia || p.conduce_numero_referencia || p.proyecto_codigo_referencia || p.orden_compra_codigo_referencia || "N/A";
                     const tipoMovimientoLabel = TipoMovimiento[p.tipo_movimiento as keyof typeof TipoMovimiento] ?? p.tipo_movimiento;
                     
                     return (
                     <tr key={p.id} className="border-b border-border/50 hover:bg-brand-blue/5 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                           {p.codigoReferencia}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                           {format(new Date(p.fecha), "dd MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-4 py-3 font-medium truncate max-w-[150px]" title={p.concepto}>
                           {p.concepto}
                        </td>
                        <td className="px-4 py-3 text-xs">
                           <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium ${isEntrada ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>
                              {isEntrada ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                              {tipoMovimientoLabel}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                           <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md font-medium">
                              {destinoNombre}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-blue">
                           ${p.monto_pagado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                              <Link href={`/dashboard/pagos/${p.id}`}>
                                 <button className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" title="Ver detalles">
                                    <Eye className="size-4" />
                                 </button>
                              </Link>
                              <button 
                                 onClick={() => setEditingPago(p)}
                                 className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" 
                                 title="Editar"
                              >
                                 <Pencil className="size-4" />
                              </button>
                              <button 
                                 onClick={() => setDeletingPago(p)}
                                 className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors" 
                                 title="Anular"
                              >
                                 <Trash2 className="size-4" />
                              </button>
                           </div>
                        </td>
                     </tr>
                  )})}
               </tbody>
            </table>
         </div>

         {/* Dialogs de Acciones */}
         <Dialog open={!!editingPago} onOpenChange={(open) => !open && setEditingPago(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Pago</DialogTitle>
               </DialogHeader>
               {editingPago && (
                  <PagoForm 
                     initialData={editingPago} 
                     onSubmit={handleEdit} 
                     onCancel={() => setEditingPago(null)} 
                     loading={actionLoading} 
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeletePagoDialog 
            pago={deletingPago} 
            onConfirm={handleDelete} 
            onClose={() => setDeletingPago(null)} 
            loading={actionLoading} 
         />
      </>
   );
}