"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@/dtos/supplier.dto";

interface SupplierTableProps {
   suppliers: Supplier[];
   onEdit: (supplier: Supplier) => void;
   onDelete: (supplier: Supplier) => void;
}

const TIPO_BADGE: Record<string, string> = {
   suplidor:
      "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   SUB_CONTRATISTA:
      "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
};

const TIPO_LABEL: Record<string, string> = {
   suplidor: "Suplidor",
   SUB_CONTRATISTA: "SUB_CONTRATISTA",
};

export function SupplierTable({ suppliers, onEdit, onDelete }: SupplierTableProps) {
   const router = useRouter();

   if (suppliers.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">🏭</span>
            <span>No hay proveedores que mostrar.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">RNC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Dirección</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {suppliers.map((supplier) => (
                  <tr
                     key={supplier.id}
                     className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                  >
                     <td className="px-4 py-3">
                        <span className="inline-block rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                           {supplier.rnc}
                        </span>
                     </td>
                     <td className="px-4 py-3">
                        <div className="font-semibold text-brand-blue dark:text-white">{supplier.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                           {new Date(supplier.created_at).toLocaleDateString("es-DO")}
                        </div>
                     </td>
                     <td className="px-4 py-3">
                        <span
                           className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_BADGE[supplier.tipo] ?? ""}`}
                        >
                           {TIPO_LABEL[supplier.tipo] ?? supplier.tipo}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-muted-foreground">
                        {supplier.email && (
                           <div className="flex items-center gap-1 text-xs">
                              <span className="text-brand-blue/50">✉</span>
                              {supplier.email}
                           </div>
                        )}
                        {supplier.telefono && (
                           <div className="flex items-center gap-1 text-xs">
                              <span className="text-brand-blue/50">✆</span>
                              {supplier.telefono}
                           </div>
                        )}
                        {!supplier.email && !supplier.telefono && "—"}
                     </td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">
                        {supplier.direccion ?? "—"}
                     </td>
                     <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <button
                              onClick={() => onEdit(supplier)}
                              className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                              title="Editar"
                           >
                              <Pencil className="size-4" />
                           </button>
                           <button
                              onClick={() => onDelete(supplier)}
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
                              <DropdownMenuContent align="end" className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                                 <DropdownMenuItem
                                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => router.push(`/dashboard/proveedores/${supplier.id}`)}
                                 >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver en detalle
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
