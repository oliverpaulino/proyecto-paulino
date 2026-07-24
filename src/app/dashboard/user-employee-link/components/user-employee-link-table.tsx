"use client";

import { Trash2 } from "lucide-react";
import type { UserEmployeeLink } from "@/dtos/user-employee-link.dto";
import type { Employee } from "@/dtos/employee.dto";

interface UserRecord {
   id: string;
   name: string;
   email: string;
}

interface UserEmployeeLinkTableProps {
   links: UserEmployeeLink[];
   users: UserRecord[];
   employees: Employee[];
   onDelete: (link: UserEmployeeLink) => void;
   hideUserColumn?: boolean;
}

export function UserEmployeeLinkTable({
   links,
   users,
   employees,
   onDelete,
   hideUserColumn,
}: UserEmployeeLinkTableProps) {
   if (links.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-12 text-sm text-muted-foreground gap-2">
            <span>No hay vínculos que mostrar.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-muted/50">
                  {!hideUserColumn && (
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Usuario</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empleado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha Vínculo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {links.map((link) => {
                  const user = users.find((u) => u.id === link.user_id);
                  const emp = employees.find((e) => e.id === link.empleado_id);

                  return (
                     <tr key={link.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors last:border-b-0">
                        {!hideUserColumn && (
                           <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{user?.name || "Desconocido"}</div>
                              <div className="text-xs text-muted-foreground">{user?.email || link.user_id}</div>
                           </td>
                        )}
                        <td className="px-4 py-3">
                           <div className="font-medium text-foreground">{emp?.nombre || "Desconocido"}</div>
                           <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground font-mono">{link.empleado_id.slice(0, 8)}...</span>
                              {emp?.rol && (
                                 <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm uppercase font-semibold">
                                    {emp.rol}
                                 </span>
                              )}
                           </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                           {new Date(link.created_at).toLocaleDateString("es-DO")}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <button
                              onClick={() => onDelete(link)}
                              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                              title="Eliminar vínculo"
                           >
                              <Trash2 className="size-4" />
                           </button>
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
}