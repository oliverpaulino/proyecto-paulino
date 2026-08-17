"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ArrowDownRight, Trash2, Pencil } from "lucide-react";
import type { Deduccion, UpdateDeduccionForm } from "@/dtos/deducciones.dto";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDeduccionStore } from "@/stores/useDeduccionStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeduccionForm } from "./deduccion-form";
import { DeleteDeduccionDialog } from "./delete-deduccion-dialog";

export function DeduccionTable({ deducciones }: { deducciones: Deduccion[] }) {
   const { UpdateDeduccion, DeleteDeduccion } = useDeduccionStore();
   
   const [editingDeduccion, setEditingDeduccion] = useState<Deduccion | null>(null);
   const [deletingDeduccion, setDeletingDeduccion] = useState<Deduccion | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const handleEdit = async (data: UpdateDeduccionForm) => {
      if (!editingDeduccion) return;
      setActionLoading(true);
      try {
         await UpdateDeduccion(editingDeduccion.id, data);
         setEditingDeduccion(null);
      } finally {
         setActionLoading(false);
      }
   };

   const handleDelete = async (reason: string) => {
      if (!deletingDeduccion) return;
      setActionLoading(true);
      try {
         await DeleteDeduccion(deletingDeduccion.id, { deleted_reason: reason });
         setDeletingDeduccion(null);
      } finally {
         setActionLoading(false);
      }
   };

   if (deducciones.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <ArrowDownRight className="size-10 opacity-30" />
            <span>No se encontraron deducciones con los filtros actuales.</span>
         </div>
      );
   }

   return (
      <>
         <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
               <thead>
                   <tr className="bg-brand-blue">
                      <th className="px-2 py-3 w-10"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Referencia</th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Fecha</th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Concepto</th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-blue-200">Empleado</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Balance</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Monto</th>
                     <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {deducciones.map((d) => (
                      <tr key={d.id} className="border-b border-border/50 hover:bg-brand-blue/5 transition-colors">
                         <td className="px-2 py-3">
                            <Link href={`/dashboard/deducciones/${d.id}`}>
                               <button className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" title="Ver detalle">
                                  <Eye className="size-4" />
                               </button>
                            </Link>
                         </td>
                         <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                           {d.codigoReferencia}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                           {format(new Date(d.fecha), "dd MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-4 py-3 font-medium truncate max-w-[180px]" title={d.concepto}>
                           {d.concepto}
                        </td>
                        <td className="px-4 py-3 text-xs">
                           <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md font-medium">
                              {d.empleado_nombre || "N/A"}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                           {d.balance_pendiente != null ? `$${d.balance_pendiente.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-blue">
                           ${d.monto_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                              <Link href={`/dashboard/deducciones/${d.id}`}>
                                 <button className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" title="Ver detalles">
                                    <Eye className="size-4" />
                                 </button>
                              </Link>
                              <button 
                                 onClick={() => setEditingDeduccion(d)}
                                 className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" 
                                 title="Editar"
                              >
                                 <Pencil className="size-4" />
                              </button>
                              <button 
                                 onClick={() => setDeletingDeduccion(d)}
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
         <Dialog open={!!editingDeduccion} onOpenChange={(open) => !open && setEditingDeduccion(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Deducción</DialogTitle>
               </DialogHeader>
               {editingDeduccion && (
                  <DeduccionForm 
                     initialData={editingDeduccion} 
                     onSubmit={handleEdit} 
                     onCancel={() => setEditingDeduccion(null)} 
                     loading={actionLoading} 
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteDeduccionDialog 
            deduccion={deletingDeduccion} 
            onConfirm={handleDelete} 
            onClose={() => setDeletingDeduccion(null)} 
            loading={actionLoading} 
         />
      </>
   );
}