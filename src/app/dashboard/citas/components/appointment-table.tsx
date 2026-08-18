"use client";

import type { AppointmentUI } from "@/dtos/appointment.dto";
import { EstadoCita } from "@/dtos/appointment.dto";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { PermissionGuard } from "@/components/permission-guard";

interface AppointmentTableProps {
   appointments: AppointmentUI[];
   onEdit: (appointment: AppointmentUI) => void;
   onDelete: (appointment: AppointmentUI) => void;
}

const ESTADO_BADGE: Record<string, string> = {
   ASIGNADA:  "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
   PENDIENTE: "bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
   REALIZADA: "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
   CANCELADA: "bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
};

export function AppointmentTable({ appointments, onEdit, onDelete }: AppointmentTableProps) {
   const router = useRouter();

   if (appointments.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">📅</span>
            <span>No se encontraron citas con los filtros actuales.</span>
         </div>
      );
   }

   return (
      <>
      {/* Desktop: tabla */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-muted/40">
                  <th className="px-2 py-3 w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asignado a</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {appointments.map((cita) => {
                  const d = new Date(cita.fecha);
                  const isValidDate = !isNaN(d.getTime());
                  const fechaFmt = isValidDate ? d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                  const horaFmt = isValidDate ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

                  return (
                      <tr 
                         key={cita.id} 
                         onClick={() => router.push(`/dashboard/citas/${cita.id}`)}
                         className="border-t border-border hover:bg-brand-blue/5 transition-colors cursor-pointer"
                      >
                         <td className="px-2 py-3">
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/citas/${cita.id}`) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Ver detalle">
                               <Eye className="size-4" />
                            </button>
                         </td>

                         <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs text-muted-foreground">{cita.codigoReferencia}</span>
                         </td>

                         <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-xs text-muted-foreground">{fechaFmt}</div>
                            <div className="text-xs text-muted-foreground">{horaFmt}</div>
                         </td>

                         <td className="px-4 py-3 max-w-[200px]">
                            <div className="font-semibold text-foreground truncate">
                               {cita.cliente_nombre || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{cita.cliente_codigo_referencia}</div>
                         </td>

                         <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                               <User className="size-3.5 text-muted-foreground" />
                               <span className="text-xs font-medium">{cita.employee_nombre || "Sin asignar"}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">{cita.employee_codigo_referencia}</div>
                         </td>

                         <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[cita.estado] ?? ""}`}>
                               {EstadoCita[cita.estado as keyof typeof EstadoCita] ?? cita.estado}
                            </span>
                         </td>

                         <td 
                            className="px-4 py-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                         >
                            <div className="flex items-center justify-end gap-1">
                               <PermissionGuard resource="appointment" action="update">
                                  <button
                                     onClick={() => onEdit(cita)}
                                     className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                                     title="Editar"
                                  >
                                     <Pencil className="size-4" />
                                  </button>
                               </PermissionGuard>
                               <PermissionGuard resource="appointment" action="delete">
                                  <button
                                     onClick={() => onDelete(cita)}
                                     className="rounded-md p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                                     title="Eliminar"
                                  >
                                     <Trash2 className="size-4" />
                                  </button>
                               </PermissionGuard>
                            </div>
                         </td>
                      </tr>
                   );
               })}
            </tbody>
         </table>
      </div>

      {/* Mobile: tarjetas apiladas */}
      <div className="md:hidden space-y-3">
         {appointments.map((cita) => {
            const d = new Date(cita.fecha);
            const isValidDate = !isNaN(d.getTime());
            const fechaFmt = isValidDate ? d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
            const horaFmt = isValidDate ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

            return (
               <div
                  key={cita.id}
                  onClick={() => router.push(`/dashboard/citas/${cita.id}`)}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 cursor-pointer"
               >
                  <div className="flex items-start justify-between gap-2">
                     <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{cita.cliente_nombre || "—"}</div>
                        <div className="text-xs text-muted-foreground">{cita.cliente_codigo_referencia}</div>
                     </div>
                     <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           className="size-8 text-muted-foreground hover:text-foreground"
                           onClick={() => router.push(`/dashboard/citas/${cita.id}`)}
                        >
                           <Eye className="h-4 w-4" />
                        </Button>
                        <PermissionGuard resource="appointment" action="update">
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => onEdit(cita)}
                           >
                              <Pencil className="h-4 w-4" />
                           </Button>
                        </PermissionGuard>
                        <PermissionGuard resource="appointment" action="delete">
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => onDelete(cita)}
                           >
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </PermissionGuard>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-border pt-3">
                     <div>
                        <div className="text-xs text-muted-foreground">ID</div>
                        <div className="font-mono text-xs">{cita.codigoReferencia}</div>
                     </div>
                     <div>
                        <div className="text-xs text-muted-foreground">Fecha / Hora</div>
                        <div>{fechaFmt} {horaFmt || "—"}</div>
                     </div>
                     <div className="col-span-1 min-[400px]:col-span-2">
                        <div className="text-xs text-muted-foreground">Asignado a</div>
                        <div className="truncate">{cita.employee_nombre || "Sin asignar"} <span className="text-xs text-muted-foreground">{cita.employee_codigo_referencia}</span></div>
                     </div>
                     <div className="flex items-end">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[cita.estado] ?? ""}`}>
                           {EstadoCita[cita.estado as keyof typeof EstadoCita] ?? cita.estado}
                        </span>
                     </div>
                  </div>
               </div>
            );
         })}
      </div>
      </>
   );
}
