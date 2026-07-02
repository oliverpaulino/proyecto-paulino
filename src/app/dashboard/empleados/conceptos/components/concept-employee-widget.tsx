"use client";

import { useEffect, useState } from "react";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Loader2, ReceiptText } from "lucide-react";
import type { PayrollItem } from "@/dtos/payroll-concept.dto";

type PayrollItemView = PayrollItem & {
   concept_name?: string;
   concept_sign?: number;
};

export function EmployeeConceptsWidget({ employeeId }: { employeeId: string }) {
   const [items, setItems] = useState<PayrollItemView[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      async function fetchItems() {
         try {
            setLoading(true);
            setError(null);
            
            const res = await fetch(`/api/payroll/items/history/${employeeId}`);
            if (res.status === 404) {
               throw new Error("No hay conceptos aplicados");
            }
            
            const data = await res.json();
            setItems(data);
         } catch (err) {
            setError(err instanceof Error ? err.message : "Error al conectarse con el servidor");
         } finally {
            setLoading(false);
         }
      }

      if (employeeId) {
         fetchItems();
      }
   }, [employeeId]);

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg bg-muted/10">
            <Loader2 className="size-6 animate-spin text-brand-blue mb-2" />
            <span className="text-sm">Cargando historial de nómina...</span>
         </div>
      );
   }

   if (error) {
      return (
         <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900">
            <p className="font-semibold">Ha ocurrido un problema</p>
            <p>{error}</p>
         </div>
      );
   }

   if (items.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border rounded-lg bg-muted/5">
            <ReceiptText className="size-10 opacity-20 mb-3" />
            <p className="text-sm font-medium">No hay registros</p>
            <p className="text-xs">Este empleado aún no tiene conceptos aplicados en su historial.</p>
         </div>
      );
   }

   return (
      <div className="rounded-md border">
         <Table>
            <TableHeader>
               <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {items.map((item) => {
                  const isEarning = item.concept_sign === 1 || item.amount > 0; 
                  
                  return (
                     <TableRow key={item.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                           {new Date(item.work_date || item.created_at).toLocaleDateString("es-DO")}
                        </TableCell>
                        <TableCell className="font-medium">
                           {item.concept_name || `Concepto #${item.concept_id.substring(0, 6)}`}
                        </TableCell>
                        <TableCell>
                           <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isEarning
                                 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                 : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                           }`}>
                              {isEarning ? "Ingreso" : "Deducción"}
                           </span>
                        </TableCell>
                        <TableCell className={`text-right font-semibold whitespace-nowrap ${
                           isEarning ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}>
                           {isEarning ? "+" : "-"} RD$ {Math.abs(item.amount).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                     </TableRow>
                  );
               })}
            </TableBody>
         </Table>
      </div>
   );
}