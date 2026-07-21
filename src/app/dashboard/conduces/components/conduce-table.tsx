"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Truck, HardHat } from "lucide-react";
import type { ConduceDTO } from "@/dtos/conduce.dto";

interface Props {
   conduces: ConduceDTO[];
   onDelete?: (id: string) => void;
   deletingId?: string | null;
   /** Oculta la columna de Proyecto cuando ya se está viendo dentro de uno. */
   ocultarProyecto?: boolean;
}

export function ConduceTable({ conduces, onDelete, deletingId, ocultarProyecto }: Props) {
   if (conduces.length === 0) {
      return (
         <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            No hay conduces registrados con los filtros actuales.
         </div>
      );
   }

   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Referencia</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Fecha</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Cliente</th>
                  {!ocultarProyecto && (
                     <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Proyecto</th>
                  )}
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Equipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Detalle</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Cant./Horas</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Cobrable</th>
                  {onDelete && <th className="px-3 py-3" />}
               </tr>
            </thead>
            <tbody>
               {conduces.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                     <td className="px-3 py-3">
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
                     <td className="px-3 py-3 font-medium">{c.numero_referencia}</td>
                     <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(c.fecha).toLocaleDateString("es-DO")}
                     </td>
                     <td className="px-3 py-3">
                        {c.cliente_nombre ?? "—"}
                        {c.cliente_telefono && (
                           <div className="text-xs text-muted-foreground">{c.cliente_telefono}</div>
                        )}
                     </td>
                     {!ocultarProyecto && (
                        <td className="px-3 py-3">
                           {c.proyecto_id ? (
                              <Link href={`/dashboard/proyectos/${c.proyecto_id}`} className="text-blue-600 hover:underline">
                                 {c.proyecto_nombre ?? "Ver proyecto"}
                              </Link>
                           ) : (
                              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                 Sin asignar
                              </Badge>
                           )}
                        </td>
                     )}
                     <td className="px-3 py-3">{c.equipo_nombre ?? "—"}</td>
                     <td className="px-3 py-3 text-xs text-muted-foreground max-w-[220px]">
                        {c.tipo_conduce === "CAMION" ? (
                           <span>
                              {c.categoria_equipo_tarifa_nombre ?? "—"} · {c.procedencia} → {c.destino}
                           </span>
                        ) : (
                           <span>
                              {c.horario_manana_inicio && c.horario_manana_fin
                                 ? `AM ${c.horario_manana_inicio}-${c.horario_manana_fin}`
                                 : "AM —"}
                              {" / "}
                              {c.horario_tarde_inicio && c.horario_tarde_fin
                                 ? `PM ${c.horario_tarde_inicio}-${c.horario_tarde_fin}`
                                 : "PM —"}
                              {c.combustible_pagado_cliente && " · combustible cliente"}
                           </span>
                        )}
                     </td>
                     <td className="px-3 py-3 text-right whitespace-nowrap">
                        {c.tipo_conduce === "CAMION"
                           ? `${c.cantidad} ${c.medida_cobro_nombre ?? ""}`
                           : `${c.total_horas.toFixed(2)} h`}
                     </td>
                     <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                        RD$ {c.subtotal.toLocaleString("es-DO")}
                     </td>
                     <td className="px-3 py-3 text-center">
                        {c.es_cobrable ? (
                           <Badge className="border-0 bg-green-100 text-green-800 text-xs">Sí</Badge>
                        ) : (
                           <Badge className="border-0 bg-gray-100 text-gray-600 text-xs">No</Badge>
                        )}
                     </td>
                     {onDelete && (
                        <td className="px-3 py-3 text-right">
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              disabled={deletingId === c.id}
                              onClick={() => onDelete(c.id)}
                           >
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </td>
                     )}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}