import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PaginatedPurchaseOrders, PurchaseOrder } from "@/dtos/purchase-order.dto";
import Link from "next/link";

interface Props {
   ordenes: PaginatedPurchaseOrders;
   onPageChange: (page: number) => void;
   onEdit: (orden: PurchaseOrder) => void;
   onDelete: (id: string) => void;
}

export function OrdenesCompraTable({ ordenes, onPageChange, onEdit, onDelete }: Props) {
   const getBadgeVariant = (estado: string) => {
      switch (estado) {
         case "APROBADA": return "default";
         case "PENDIENTE": return "secondary";
         case "BORRADOR": return "outline";
         case "RECIBIDA": return "link";
         default: return "destructive";
      }
   };


   return (
      <div className="rounded-md border">
         <Table>
            <TableHeader>
               <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cant. items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Accion</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {(ordenes.data.length ? ordenes.data : []).length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center">
                        No hay órdenes registradas.
                     </TableCell>
                  </TableRow>
               ) : (
                  ordenes.data.map((orden) => (
                     <TableRow key={orden.id}>
                        <TableCell className="font-medium">
                           {orden.proveedor_nombre}
                        </TableCell>

                        <TableCell>
                           {format(new Date(orden.fecha), "dd/MM/yyyy")}
                        </TableCell>

                        <TableCell>{orden.items.length}</TableCell>

                        <TableCell>
                           RD$ {orden.total.toLocaleString()}
                        </TableCell>

                        <TableCell>
                           <Badge
                              variant={getBadgeVariant(orden.estado)}
                              className={`capitalize ${getBadgeVariant(orden.estado) === "link"
                                 ? "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                                 : ""
                                 }`}
                           >
                              {orden.estado}
                           </Badge>
                        </TableCell>

                        <TableCell>
                           <Link
                              href={`/dashboard/compras/${orden.id}`}
                              className="text-blue-600 hover:underline"
                           >
                              Ver detalles
                           </Link>
                        </TableCell>
                     </TableRow>
                  ))
               )}
            </TableBody>
            <div className="flex items-center justify-between border-t p-4">
               <p className="text-sm text-muted-foreground">
                  Mostrando {(ordenes.page - 1) * ordenes.limit + 1} -{" "}
                  {Math.min(ordenes.page * ordenes.limit, ordenes.total)} de{" "}
                  {ordenes.total} órdenes
               </p>

               <div className="flex gap-2">
                  <Button
                     variant="outline"
                     disabled={ordenes.page === 1}
                     onClick={() => onPageChange(ordenes.page - 1)}
                  >
                     Anterior
                  </Button>

                  <span className="flex items-center px-3 text-sm">
                     Página {ordenes.page} de {ordenes.totalPages}
                  </span>

                  <Button
                     variant="outline"
                     disabled={ordenes.page >= ordenes.totalPages}
                     onClick={() => onPageChange(ordenes.page + 1)}
                  >
                     Siguiente
                  </Button>
               </div>
            </div>
         </Table>
      </div>
   );
}