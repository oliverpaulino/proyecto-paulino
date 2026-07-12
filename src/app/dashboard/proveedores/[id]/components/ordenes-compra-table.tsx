import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PurchaseOrder } from "@/dtos/purchase-order.dto";
import Link from "next/link";

interface Props {
   ordenes: Partial<PurchaseOrder[]>;
   onEdit: (orden: PurchaseOrder) => void;
   onDelete: (id: string) => void;
}

export function OrdenesCompraTable({ ordenes, onEdit, onDelete }: Props) {
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
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {ordenes.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center">No hay órdenes registradas.</TableCell>
                  </TableRow>
               ) : (
                  ordenes.map((orden) => (
                     <TableRow key={orden?.id}>
                        <TableCell className="font-medium">{orden?.proveedor_nombre}</TableCell>
                        <TableCell>{format(new Date(orden?.fecha || ""), "dd/MM/yyyy")}</TableCell>
                        <TableCell>RD$ {orden?.total.toLocaleString()}</TableCell>
                        <TableCell>
                           <Badge variant={getBadgeVariant(orden?.estado || "")} className={`capitalize ${getBadgeVariant(orden?.estado || "") === "link" ? "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" : ""}`} >
                              {orden?.estado}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => onEdit(orden as PurchaseOrder)}>
                              <Edit2 className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => onDelete(orden?.id || "")}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </TableCell>
                        <TableCell >
                           <Link href={`/dashboard/compras/${orden?.id}`} className="text-blue-600 hover:underline">
                              Ver detalles
                           </Link>
                        </TableCell>
                     </TableRow>
                  ))
               )}
            </TableBody>
         </Table>
      </div>
   );
}