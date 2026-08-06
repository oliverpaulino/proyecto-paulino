"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { HandCoins, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDeduccionStore } from "@/stores/useDeduccionStore";
import type { Deduccion, PagarDeduccionForm, UpdateDeduccionForm } from "@/dtos/deducciones.dto";
import { DeduccionForm } from "@/app/dashboard/deducciones/components/deduccion-form";
import { DeleteDeduccionDialog } from "@/app/dashboard/deducciones/components/delete-deduccion-dialog";
import { PagarDeduccionDialog } from "./pagar-deduccion-dialog";

interface EmployeeDeduccionesProps {
   empleadoId: string;
}

const fmtMoney = (value: number) =>
   `RD$ ${value.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

/** Tab de Deducciones dentro de la ficha del empleado. */
export function EmployeeDeducciones({ empleadoId }: EmployeeDeduccionesProps) {
   const {
      Deducciones,
      loading,
      GetDeducciones,
      UpdateDeduccion,
      DeleteDeduccion,
      PagarDeduccion,
   } = useDeduccionStore();

   const [paying, setPaying] = useState<Deduccion | null>(null);
   const [editing, setEditing] = useState<Deduccion | null>(null);
   const [deleting, setDeleting] = useState<Deduccion | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const cargar = useCallback(() => {
      GetDeducciones({ empleado_id: empleadoId, limit: 100, force: true });
   }, [empleadoId, GetDeducciones]);

   useEffect(() => {
      cargar();
   }, [cargar]);

   const handlePay = async (data: PagarDeduccionForm) => {
      if (!paying) return;
      setActionLoading(true);
      try {
         const result = await PagarDeduccion(paying.id, data);
         if (result instanceof Error) throw result;
         toast.success(`Pago registrado para ${paying.codigoReferencia}`);
         setPaying(null);
      } catch (err: any) {
         toast.error(err.message || "Error al registrar el pago");
      } finally {
         setActionLoading(false);
      }
   };

   const handleEdit = async (data: UpdateDeduccionForm) => {
      if (!editing) return;
      setActionLoading(true);
      try {
         const result = await UpdateDeduccion(editing.id, data);
         if (result instanceof Error) throw result;
         toast.success("Deducción actualizada");
         setEditing(null);
      } catch (err: any) {
         toast.error(err.message || "Error al actualizar la deducción");
      } finally {
         setActionLoading(false);
      }
   };

   const handleDelete = async (reason: string) => {
      if (!deleting) return;
      setActionLoading(true);
      try {
         const result = await DeleteDeduccion(deleting.id, { deleted_reason: reason });
         if (result instanceof Error) throw result;
         toast.success("Deducción anulada");
         setDeleting(null);
      } catch (err: any) {
         toast.error(err.message || "Error al anular la deducción");
      } finally {
         setActionLoading(false);
      }
   };

   if (loading && Deducciones.length === 0) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (Deducciones.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-center text-sm text-muted-foreground gap-2">
            <HandCoins className="size-10 opacity-30" />
            <span>Este empleado no tiene deducciones registradas.</span>
            <span className="text-xs">Las deducciones se crean desde el módulo de Deducciones.</span>
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
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Cuota</th>
                     <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Cuotas</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Cobrado</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-blue-200">Pendiente</th>
                     <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-blue-200">Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {Deducciones.map((d) => (
                     <tr key={d.id} className="border-b border-border/50 hover:bg-brand-blue/5 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-brand-blue">{d.codigoReferencia}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                           {format(new Date(d.fecha), "dd MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-4 py-3 font-medium truncate max-w-[200px]" title={d.concepto}>
                           {d.concepto}
                        </td>
                        <td className="px-4 py-3 text-right">{fmtMoney(d.monto_cuota)}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                           {d.cuotas_aplicadas} / {d.cuotas_sugeridas}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{fmtMoney(d.monto_cobrado)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-blue">{fmtMoney(d.monto_pendiente)}</td>
                        <td className="px-4 py-3 text-center">
                           <div className="flex items-center justify-center gap-1">
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="text-brand-blue hover:bg-brand-blue/10"
                                 disabled={d.monto_pendiente <= 0}
                                 onClick={() => setPaying(d)}
                                 title={d.monto_pendiente <= 0 ? "Deducción liquidada" : "Registrar pago"}
                              >
                                 <HandCoins className="size-4 mr-1" />
                                 Pagar
                              </Button>
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => setEditing(d)}
                                 title="Editar"
                              >
                                 <Pencil className="size-4 text-muted-foreground" />
                              </Button>
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => setDeleting(d)}
                                 title="Anular"
                              >
                                 <Trash2 className="size-4 text-red-500" />
                              </Button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         <PagarDeduccionDialog
            deduccion={paying}
            onConfirm={handlePay}
            onClose={() => setPaying(null)}
            loading={actionLoading}
         />

         <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Editar Deducción</DialogTitle>
               </DialogHeader>
               {editing && (
                  <DeduccionForm
                     initialData={editing}
                     onSubmit={handleEdit}
                     onCancel={() => setEditing(null)}
                     loading={actionLoading}
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteDeduccionDialog
            deduccion={deleting}
            onConfirm={handleDelete}
            onClose={() => setDeleting(null)}
            loading={actionLoading}
         />
      </>
   );
}
