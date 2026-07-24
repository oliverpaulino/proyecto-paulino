"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ReceiptText, Edit2, Trash2, Pencil } from "lucide-react";
import type { Costo, UpdateCostoForm } from "@/dtos/costos.dto";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCostoStore } from "@/stores/useCostoStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CostoForm } from "./costo-form";
import { DeleteCostoDialog } from "./delete-costo-dialog";

export function CostoTable({ costos }: { costos: Costo[] }) {
   const { UpdateCosto, DeleteCosto } = useCostoStore();
   
   const [editingCosto, setEditingCosto] = useState<Costo | null>(null);
   const [deletingCosto, setDeletingCosto] = useState<Costo | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const handleEdit = async (data: UpdateCostoForm) => {
      if (!editingCosto) return;
      setActionLoading(true);
      try {
         await UpdateCosto(editingCosto.id, data);
         setEditingCosto(null);
      } finally {
         setActionLoading(false);
      }
   };

   const handleDelete = async (reason: string) => {
      if (!deletingCosto) return;
      setActionLoading(true);
      try {
         await DeleteCosto(deletingCosto.id, { deleted_reason: reason });
         setDeletingCosto(null);
      } finally {
         setActionLoading(false);
      }
   };

   if (costos.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <ReceiptText className="size-10 opacity-30" />
            <span>No se encontraron costos con los filtros actuales.</span>
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
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Proyecto</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                     <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {costos.map((c) => (
                     <tr key={c.id} className="border-b border-border/50 hover:bg-brand-blue/5 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                           {c.codigoReferencia}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                           {format(new Date(c.fecha), "dd MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-4 py-3 font-medium truncate max-w-[200px]" title={c.concepto}>
                           {c.concepto}
                        </td>
                        <td className="px-4 py-3 text-xs">
                           <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md font-medium">
                              {c.proyecto_codigo_referencia || "N/A"}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-blue">
                           ${c.monto_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                              <Link href={`/dashboard/costos/${c.id}`}>
                                 <button className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" title="Ver detalles">
                                    <Eye className="size-4" />
                                 </button>
                              </Link>
                              <button 
                                 onClick={() => setEditingCosto(c)}
                                 className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" 
                                 title="Editar"
                              >
                                 <Pencil className="size-4" />
                              </button>
                              <button 
                                 onClick={() => setDeletingCosto(c)}
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
         <Dialog open={!!editingCosto} onOpenChange={(open) => !open && setEditingCosto(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Costo</DialogTitle>
               </DialogHeader>
               {editingCosto && (
                  <CostoForm 
                     initialData={editingCosto} 
                     onSubmit={handleEdit} 
                     onCancel={() => setEditingCosto(null)} 
                     loading={actionLoading} 
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteCostoDialog 
            costo={deletingCosto} 
            onConfirm={handleDelete} 
            onClose={() => setDeletingCosto(null)} 
            loading={actionLoading} 
         />
      </>
   );
}