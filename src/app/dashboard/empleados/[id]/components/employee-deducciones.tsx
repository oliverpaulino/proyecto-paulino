"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Deduccion, CreateDeduccionForm, UpdateDeduccionForm } from "@/dtos/deducciones.dto";
import { useDeduccionStore } from "@/stores/useDeduccionStore";
import { DeduccionForm } from "../../../deducciones/components/deduccion-form";
import { DeleteDeduccionDialog } from "../../../deducciones/components/delete-deduccion-dialog";

const formatMoney = (value: number): string =>
   value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface EmployeeDeduccionesProps {
   empleadoId: string;
   empleadoNombre?: string;
}

/** Deducciones de un empleado (usado en su ficha). */
export function EmployeeDeducciones({ empleadoId, empleadoNombre }: EmployeeDeduccionesProps) {
   const { CreateDeduccion, UpdateDeduccion, DeleteDeduccion } = useDeduccionStore();

   const [deducciones, setDeducciones] = useState<Deduccion[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [createOpen, setCreateOpen] = useState(false);
   const [editingDeduccion, setEditingDeduccion] = useState<Deduccion | null>(null);
   const [deletingDeduccion, setDeletingDeduccion] = useState<Deduccion | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const loadDeducciones = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const res = await fetch(`/api/deducciones?empleado_id=${empleadoId}&limit=100`);
         if (!res.ok) throw new Error("Error al cargar las deducciones del empleado");
         const data: Deduccion[] = await res.json();
         setDeducciones(data);
      } catch (e) {
         setError(e instanceof Error ? e.message : "Error al cargar las deducciones del empleado");
      } finally {
         setLoading(false);
      }
   }, [empleadoId]);

   useEffect(() => {
      loadDeducciones();
   }, [loadDeducciones]);

   const handleCreate = async (data: CreateDeduccionForm) => {
      setActionLoading(true);
      try {
         const result = await CreateDeduccion({ ...data, empleado_id: empleadoId });
         if (result instanceof Error) throw result;
         setCreateOpen(false);
         await loadDeducciones();
      } catch (e) {
         setError(e instanceof Error ? e.message : "Error al crear la deducción");
      } finally {
         setActionLoading(false);
      }
   };

   const handleEdit = async (data: UpdateDeduccionForm) => {
      if (!editingDeduccion) return;
      setActionLoading(true);
      try {
         const result = await UpdateDeduccion(editingDeduccion.id, data);
         if (result instanceof Error) throw result;
         setEditingDeduccion(null);
         await loadDeducciones();
      } catch (e) {
         setError(e instanceof Error ? e.message : "Error al actualizar la deducción");
      } finally {
         setActionLoading(false);
      }
   };

   const handleDelete = async (reason: string) => {
      if (!deletingDeduccion) return;
      setActionLoading(true);
      try {
         const result = await DeleteDeduccion(deletingDeduccion.id, { deleted_reason: reason });
         if (result instanceof Error) throw result;
         setDeletingDeduccion(null);
         await loadDeducciones();
      } catch (e) {
         setError(e instanceof Error ? e.message : "Error al anular la deducción");
      } finally {
         setActionLoading(false);
      }
   };

   if (loading && deducciones.length === 0) {
      return (
         <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-brand-blue" />
            Cargando deducciones…
         </div>
      );
   }

   if (error) {
      return (
         <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            {error}
         </div>
      );
   }

   const totalMonto = deducciones.reduce((sum, d) => sum + d.monto_total, 0);
   const totalBalance = deducciones.reduce((sum, d) => sum + (d.balance_pendiente ?? 0), 0);

   return (
      <div className="flex flex-col gap-4">
         <div className="flex items-center justify-between gap-3">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
               <Plus className="size-4 mr-2" />
               Agregar Deducción
            </Button>
         </div>

         {/* Resumen */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MiniStat label="Deducciones" value={String(deducciones.length)} accent="text-brand-blue" />
            <MiniStat label="Monto Total" value={`$${formatMoney(totalMonto)}`} accent="text-brand-blue" />
            <MiniStat label="Balance Pendiente" value={`$${formatMoney(totalBalance)}`} accent="text-amber-600" />
         </div>

         {deducciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-10 text-center">
               <ArrowDownRight className="size-10 opacity-30 text-brand-blue" />
               <p className="text-sm text-muted-foreground">
                  Este empleado no tiene deducciones registradas.
               </p>
               <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/deducciones">Ir a Deducciones</Link>
               </Button>
            </div>
         ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue">
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
         )}

         {/* Dialog de Crear */}
         <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Agregar Deducción</DialogTitle>
               </DialogHeader>
               <DeduccionForm
                  initialData={{ empleado_nombre: empleadoNombre }}
                  predefinedValues={{ empleado_id: empleadoId }}
                  onSubmit={handleCreate}
                  onCancel={() => setCreateOpen(false)}
                  loading={actionLoading}
               />
            </DialogContent>
         </Dialog>

         {/* Dialog de Edición */}
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

         {/* Dialog de Anulación */}
         <DeleteDeduccionDialog
            deduccion={deletingDeduccion}
            onConfirm={handleDelete}
            onClose={() => setDeletingDeduccion(null)}
            loading={actionLoading}
         />
      </div>
   );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
   return (
      <div className="rounded-xl border border-border bg-muted/20 p-4">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
      </div>
   );
}
