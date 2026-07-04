"use client";

import type { Employee } from "@/dtos/employee.dto";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Contact, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EmployeeTableProps {
   employees: Employee[];
   onEdit: (employee: Employee) => void;
   onDelete: (employee: Employee) => void;
}

const ROL_BADGE: Record<string, string> = {
   OPERADOR:
      "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   INGENIERO:
      "bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
   MECANICO:
      "bg-orange-100 text-orange-900 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
   CONTABLE:
      "bg-green-100 text-green-900 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   MENSAJERO:
      "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
};

const ROL_LABEL: Record<string, string> = {
   OPERADOR: "Operador",
   INGENIERO: "Ingeniero",
   MECANICO: "Mecánico",
   CONTABLE: "Contable",
   MENSAJERO: "Mensajero",
};

export function EmployeeTable({ employees, onEdit, onDelete }: EmployeeTableProps) {
   const router = useRouter();

   if (employees.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">👷</span>
            <span>No hay empleados que mostrar.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Identificación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Empleado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Salario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {employees.map((employee) => (
                  <tr
                     key={employee.id}
                     className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                  >
                     <td className="px-4 py-3">
                        <Link href={`/dashboard/empleados/${employee.id}`} className="" >
                           <div className="text-xs text-muted-foreground">{employee.tipo_identificacion}</div>
                           <span className="inline-block rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                              {employee.identificacion}
                           </span>
                        </Link>
                     </td>
                     <td className="px-4 py-3">
                        <div className="font-semibold text-brand-blue dark:text-white">{employee.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                           {new Date(employee.created_at).toLocaleDateString("es-DO")}
                        </div>
                     </td>
                     <td className="px-4 py-3">
                        <span
                           className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROL_BADGE[employee.rol] ?? ""}`}
                        >
                           {ROL_LABEL[employee.rol] ?? employee.rol}
                        </span>
                     </td>
                     <td className="px-4 py-3 font-medium">
                        RD$ {employee.salario.toLocaleString("es-DO")}
                     </td>
                     <td className="px-4 py-3">
                        <span
                           className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${employee.activo
                              ? "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 border border-gray-300 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                        >
                           {employee.activo ? "Activo" : "Inactivo"}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <button
                              onClick={() => onEdit(employee)}
                              className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                              title="Editar"
                           >
                              <Pencil className="size-4" />
                           </button>
                           <button
                              onClick={() => onDelete(employee)}
                              className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                              title="Eliminar"
                           >
                              <Trash2 className="size-4" />
                           </button>

                           <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                 <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/empleados/${employee.id}`)}
                                 >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver en Detalle
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/empleados/${employee.id}/contacts`)}
                                 >
                                    <Contact className="w-4 h-4 mr-2" />
                                    Ver Contactos
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
