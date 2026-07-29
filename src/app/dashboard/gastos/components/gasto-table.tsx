"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ReceiptText, Edit2, Trash2, Pencil, FileDown, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { generateGastosReportePDF } from "@/lib/pdf/gastos-reporte-pdf";
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
   const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
   const [generandoPdf, setGenerandoPdf] = useState(false);

   const todosMarcados = gastos.length > 0 && gastos.every((g) => seleccionados.has(g.id));

   function toggle(id: string) {
      setSeleccionados((prev) => {
         const copia = new Set(prev);
         copia.has(id) ? copia.delete(id) : copia.add(id);
         return copia;
      });
   }

   /** Sin selección se exportan los gastos visibles; con selección, solo esos. */
   async function descargarPdf() {
      const elegidos = seleccionados.size > 0 ? gastos.filter((g) => seleccionados.has(g.id)) : gastos;
      if (elegidos.length === 0) return;
      setGenerandoPdf(true);
      try {
         await generateGastosReportePDF(elegidos);
      } finally {
         setGenerandoPdf(false);
      }
   }

   const totalSeleccionado = gastos
      .filter((g) => seleccionados.has(g.id))
      .reduce((a, g) => a + g.monto_total, 0);

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
         <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
               {seleccionados.size > 0
                  ? `${seleccionados.size} seleccionado${seleccionados.size === 1 ? "" : "s"} · $${totalSeleccionado.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "Selecciona gastos para incluirlos en el reporte."}
            </p>
            <div className="flex items-center gap-2">
               {seleccionados.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSeleccionados(new Set())}>
                     Limpiar
                  </Button>
               )}
               <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={generandoPdf}
                  onClick={descargarPdf}
               >
                  {generandoPdf ? (
                     <Loader2 className="size-4 animate-spin" />
                  ) : (
                     <FileDown className="size-4" />
                  )}
                  {seleccionados.size > 0 ? `Reporte (${seleccionados.size})` : "Reporte"}
               </Button>
            </div>
         </div>

         <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
               <thead>
                  <tr className="bg-brand-blue">
                     <th className="w-10 px-4 py-3">
                        <Checkbox
                           aria-label="Seleccionar todos"
                           className="border-blue-200 data-[state=checked]:bg-white data-[state=checked]:text-brand-blue"
                           checked={todosMarcados}
                           onCheckedChange={(v) =>
                              setSeleccionados(v === true ? new Set(gastos.map((g) => g.id)) : new Set())
                           }
                        />
                     </th>
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
                     <tr
                        key={g.id}
                        className={`border-b border-border/50 transition-colors ${
                           seleccionados.has(g.id) ? "bg-brand-blue/5" : "hover:bg-brand-blue/5"
                        }`}
                     >
                        <td className="px-4 py-3">
                           <Checkbox
                              aria-label={`Seleccionar ${g.codigoReferencia}`}
                              checked={seleccionados.has(g.id)}
                              onCheckedChange={() => toggle(g.id)}
                           />
                        </td>
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