"use client";

import { ClientProps } from "@/backend/modules/clients/domain/clients.domain";
import { Button } from "@/components/ui/button";
import { 
   DropdownMenu, 
   DropdownMenuContent, 
   DropdownMenuItem, 
   DropdownMenuTrigger 
} from "@radix-ui/react-dropdown-menu";
import { Contact, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PermissionGuard } from "@/components/permission-guard";

import { TipoIdentificacion } from "@/dtos/schema.dto"; 
import { TipoCliente } from "@/dtos/client.dto";


interface ClientTableProps {
   clients: ClientProps[];
   onEdit: (client: ClientProps) => void;
   onDelete: (client: ClientProps) => void;
}

const TIPO_BADGE: Record<keyof typeof TipoCliente, string> = {
   FISICA:
      "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
   JURIDICA:
      "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   GUBERNAMENTAL:
      "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
};

export function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
   const router = useRouter();

   if (clients.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">👥</span>
            <span>No hay clientes que mostrar.</span>
         </div>
      );
   }

   const formatPhone = (phone: string | null) => {
      if (!phone) return null;
      if (phone.length === 10) return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
      return phone;
   };

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Dirección</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {clients.map((client) => {
                  const tipoCliente = (client.tipo_cliente?.toUpperCase() || "FISICA") as keyof typeof TipoCliente;
                  const tipoIdentificacion = (client.tipo_identificacion?.toUpperCase() || "CEDULA") as keyof typeof TipoIdentificacion;

                  return (
                     <tr
                        key={client.id}
                        className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                     >
                        <td className="px-4 py-3">
                           {/* Usamos el DTO para el Label de la Identificación */}
                           <div className="text-xs text-muted-foreground">
                              {TipoIdentificacion[tipoIdentificacion] ?? tipoIdentificacion}
                           </div>
                           <span className="inline-block rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                              <div className="font-medium">{client.identificacion}</div>
                           </span>
                        </td>
                        <td className="px-4 py-3">
                           <div className="font-semibold text-brand-blue dark:text-white">{client.nombre}</div>
                           <div className="text-xs text-muted-foreground">
                              {new Date(client.created_at).toLocaleDateString("es-DO")}
                           </div>
                        </td>

                        <td className="px-4 py-3">
                           {/* Usamos el DTO para el Label del Cliente y las nuevas clases */}
                           <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_BADGE[tipoCliente] ?? ""}`}
                           >
                              {TipoCliente[tipoCliente] ?? tipoCliente}
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
                                 {formatPhone(client.telefono)}
                              </div>
                           )}
                           {!client.email && !client.telefono && "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                           {client.direccion ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                              <PermissionGuard resource="client" action="update">
                              <button
                                 onClick={() => onEdit({
                                    ...client,
                                    tipo_cliente: tipoCliente,
                                    tipo_identificacion: tipoIdentificacion
                                 })}
                                 className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                                 title="Editar"
                              >
                                 <Pencil className="size-4" />
                              </button>
                              </PermissionGuard>
                              <PermissionGuard resource="client" action="delete">
                              <button
                                 onClick={() => onDelete(client)}
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
                                 <DropdownMenuContent align="end" className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                                    <DropdownMenuItem
                                       className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                                       onClick={() => router.push(`/dashboard/clientes/${client.id}`)}
                                    >
                                       <Eye className="w-4 h-4 mr-2" />
                                       Ver en detalle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                       className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                                       onClick={() => router.push(`/dashboard/clientes/${client.id}/contacts`)}
                                    >
                                       <Contact className="w-4 h-4 mr-2" />
                                       Ver Contactos
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