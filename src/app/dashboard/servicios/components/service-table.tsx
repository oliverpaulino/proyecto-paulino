"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Servicio } from "@/dtos/service.dto";
import { TipoServicio } from "@/dtos/service.dto";
import { PermissionGuard } from "@/components/permission-guard";

interface ServiceTableProps {
   services: Servicio[];
   onEdit: (service: Servicio) => void;
   onDelete: (service: Servicio) => void;
}

const TIPO_BADGE: Record<string, string> = {
   REGADO:
      "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   BOTE:
      "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
   CORTE_Y_BOTE:
      "bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
   NIVELACION:
      "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   COMPACTACION:
      "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
   OTRO:
      "bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-600",
};

const TIPO_LABEL: Record<string, string> = TipoServicio;

const currencyFormatter = new Intl.NumberFormat("es-DO", {
   style: "currency",
   currency: "DOP",
   minimumFractionDigits: 2,
});

export function ServiceTable({ services, onEdit, onDelete }: ServiceTableProps) {
   if (services.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">🛠️</span>
            <span>No hay servicios que mostrar.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Servicio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Precio base</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {services.map((service) => (
                  <tr
                     key={service.id}
                     className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                  >
                     <td className="px-4 py-3">
                        <div className="font-semibold text-brand-blue dark:text-white">{service.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                           {new Date(service.created_at).toLocaleDateString("es-DO")}
                        </div>
                     </td>
                     <td className="px-4 py-3">
                        <span
                           className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_BADGE[service.tipo] ?? ""}`}
                        >
                           {TIPO_LABEL[service.tipo] ?? service.tipo}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {service.descripcion ? service.descripcion : "—"}
                     </td>
                     <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-brand-blue dark:text-brand-yellow">
                        {currencyFormatter.format(Number(service.precio_base))}
                     </td>
                     <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <PermissionGuard resource="service" action="update">
                           <button
                              onClick={() => onEdit(service)}
                              className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                              title="Editar"
                           >
                              <Pencil className="size-4" />
                           </button>
                           </PermissionGuard>
                           <PermissionGuard resource="service" action="delete">
                           <button
                              onClick={() => onDelete(service)}
                              className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                              title="Eliminar"
                           >
                              <Trash2 className="size-4" />
                           </button>
                           </PermissionGuard>
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
