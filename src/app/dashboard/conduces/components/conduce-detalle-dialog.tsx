"use client";

import Link from "next/link";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Truck, HardHat, CheckCircle2, XCircle } from "lucide-react";
import type { ConduceDTO } from "@/dtos/conduce.dto";

interface Props {
   conduce: ConduceDTO | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
   return (
      <div className="space-y-0.5">
         <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
         <div className="text-sm">{value ?? "—"}</div>
      </div>
   );
}

function Firma({ ok, label }: { ok: boolean; label: string }) {
   return (
      <div className="flex items-center gap-1.5 text-sm">
         {ok ? <CheckCircle2 className="size-4 text-green-600" /> : <XCircle className="size-4 text-muted-foreground" />}
         {label}
      </div>
   );
}

/** Vista de solo lectura con todos los datos del conduce, incluida auditoría. */
export function ConduceDetalleDialog({ conduce, open, onOpenChange }: Props) {
   if (!conduce) return null;

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
               <div className="flex items-center gap-2">
                  {conduce.tipo_conduce === "CAMION" ? (
                     <Badge className="border-0 bg-blue-100 text-blue-800 text-xs gap-1">
                        <Truck className="size-3" /> Camión
                     </Badge>
                  ) : (
                     <Badge className="border-0 bg-orange-100 text-orange-800 text-xs gap-1">
                        <HardHat className="size-3" /> Equipo
                     </Badge>
                  )}
                  <DialogTitle>Conduce {conduce.numero_referencia}</DialogTitle>
               </div>
               <DialogDescription>
                  Registrado {conduce.created_by_name ? `por ${conduce.created_by_name} ` : ""}
                  el {new Date(conduce.created_at).toLocaleString("es-DO")}
               </DialogDescription>
            </DialogHeader>

            {conduce.deleted_at && (
               <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-medium">Este conduce está eliminado</p>
                  <p className="text-xs mt-0.5">
                     {conduce.deleted_by_name ? `Por ${conduce.deleted_by_name} · ` : ""}
                     {new Date(conduce.deleted_at).toLocaleString("es-DO")}
                  </p>
                  {conduce.deleted_reason && <p className="text-xs mt-1">Motivo: {conduce.deleted_reason}</p>}
               </div>
            )}

            <div className="grid grid-cols-2 gap-4 py-2">
               <Campo label="Fecha" value={new Date(conduce.fecha).toLocaleDateString("es-DO")} />
               <Campo
                  label="Cobrable"
                  value={
                     conduce.es_cobrable ? (
                        <Badge className="border-0 bg-green-100 text-green-800 text-xs">Sí</Badge>
                     ) : (
                        <Badge className="border-0 bg-gray-100 text-gray-600 text-xs">No</Badge>
                     )
                  }
               />

               <Campo
                  label="Cliente"
                  value={
                     <>
                        {conduce.cliente_nombre ?? "—"}
                        {conduce.cliente_telefono && (
                           <div className="text-xs text-muted-foreground">{conduce.cliente_telefono}</div>
                        )}
                     </>
                  }
               />
               <Campo
                  label="Proyecto"
                  value={
                     conduce.proyecto_id ? (
                        <Link href={`/dashboard/proyectos/${conduce.proyecto_id}`} className="text-blue-600 hover:underline">
                           {conduce.proyecto_nombre ?? "Ver proyecto"}
                        </Link>
                     ) : (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Sin asignar</Badge>
                     )
                  }
               />

               <Campo label="Equipo" value={conduce.equipo_nombre} />
               <Campo label="Operador" value={conduce.operador_nombre} />

               <Campo label="Categoría de equipo" value={conduce.categoria_equipo_nombre} />
               <Campo label="Tarifa aplicada" value={`${conduce.categoria_equipo_tarifa_nombre} (${conduce.medida_cobro_nombre})`} />

               <Campo label="Precio unitario" value={`RD$ ${conduce.precio_unitario.toLocaleString("es-DO")}`} />
               <Campo
                  label={conduce.tipo_conduce === "CAMION" ? "Cantidad" : "Total horas"}
                  value={
                     conduce.tipo_conduce === "CAMION"
                        ? `${conduce.cantidad} ${conduce.medida_cobro_nombre ?? ""}`
                        : `${conduce.total_horas.toFixed(2)} h`
                  }
               />

               <Campo
                  label="Subtotal"
                  value={<span className="font-semibold">RD$ {conduce.subtotal.toLocaleString("es-DO")}</span>}
               />

               {conduce.tipo_conduce === "CAMION" ? (
                  <>
                     <Campo label="Procedencia → Destino" value={`${conduce.procedencia} → ${conduce.destino}`} />
                     <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Firmas</p>
                        <Firma ok={conduce.firma_chofer} label="Chofer" />
                        <Firma ok={conduce.firma_recibido} label="Recibido" />
                     </div>
                  </>
               ) : (
                  <>
                     <Campo
                        label="Horario"
                        value={
                           <>
                              {conduce.horario_manana_inicio && conduce.horario_manana_fin
                                 ? `AM ${conduce.horario_manana_inicio}-${conduce.horario_manana_fin}`
                                 : "AM —"}
                              {" / "}
                              {conduce.horario_tarde_inicio && conduce.horario_tarde_fin
                                 ? `PM ${conduce.horario_tarde_inicio}-${conduce.horario_tarde_fin}`
                                 : "PM —"}
                           </>
                        }
                     />
                     <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Firmas y combustible</p>
                        <Firma ok={conduce.firma_observante} label="Observante" />
                        <Firma ok={conduce.firma_camionero} label="Camionero" />
                        <Firma ok={conduce.combustible_pagado_cliente} label="Combustible pagado por cliente" />
                     </div>
                  </>
               )}

               <div className="col-span-2">
                  <Campo label="Observaciones" value={conduce.observaciones} />
               </div>

               <div className="col-span-2 text-xs text-muted-foreground">
                  Última actualización: {new Date(conduce.updated_at).toLocaleString("es-DO")}
               </div>
            </div>
         </DialogContent>
      </Dialog>
   );
}