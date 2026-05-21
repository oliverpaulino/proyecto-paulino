"use client";

import { ClientProps } from "@/backend/modules/clients/domain/clients.domain";
import { Pencil, Trash2 } from "lucide-react";

interface ClientTableProps {
   clients: ClientProps[];
   onEdit: (client: ClientProps) => void;
   onDelete: (client: ClientProps) => void;
}

const TIPO_LABEL: Record<string, string> = {
   fisica: "Física",
   juridica: "Jurídica",
   gubernamental: "Gubernamental",
};

export function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
   if (clients.length === 0) {
      return (
         <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-12 text-sm text-muted-foreground">
            No hay clientes que mostrar.
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dirección</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {clients.map((client, index) => (
                  <tr
                     key={client.id}
                     className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                     <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        c-{index + 1}
                     </td>
                     <td className="px-4 py-3">
                        <div className="font-medium">{client.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                           Registrado: {new Date(client.created_at).toLocaleDateString("es-DO")}
                        </div>
                     </td>
                     <td className="px-4 py-3 text-muted-foreground">
                        <div className="text-xs text-muted-foreground">{client.tipo_identificacion}</div>
                        <div>{client.identificacion}</div>
                     </td>
                     <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
                           {TIPO_LABEL[client.tipo_cliente] ?? client.tipo_cliente}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-muted-foreground">
                        {client.email && (
                           <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground/60">✉</span>
                              {client.email}
                           </div>
                        )}
                        {client.telefono && (
                           <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground/60">✆</span>
                              {client.telefono}
                           </div>
                        )}
                        {!client.email && !client.telefono && "—"}
                     </td>
                     <td className="px-4 py-3 text-muted-foreground text-xs">
                        {client.direccion ?? "—"}
                     </td>
                     <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <button
                              onClick={() => onEdit(client)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Editar"
                           >
                              <Pencil className="size-4" />
                           </button>
                           <button
                              onClick={() => onDelete(client)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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