"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ReceiptText, Edit2, Trash2, Pencil } from "lucide-react";
import type { Gasto, UpdateGastoForm } from "@/dtos/gastos.dto";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useGastoStore } from "@/stores/useGastoStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GastoForm } from "./gasto-form";
import { DeleteGastoDialog } from "./delete-gasto-dialog";

export function GastoTable({ gastos }: { gastos: Gasto[] }) {
   const { UpdateGasto, DeleteGasto } = useGastoStore();
   
   const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
   const [deletingGasto, setDeletingGasto] = useState<Gasto | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const handleEdit = async (data: UpdateGastoForm) => {
      if (!editingGasto) return;
      setActionLoading(true);
      try {
         await UpdateGasto(editingGasto.id, data);
         setEditingGasto(null);
      } finally {
         setActionLoading(false);
      }
   };

   const handleDelete = async (reason: string) => {
      if (!deletingGasto) return;
      setActionLoading(true);
      try {
         await DeleteGasto(deletingGasto.id, { deleted_reason: reason });
         setDeletingGasto(null);
      } finally {
         setActionLoading(false);
      }
   };

   if (gastos.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <ReceiptText className="size-10 opacity-30" />
            <span>No se encontraron gastos con los filtros actuales.</span>
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
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Categoría</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                     <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {gastos.map((g) => (
                     <tr key={g.id} className="border-b border-border/50 hover:bg-brand-blue/5 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                           {g.codigoReferencia}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                           {format(new Date(g.fecha), "dd MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-4 py-3 font-medium truncate max-w-[200px]" title={g.concepto}>
                           {g.concepto}
                        </td>
                        <td className="px-4 py-3 text-xs">
                           <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md font-medium">
                              {g.categoria_gasto_nombre}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-blue">
                           ${g.monto_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                              <Link href={`/dashboard/gastos/${g.id}`}>
                                 <button className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" title="Ver detalles">
                                    <Eye className="size-4" />
                                 </button>
                              </Link>
                              <button 
                                 onClick={() => setEditingGasto(g)}
                                 className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" 
                                 title="Editar"
                              >
                                 <Pencil className="size-4" />
                              </button>
                              <button 
                                 onClick={() => setDeletingGasto(g)}
                                 className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors" 
                                 title="Anular"
                              >
                                 <Trash2 className="size-4" />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Dialogs de Acciones */}
         <Dialog open={!!editingGasto} onOpenChange={(open) => !open && setEditingGasto(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Gasto</DialogTitle>
               </DialogHeader>
               {editingGasto && (
                  <GastoForm 
                     initialData={editingGasto} 
                     onSubmit={handleEdit} 
                     onCancel={() => setEditingGasto(null)} 
                     loading={actionLoading} 
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteGastoDialog 
            gasto={deletingGasto} 
            onConfirm={handleDelete} 
            onClose={() => setDeletingGasto(null)} 
            loading={actionLoading} 
         />
      </>
   );
}