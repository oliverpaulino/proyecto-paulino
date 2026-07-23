"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Item } from "@/dtos/item.dto";
import { PermissionGuard } from "@/components/permission-guard";

interface ItemTableProps {
   items: Item[];
   onEdit: (item: Item) => void;
   onDelete: (item: Item) => void;
}

export function ItemTable({ items, onEdit, onDelete }: ItemTableProps) {
   const router = useRouter();

   if (items.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">📦</span>
            <span>No hay items que mostrar.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Unidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {items.map((item) => {
                  const sinStock = Number(item.stock) <= 0;
                  return (
                     <tr
                        key={item.id}
                        className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                     >
                        <td className="px-4 py-3">
                           <div className="font-semibold text-brand-blue dark:text-white">{item.nombre}</div>
                           <div className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString("es-DO")}
                           </div>
                        </td>
                        <td className="px-4 py-3">
                           <span className="inline-flex items-center rounded-full border border-brand-blue/30 bg-brand-blue/10 px-2.5 py-0.5 text-xs font-semibold text-brand-blue dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              {item.tipo_nombre ?? "—"}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                           <span
                              className={`inline-block rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${
                                 sinStock
                                    ? "bg-brand-red/15 text-brand-red"
                                    : "bg-brand-yellow/25 text-brand-black dark:text-brand-yellow"
                              }`}
                           >
                              {Number(item.stock).toLocaleString("es-DO", { maximumFractionDigits: 2 })}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                           {item.unidad ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                           {item.descripcion ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                              <PermissionGuard resource="material_request" action="update">
                              <button
                                 onClick={() => onEdit(item)}
                                 className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                                 title="Editar"
                              >
                                 <Pencil className="size-4" />
                              </button>
                              </PermissionGuard>
                              <PermissionGuard resource="material_request" action="delete">
                              <button
                                 onClick={() => onDelete(item)}
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
                                       onClick={() => router.push(`/dashboard/inventario/${item.id}`)}
                                    >
                                       <Eye className="w-4 h-4 mr-2" />
                                       Ver en detalle
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
