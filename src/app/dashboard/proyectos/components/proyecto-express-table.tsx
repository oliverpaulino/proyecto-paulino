"use client";

import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { useEffect } from "react";

interface Props {
   proyectos: Proyecto[];
}

export function ProyectoExpressTable({ proyectos }: Props) {
   if (proyectos.length === 0) {
      return (
         <div className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed text-muted-foreground text-sm">
            No hay proyectos express registrados aún.
         </div>
      );
   }

   return (
      <div className="rounded-xl border overflow-hidden">
         <Table>
            <TableHeader>
               <TableRow className="bg-muted/40">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Tarifa</TableHead>
                  <TableHead className="text-right">Total Cobrable</TableHead>
                  <TableHead className="text-right">Gastos Internos</TableHead>
                  <TableHead className="text-right">Rentabilidad</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {proyectos.map((p) => {
                  const asig = p.asignaciones[0];
                  const tarifa = p.tipo_proyecto === "EXPRESS" ? p.tarifa_servicio : 0;
                  const rent = p.rentabilidad;

                  return (
                     <TableRow key={p.id}>
                        <TableCell className="font-medium">
                           {p.cliente_nombre ?? p.cliente_id.slice(0, 8) + "…"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                           RD$ {tarifa.toLocaleString("es-DO")}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                           RD$ {p.total_cobrable.toLocaleString("es-DO")}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                           RD$ {p.total_gasto_interno.toLocaleString("es-DO")}
                        </TableCell>
                        <TableCell
                           className={`text-right font-semibold ${rent >= 0 ? "text-green-700" : "text-red-600"
                              }`}
                        >
                           RD$ {rent.toLocaleString("es-DO")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                           {asig?.empleado_nombre ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                           {asig?.equipo_nombre ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                           {new Date(p.fecha_inicio).toLocaleDateString("es-DO")}
                        </TableCell>
                        <TableCell>
                           <EstadoBadge estado={p.estado} />
                        </TableCell>
                     </TableRow>
                  );
               })}
            </TableBody>
         </Table>
      </div>
   );
}

function EstadoBadge({ estado }: { estado: string }) {
   const map: Record<string, string> = {
      COMPLETADO: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      BORRADOR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      CANCELADO: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
   };
   return (
      <Badge className={`border-0 text-xs font-medium ${map[estado] ?? ""}`}>
         {estado}
      </Badge>
   );
}
