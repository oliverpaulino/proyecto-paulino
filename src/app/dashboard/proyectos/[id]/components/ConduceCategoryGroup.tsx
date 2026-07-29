"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
   AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
   Loader2, Truck, HardHat, Eye, Pencil, Trash2,
   ChevronLeft, ChevronRight,
} from "lucide-react";
import type { ConduceDTO } from "@/dtos/conduce.dto";
import { formatMoney } from "./formatMoney";

const CAT_PAGE_SIZE = 20;

export function ConduceCategoryGroup({
   categoria,
   items,
   loadingCategoria,
   resumen,
   selectedIds,
   onSelectIds,
   onToggleCategory,
   onToggleOne,
   toggleLoading,
   onDetail,
   onEdit,
   onDelete,
}: {
   categoria: string;
   items: ConduceDTO[];
   loadingCategoria?: boolean;
   resumen: { subtotal: number; subtotalCobrable: number; count: number };
   selectedIds: Set<string>;
   onSelectIds: (ids: Set<string>) => void;
   onToggleCategory: (categoria: string, checked: boolean) => void;
   onToggleOne: (id: string, esCobrable: boolean) => void;
   toggleLoading: boolean;
   onDetail: (c: ConduceDTO) => void;
   onEdit: (c: ConduceDTO) => void;
   onDelete: (c: ConduceDTO) => void;
}) {
   const [page, setPage] = useState(1);
   const totalPages = Math.ceil(items.length / CAT_PAGE_SIZE);
   const paginatedItems = items.slice((page - 1) * CAT_PAGE_SIZE, page * CAT_PAGE_SIZE);

   const allSelected = items.length > 0 && items.every((c) => selectedIds.has(c.id));
   const someSelected = items.length > 0 && items.some((c) => selectedIds.has(c.id)) && !allSelected;

   return (
      <AccordionItem value={categoria} className="border rounded-lg mb-2 w-full">
         <div className="flex items-center bg-muted/30 w-full ">
            <div className="px-4 py-3 shrink-0">
               <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => onToggleCategory(categoria, checked === true)}
               />
            </div>
            <AccordionTrigger className="flex-1 hover:no-underline [&[data-state=open]]:border-b px-2 py-3 pr-4  hover:bg-black/5 transition-colors">
               <div className="flex items-center gap-3 min-w-0">
                  <span className="font-semibold text-sm truncate">{categoria}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{resumen.count}</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                     {formatMoney(resumen.subtotal)}
                  </span>
                  {resumen.subtotalCobrable < resumen.subtotal && (
                     <span className="text-xs text-green-600 shrink-0">
                        Cobrables: {formatMoney(resumen.subtotalCobrable)}
                     </span>
                  )}
               </div>
            </AccordionTrigger>
         </div>
         <AccordionContent className="px-0 pb-0">
            {loadingCategoria ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Cargando...
               </div>
            ) : items.length === 0 ? (
               <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  Sin conduces en esta categoría.
               </div>
            ) : (
               <>
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm">
                        <thead>
                           <tr className="border-b border-border bg-muted/20">
                              <th className="px-4 py-2 w-10" />
                              <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Referencia</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Fecha</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Equipo</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Operador</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Cant./Horas</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Cobrable</th>
                              <th className="px-4 py-2" />
                           </tr>
                        </thead>
                        <tbody>
                           {paginatedItems.map((c) => (
                              <tr key={c.id} className="border-t border-border hover:bg-muted/10">
                                 <td className="px-4 py-2">
                                    <Checkbox
                                       checked={selectedIds.has(c.id)}
                                       onCheckedChange={() => {
                                          const next = new Set(selectedIds);
                                          if (next.has(c.id)) next.delete(c.id);
                                          else next.add(c.id);
                                          onSelectIds(next);
                                       }}
                                    />
                                 </td>
                                 <td className="px-4 py-2">
                                    {c.tipo_conduce === "CAMION" ? (
                                       <Badge className="border-0 bg-blue-100 text-blue-800 text-xs gap-1">
                                          <Truck className="size-3" /> Camión
                                       </Badge>
                                    ) : (
                                       <Badge className="border-0 bg-orange-100 text-orange-800 text-xs gap-1">
                                          <HardHat className="size-3" /> Equipo
                                       </Badge>
                                    )}
                                 </td>
                                 <td className="px-4 py-2">
                                    <button
                                       type="button"
                                       onClick={() => onDetail(c)}
                                       className="font-medium text-left hover:underline hover:text-blue-600"
                                    >
                                       {c.numero_referencia}
                                    </button>
                                 </td>
                                 <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                                    {new Date(c.fecha).toLocaleDateString("es-DO")}
                                 </td>
                                 <td className="px-4 py-2">{c.equipo_nombre ?? "—"}</td>
                                 <td className="px-4 py-2">{c.operador_nombre ?? "—"}</td>
                                 <td className="px-4 py-2 text-right whitespace-nowrap">
                                    {c.tipo_conduce === "CAMION"
                                       ? `${c.categoria_equipo_tarifa_nombre ?? "S.T."} / ${c.cantidad}`
                                       : `${c.total_horas.toFixed(2)} h`}
                                 </td>
                                 <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">
                                    RD$ {c.subtotal.toLocaleString("es-DO")}
                                 </td>
                                 <td className="px-4 py-2 text-center">
                                    {toggleLoading ? (
                                       <Loader2 className="size-4 animate-spin text-muted-foreground m-auto" />
                                    ) : (
                                       <Switch
                                          size="sm"
                                          className="cursor-pointer"
                                          checked={c.es_cobrable}
                                          disabled={toggleLoading}
                                          onCheckedChange={(checked) => onToggleOne(c.id, checked)}
                                       />
                                    )}
                                 </td>
                                 <td className="px-4 py-2">
                                    <div className="flex items-center justify-end gap-1">
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-muted-foreground hover:text-foreground"
                                          onClick={() => onDetail(c)}
                                       >
                                          <Eye className="h-4 w-4" />
                                       </Button>
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-muted-foreground hover:text-foreground"
                                          onClick={() => onEdit(c)}
                                       >
                                          <Pencil className="h-4 w-4" />
                                       </Button>
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="size-7 text-muted-foreground hover:text-destructive"
                                          onClick={() => onDelete(c)}
                                       >
                                          <Trash2 className="h-4 w-4" />
                                       </Button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {totalPages > 1 && (
                     <div className="flex items-center justify-between border-t border-border bg-muted/10 px-4 py-2">
                        <span className="text-xs text-muted-foreground">
                           Mostrando {(page - 1) * CAT_PAGE_SIZE + 1}–{Math.min(page * CAT_PAGE_SIZE, items.length)} de {items.length}
                        </span>
                        <div className="flex items-center gap-1">
                           <Button
                              variant="outline"
                              size="icon"
                              className="size-7"
                              disabled={page <= 1}
                              onClick={() => setPage((p) => p - 1)}
                           >
                              <ChevronLeft className="size-4" />
                           </Button>
                           {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                                 if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                                 acc.push(p);
                                 return acc;
                              }, [])
                              .map((p, i) =>
                                 p === "..." ? (
                                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                                 ) : (
                                    <Button
                                       key={p}
                                       variant={p === page ? "default" : "outline"}
                                       size="icon"
                                       className="size-7 text-xs"
                                       onClick={() => setPage(p as number)}
                                    >
                                       {p}
                                    </Button>
                                 )
                              )}
                           <Button
                              variant="outline"
                              size="icon"
                              className="size-7"
                              disabled={page >= totalPages}
                              onClick={() => setPage((p) => p + 1)}
                           >
                              <ChevronRight className="size-4" />
                           </Button>
                        </div>
                     </div>
                  )}
               </>)}
         </AccordionContent>
      </AccordionItem>
   );
}
