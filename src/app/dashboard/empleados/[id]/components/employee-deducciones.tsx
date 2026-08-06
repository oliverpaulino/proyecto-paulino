"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
   Banknote,
   ChevronDown,
   ChevronRight,
   CircleDollarSign,
   HandCoins,
   Loader2,
   Pencil,
   Plus,
   ReceiptText,
   Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDeduccionStore } from "@/stores/useDeduccionStore";
import type { CreateDeduccionForm, Deduccion, PagarDeduccionForm, UpdateDeduccionForm } from "@/dtos/deducciones.dto";
import { DeduccionForm } from "@/app/dashboard/deducciones/components/deduccion-form";
import { DeleteDeduccionDialog } from "@/app/dashboard/deducciones/components/delete-deduccion-dialog";
import { PagarDeduccionDialog } from "./pagar-deduccion-dialog";
import StatCard from "./StatCard";

interface EmployeeDeduccionesProps {
   empleadoId: string;
   empleadoNombre?: string;
}

const fmtMoney = (value: number) =>
   `RD$ ${value.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

/** Tab de Deducciones dentro de la ficha del empleado. */
export function EmployeeDeducciones({ empleadoId, empleadoNombre }: EmployeeDeduccionesProps) {
   const {
      Deducciones,
      loading,
      GetDeducciones,
      CreateDeduccion,
      UpdateDeduccion,
      DeleteDeduccion,
      PagarDeduccion,
   } = useDeduccionStore();

   const [paying, setPaying] = useState<Deduccion | null>(null);
   const [editing, setEditing] = useState<Deduccion | null>(null);
   const [deleting, setDeleting] = useState<Deduccion | null>(null);
   const [createOpen, setCreateOpen] = useState(false);
   const [actionLoading, setActionLoading] = useState(false);
   const [soloNoPagadas, setSoloNoPagadas] = useState(false);
   const [expandedId, setExpandedId] = useState<string | null>(null);

   const cargar = useCallback(() => {
      GetDeducciones({ empleado_id: empleadoId, limit: 100, force: true });
   }, [empleadoId, GetDeducciones]);

   useEffect(() => {
      cargar();
   }, [cargar]);

   const handleCreate = async (data: CreateDeduccionForm) => {
      setActionLoading(true);
      try {
         const result = await CreateDeduccion({ ...data, empleado_id: empleadoId });
         if (result instanceof Error) throw result;
         toast.success("Deducción creada");
         setCreateOpen(false);
         await cargar();
      } catch (err: any) {
         toast.error(err.message || "Error al crear la deducción");
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
         await cargar();
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
         await cargar();
      } catch (err: any) {
         toast.error(err.message || "Error al anular la deducción");
      } finally {
         setActionLoading(false);
      }
   };

   const handlePay = async (data: PagarDeduccionForm) => {
      if (!paying) return;
      setActionLoading(true);
      try {
         const result = await PagarDeduccion(paying.id, data);
         if (result instanceof Error) throw result;
         toast.success(`Pago registrado para ${paying.codigoReferencia}`);
         setPaying(null);
         await cargar();
      } catch (err: any) {
         toast.error(err.message || "Error al registrar el pago");
      } finally {
         setActionLoading(false);
      }
   };

   const totalPendiente = Deducciones.reduce((acc, d) => acc + (d.monto_pendiente || 0), 0);
   const totalDeducciones = Deducciones.reduce((acc, d) => acc + (d.monto_total || 0), 0);
   const visibles = soloNoPagadas
      ? Deducciones.filter((d) => (d.monto_pendiente || 0) > 0)
      : Deducciones;

   if (loading && Deducciones.length === 0) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (Deducciones.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-center text-sm text-muted-foreground">
            <HandCoins className="size-10 opacity-30" />
            <span>Este empleado no tiene deducciones registradas.</span>
            <span className="text-xs">Puedes crear una deducción desde aquí para este empleado.</span>
            <Button size="sm" className="mt-2" onClick={() => setCreateOpen(true)}>
               <Plus className="mr-2 size-4" />
               Agregar deducción
            </Button>
         </div>
      );
   }

   return (
      <>
         <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
               label="Deuda pendiente"
               value={fmtMoney(totalPendiente)}
               icon={<CircleDollarSign className="size-4" />}
               bgColor="bg-brand-blue"
               textColor="text-white"
               labelColor="text-brand-yellow"
            />
            <StatCard
               label="Total deducciones"
               value={fmtMoney(totalDeducciones)}
               icon={<Banknote className="size-4" />}
               bgColor="bg-brand-yellow"
               textColor="text-brand-black"
               labelColor="text-brand-blue"
            />
            <StatCard
               label="Deducciones"
               value={Deducciones.length}
               icon={<ReceiptText className="size-4" />}
               bgColor="bg-brand-black"
               textColor="text-white"
               labelColor="text-brand-yellow"
            />
         </div>

         <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
               <Plus className="mr-2 size-4" />
               Agregar deducción
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
               <Checkbox
                  checked={soloNoPagadas}
                  onCheckedChange={(value) => setSoloNoPagadas(!!value)}
               />
               Solo no pagadas
            </label>
         </div>

         {visibles.length === 0 ? (
            <div className="mt-2 flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground">
               No hay deducciones pendientes de pago.
            </div>
         ) : (
            <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue">
                        <th className="px-2 py-3" />
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
                     {visibles.map((d) => {
                        const open = expandedId === d.id;
                        return (
                           <Fragment key={d.id}>
                              <tr className="border-b border-border/50 transition-colors hover:bg-brand-blue/5">
                                 <td className="px-2 py-3">
                                    <Button
                                       variant="ghost"
                                       size="icon"
                                       className="size-7 text-muted-foreground hover:bg-brand-blue/10"
                                       onClick={() => setExpandedId(open ? null : d.id)}
                                       title={open ? "Ocultar pagos" : `Ver pagos (${d.pagos.length})`}
                                    >
                                       {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                    </Button>
                                 </td>
                                 <td className="px-4 py-3 font-mono font-medium text-brand-blue">{d.codigoReferencia}</td>
                                 <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                    {format(new Date(d.fecha), "dd MMM yyyy", { locale: es })}
                                 </td>
                                 <td className="max-w-[220px] truncate px-4 py-3 font-medium" title={d.concepto}>
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
                                          disabled={(d.monto_pendiente || 0) <= 0}
                                          onClick={() => setPaying(d)}
                                          title={(d.monto_pendiente || 0) <= 0 ? "Deducción liquidada" : "Registrar pago"}
                                       >
                                          <HandCoins className="mr-1 size-4" />
                                          Pagar
                                       </Button>
                                       <Button variant="ghost" size="icon" onClick={() => setEditing(d)} title="Editar">
                                          <Pencil className="size-4 text-muted-foreground" />
                                       </Button>
                                       <Button variant="ghost" size="icon" onClick={() => setDeleting(d)} title="Anular">
                                          <Trash2 className="size-4 text-red-500" />
                                       </Button>
                                    </div>
                                 </td>
                              </tr>
                              {open && (
                                 <tr className="border-b border-border/50 bg-muted/30">
                                    <td colSpan={9} className="px-4 py-3">
                                       {d.pagos.length === 0 ? (
                                          <p className="text-sm text-muted-foreground">
                                             Sin pagos registrados todavía. Los pagos aparecen aquí cuando una nómina descuenta la cuota o se registra un pago directo.
                                          </p>
                                       ) : (
                                          <table className="w-full text-xs">
                                             <thead>
                                                <tr className="text-left uppercase text-muted-foreground">
                                                   <th className="py-1 pr-4 font-semibold">Fecha</th>
                                                   <th className="py-1 pr-4 font-semibold">Vía</th>
                                                   <th className="py-1 pr-4 font-semibold">Referencia</th>
                                                   <th className="py-1 pr-4 font-semibold">Método</th>
                                                   <th className="py-1 pr-4 text-right font-semibold">Monto</th>
                                                </tr>
                                             </thead>
                                             <tbody>
                                                {d.pagos.map((p) => (
                                                   <tr key={p.id} className="border-t border-border/40">
                                                      <td className="whitespace-nowrap py-1.5 pr-4">
                                                         {format(new Date(p.fecha), "dd MMM yyyy", { locale: es })}
                                                      </td>
                                                      <td className="py-1.5 pr-4">
                                                         <span
                                                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                               p.via === "NOMINA"
                                                                  ? "bg-brand-blue/10 text-brand-blue"
                                                                  : "bg-brand-yellow/25 text-brand-black"
                                                            }`}
                                                         >
                                                            {p.via === "NOMINA" ? "Nómina" : "Pago directo"}
                                                         </span>
                                                      </td>
                                                      <td className="py-1.5 pr-4 text-muted-foreground">{p.referencia ?? "—"}</td>
                                                      <td className="py-1.5 pr-4 text-muted-foreground">{p.metodo_pago ?? "—"}</td>
                                                      <td className="py-1.5 pr-4 text-right font-medium">{fmtMoney(p.monto)}</td>
                                                   </tr>
                                                ))}
                                             </tbody>
                                             <tfoot>
                                                <tr className="border-t border-border/40">
                                                   <td colSpan={4} className="py-1.5 pr-4 text-right font-semibold text-muted-foreground">
                                                      Total pagado
                                                   </td>
                                                   <td className="py-1.5 pr-4 text-right font-semibold text-brand-blue">
                                                      {fmtMoney(d.monto_cobrado)}
                                                   </td>
                                                </tr>
                                             </tfoot>
                                          </table>
                                       )}
                                    </td>
                                 </tr>
                              )}
                           </Fragment>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         )}

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

         <PagarDeduccionDialog
            deduccion={paying}
            onConfirm={handlePay}
            onClose={() => setPaying(null)}
            loading={actionLoading}
         />

         <DeleteDeduccionDialog
            deduccion={deleting}
            onConfirm={handleDelete}
            onClose={() => setDeleting(null)}
            loading={actionLoading}
         />
      </>
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
