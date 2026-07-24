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
import Link from "next/link";

interface Props {
   proyectos: Proyecto[];
}

export function ProyectoTable({ proyectos }: Props) {
   if (proyectos.length === 0) {
      return (
         <div className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed text-muted-foreground text-sm">
            No hay proyectos registrados aún.
         </div>
      );
   }

   return (
      <div className="rounded-xl border overflow-hidden">
         <Table>
            <TableHeader>
               <TableRow className="bg-muted/40">
                  <TableHead>Nombre del Proyecto</TableHead>
                  <TableHead className="text-right">Tarifa Servicio</TableHead>
                  <TableHead className="text-right">Total en Camiones</TableHead>
                  <TableHead className="text-right">Total Cobrable</TableHead>
                  <TableHead className="text-right">Gastos Internos</TableHead>
                  <TableHead className="text-right">Rentabilidad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {proyectos.map((p) => {
                  // total_equipos ahora viene cacheado desde el backend (suma
                  // de conduces), ya no se calcula aquí — antes `p.detalle`
                  // venía vacío en el historial y esta columna siempre daba 0.
                  const tarifa = p.tarifa_servicio !== undefined ? p.tarifa_servicio : 0;
                  const rent = p.rentabilidad;

                  return (
                     <TableRow key={p.id}>
                        <TableCell className="font-medium text-blue-600 text-ellipsis overflow-hidden whitespace-nowrap">
                           {p.nombre}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                           RD$ {tarifa.toLocaleString("es-DO")}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                           RD$ {p.total_equipos.toLocaleString("es-DO")}
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
                           {new Date(p.fecha_inicio).toLocaleDateString("es-DO")}
                        </TableCell>
                        <TableCell>
                           <EstadoBadge estado={p.estado} />
                        </TableCell>
                        <TableCell>
                           <Link
                              href={`/dashboard/proyectos/${p.id}`}
                              className="text-blue-600 hover:underline">
                              Ver detalles
                           </Link>
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
      "EN PROGRESO": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
   };
   return (
      <Badge className={`border-0 text-xs font-medium ${map[estado] ?? ""}`}>
         {estado}
      </Badge>
   );
}