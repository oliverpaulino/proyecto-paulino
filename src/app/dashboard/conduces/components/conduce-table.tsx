"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Eye, Truck, HardHat } from "lucide-react";
import { useConduceStore } from "@/stores/useConduceStores";
import { ConduceDeleteDialog } from "./conduce-delete-dialog";
import { ConduceEditDialog } from "./conduce-edit-dialog";
import { ConduceDetalleDialog } from "./conduce-detalle-dialog";
import type { ConduceDTO } from "@/dtos/conduce.dto";
import { toast } from "sonner";

interface Props {
   conduces: ConduceDTO[];
   /**
    * Opcional: si tu página ya maneja su propia lógica de eliminación,
    * pásala aquí y se usará en vez de la interna (que llama a
    * DeleteConduce del store directamente). El motivo llega como segundo
    * argumento; si tu handler actual solo recibe el id, no pasa nada, se
    * ignora el extra.
    */
   onDelete?: (id: string, motivo?: string) => void | Promise<void>;
   deletingId?: string | null;
   /** Oculta la columna de Proyecto cuando ya se está viendo dentro de uno. */
   ocultarProyecto?: boolean;
}

export function ConduceTable({ conduces, onDelete, deletingId, ocultarProyecto }: Props) {
   const { DeleteConduce } = useConduceStore();
   const [eliminandoId, setEliminandoId] = useState<string | null>(null);
   const [conduceAEliminar, setConduceAEliminar] = useState<ConduceDTO | null>(null);
   const [conduceAEditar, setConduceAEditar] = useState<ConduceDTO | null>(null);
   const [conduceDetalle, setConduceDetalle] = useState<ConduceDTO | null>(null);

   const idEnProceso = deletingId ?? eliminandoId;

   const handleConfirmarEliminar = async (id: string, motivo?: string) => {
      if (onDelete) {
         await onDelete(id, motivo);
         return;
      }
      // Por defecto, elimina (lógicamente) usando el store directamente —
      // así este diálogo funciona sin que cada página tenga que cablear su
      // propio handler.
      setEliminandoId(id);
      try {
         const resultado = await DeleteConduce(id, motivo);
          if (resultado instanceof Error) {
            toast.error(resultado.message);
         }
      } finally {
         setEliminandoId(null);
      }
   };

   if (conduces.length === 0) {
      return (
         <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            No hay conduces registrados con los filtros actuales.
         </div>
      );
   }

   return (
      <>
      <div className="hidden md:block overflow-x-auto">
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
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Operador</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Detalle</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Cant./Horas</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Cobrable</th>
                  <th className="px-3 py-3" />
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
                     <td className="px-3 py-3">
                        <button
                           type="button"
                           onClick={() => setConduceDetalle(c)}
                           className="font-medium text-left hover:underline hover:text-blue-600"
                        >
                           {c.numero_referencia}
                        </button>
                     </td>
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
                     <td className="px-3 py-3">
                        {c.equipo_nombre ?? "—"}
                        {/*
                           La tarifa no cuelga del equipo sino de su categoría
                           (equipo → categoria_equipo → categoria_equipo_tarifa),
                           así que mostrarla aquí explica de dónde sale el precio
                           cuando el chofer manejó varias categorías.
                        */}
                        {c.categoria_equipo_nombre && (
                           <div className="text-xs text-muted-foreground">
                              {c.categoria_equipo_nombre}
                              {c.categoria_equipo_tarifa_nombre
                                 ? ` · ${c.categoria_equipo_tarifa_nombre}`
                                 : ""}
                           </div>
                        )}
                     </td>
                     <td className="px-3 py-3">{c.operador_nombre ?? "—"}</td>
                     <td className="px-3 py-3 text-xs text-muted-foreground max-w-[220px]">
                        {c.tipo_conduce === "CAMION" ? (
                           <span>
                              {c.categoria_equipo_tarifa_nombre ?? "-"} · {c.procedencia} → {c.destino}
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
                           ? `${c.categoria_equipo_tarifa_nombre ?? "S.T."} / ${c.cantidad}`
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
                     <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setConduceDetalle(c)}
                           >
                              <Eye className="h-4 w-4" />
                           </Button>
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setConduceAEditar(c)}
                           >
                              <Pencil className="h-4 w-4" />
                           </Button>
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              disabled={idEnProceso === c.id}
                              onClick={() => setConduceAEliminar(c)}
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

      {/* Vista móvil: tarjetas apiladas */}
      <div className="md:hidden space-y-3">
         {conduces.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
               <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                     {c.tipo_conduce === "CAMION" ? (
                        <Badge className="border-0 bg-blue-100 text-blue-800 text-xs gap-1 shrink-0">
                           <Truck className="size-3" /> Camión
                        </Badge>
                     ) : (
                        <Badge className="border-0 bg-orange-100 text-orange-800 text-xs gap-1 shrink-0">
                           <HardHat className="size-3" /> Equipo
                        </Badge>
                     )}
                     <button
                        type="button"
                        onClick={() => setConduceDetalle(c)}
                        className="font-medium text-left hover:underline hover:text-blue-600 truncate"
                     >
                        {c.numero_referencia}
                     </button>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setConduceDetalle(c)}
                     >
                        <Eye className="h-4 w-4" />
                     </Button>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setConduceAEditar(c)}
                     >
                        <Pencil className="h-4 w-4" />
                     </Button>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        disabled={idEnProceso === c.id}
                        onClick={() => setConduceAEliminar(c)}
                     >
                        <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                     <div className="text-xs text-muted-foreground">Fecha</div>
                     <div>{new Date(c.fecha).toLocaleDateString("es-DO")}</div>
                  </div>
                  <div>
                     <div className="text-xs text-muted-foreground">Cliente</div>
                     <div className="truncate">
                        {c.cliente_nombre ?? "—"}
                        {c.cliente_telefono && (
                           <span className="text-xs text-muted-foreground"> · {c.cliente_telefono}</span>
                        )}
                     </div>
                  </div>
                  {!ocultarProyecto && (
                     <div>
                        <div className="text-xs text-muted-foreground">Proyecto</div>
                        {c.proyecto_id ? (
                           <Link
                              href={`/dashboard/proyectos/${c.proyecto_id}`}
                              className="text-blue-600 hover:underline"
                           >
                              {c.proyecto_nombre ?? "Ver proyecto"}
                           </Link>
                        ) : (
                           <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                              Sin asignar
                           </Badge>
                        )}
                     </div>
                  )}
                  <div>
                     <div className="text-xs text-muted-foreground">Equipo</div>
                     <div className="truncate">
                        {c.equipo_nombre ?? "—"}
                        {c.categoria_equipo_nombre && (
                           <div className="text-xs text-muted-foreground truncate">
                              {c.categoria_equipo_nombre}
                              {c.categoria_equipo_tarifa_nombre
                                 ? ` · ${c.categoria_equipo_tarifa_nombre}`
                                 : ""}
                           </div>
                        )}
                     </div>
                  </div>
                  <div>
                     <div className="text-xs text-muted-foreground">Operador</div>
                     <div>{c.operador_nombre ?? "—"}</div>
                  </div>
                  <div>
                     <div className="text-xs text-muted-foreground">Detalle</div>
                     <div className="text-xs text-muted-foreground">
                        {c.tipo_conduce === "CAMION" ? (
                           <span>
                              {c.categoria_equipo_tarifa_nombre ?? "-"} · {c.procedencia} → {c.destino}
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
                     </div>
                  </div>
               </div>

               <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                     {c.tipo_conduce === "CAMION"
                        ? `${c.categoria_equipo_tarifa_nombre ?? "S.T."} / ${c.cantidad}`
                        : `${c.total_horas.toFixed(2)} h`}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                     {c.es_cobrable ? (
                        <Badge className="border-0 bg-green-100 text-green-800 text-xs">Sí</Badge>
                     ) : (
                        <Badge className="border-0 bg-gray-100 text-gray-600 text-xs">No</Badge>
                     )}
                     <span className="font-semibold whitespace-nowrap">
                        RD$ {c.subtotal.toLocaleString("es-DO")}
                     </span>
                  </div>
               </div>
            </div>
         ))}
      </div>

      <ConduceDetalleDialog
            conduce={conduceDetalle}
            open={!!conduceDetalle}
            onOpenChange={(v) => !v && setConduceDetalle(null)}
         />

         <ConduceDeleteDialog
            conduce={conduceAEliminar}
            open={!!conduceAEliminar}
            onOpenChange={(v) => !v && setConduceAEliminar(null)}
            onConfirm={handleConfirmarEliminar}
         />

         <ConduceEditDialog
            conduce={conduceAEditar}
            open={!!conduceAEditar}
            onOpenChange={(v) => !v && setConduceAEditar(null)}
         />
      </>
   );
}