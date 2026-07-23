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
import { Eye, MoreHorizontal, Pencil, Trash2, Calendar, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { PermissionGuard } from "@/components/permission-guard";

interface AppointmentTableProps {
   appointments: AppointmentUI[];
   onEdit: (appointment: AppointmentUI) => void;
   onDelete: (appointment: AppointmentUI) => void;
}

const ESTADO_BADGE: Record<string, string> = {
   ASIGNADA: "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
   PENDIENTE:  "bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
   REALIZADA:  "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
   CANCELADA:   "bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
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
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Fecha agendada</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Motivo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Asignado a</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {appointments.map((cita) => {
                  const d = new Date(cita.fecha);
                  const isValidDate = !isNaN(d.getTime());
                  const fechaFmt = isValidDate ? d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                  const horaFmt = isValidDate ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

                  return (
                     <tr key={cita.id} className="border-t border-border hover:bg-brand-blue/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                           <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <Calendar className="size-3.5 text-brand-blue dark:text-blue-400" />
                              {fechaFmt}
                           </div>
                           <span className="inline-block mt-1 rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                              {horaFmt}
                           </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                           <div className="font-semibold text-brand-blue dark:text-white">
                              {cita.cliente_nombre || "—"}
                           </div>
                           <div className="text-xs text-muted-foreground">ID: {cita.cliente_id}</div>
                        </td>

                        <td className="px-4 py-3 max-w-[220px]">
                           <p className="truncate text-foreground/90" title={cita.motivo ?? undefined}>{cita.motivo ?? "—"}</p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                           <div className="flex items-center gap-1.5">
                              <User className="size-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">{cita.employee_nombre || "Sin asignar"}</span>
                           </div>
                           <div className="text-xs text-muted-foreground">ID: {cita.employee_id}</div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                           <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_BADGE[cita.estado] ?? ""}`}>
                              {EstadoCita[cita.estado as keyof typeof EstadoCita] ?? cita.estado}
                           </span>
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                           <div className="flex items-center justify-end gap-1">
                              <PermissionGuard resource="appointment" action="update">
                                 <button
                                    onClick={() => onEdit(cita)}
                                    className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                                    title="Editar"
                                 >
                                    <Pencil className="size-4" />
                                 </button>
                              </PermissionGuard>
                              <PermissionGuard resource="appointment" action="delete">
                                 <button
                                    onClick={() => onDelete(cita)}
                                    className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                                    title="Eliminar"
                                 >
                                    <Trash2 className="size-4" />
                                 </button>
                              </PermissionGuard>

                              <DropdownMenu modal={false}>
                                 <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                       <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/citas/${cita.id}`)}>
                                       <Eye className="w-4 h-4 mr-2" /> Ver detalle
                                    </DropdownMenuItem>
                                 </DropdownMenuContent>
                              </DropdownMenu>
                           </div>
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
}