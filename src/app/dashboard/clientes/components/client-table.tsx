"use client";

import { ClientProps } from "@/backend/modules/clients/domain/clients.domain";
import { Pencil, Trash2 } from "lucide-react";

interface ClientTableProps {
   clients: ClientProps[];
   onEdit: (client: ClientProps) => void;
   onDelete: (client: ClientProps) => void;
}

const TIPO_BADGE: Record<string, string> = {
   fisica:
      "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
   juridica:
      "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   gubernamental:
      "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
};

const TIPO_LABEL: Record<string, string> = {
   fisica: "Física",
   juridica: "Jurídica",
   gubernamental: "Gubernamental",
};

export function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
   if (clients.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">👥</span>
            <span>No hay clientes que mostrar.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Identificación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Dirección</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {clients.map((client, index) => (
                  <tr
                     key={client.id}
                     className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                  >
                     <td className="px-4 py-3">
                        <span className="inline-block rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                           c-{index + 1}
                        </span>
                     </td>
                     <td className="px-4 py-3">
                        <div className="font-semibold text-brand-blue dark:text-white">{client.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                           {new Date(client.created_at).toLocaleDateString("es-DO")}
                        </div>
                     </td>
                     <td className="px-4 py-3">
                        <div className="text-xs text-muted-foreground">{client.tipo_identificacion}</div>
                        <div className="font-medium">{client.identificacion}</div>
                     </td>
                     <td className="px-4 py-3">
                        <span
                           className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_BADGE[client.tipo_cliente] ?? ""}`}
                        >
                           {TIPO_LABEL[client.tipo_cliente] ?? client.tipo_cliente}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-muted-foreground">
                        {client.email && (
                           <div className="flex items-center gap-1 text-xs">
                              <span className="text-brand-blue/50">✉</span>
                              {client.email}
                           </div>
                        )}
                        {client.telefono && (
                           <div className="flex items-center gap-1 text-xs">
                              <span className="text-brand-blue/50">✆</span>
                              {client.telefono}
                           </div>
                        )}
                        {!client.email && !client.telefono && "—"}
                     </td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">
                        {client.direccion ?? "—"}
                     </td>
                     <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <button
                              onClick={() => onEdit(client)}
                              className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                              title="Editar"
                           >
                              <Pencil className="size-4" />
                           </button>
                           <button
                              onClick={() => onDelete(client)}
                              className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                              title="Eliminar"
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
   );
}
