"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Eye, RotateCcw } from "lucide-react";
import { useDeduccionStore } from "@/stores/useDeduccionStore";
import type { Deduccion } from "@/dtos/deducciones.dto";
import { RestoreDeduccionDialog } from "../components/restore-deduccion-dialog";

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function formatDate(value: string | Date | null | undefined): string {
   if (!value) return "-";
   return new Date(value).toLocaleDateString("es-DO");
}

export default function DeduccionesEliminadasPage() {
   const router = useRouter();
   const { DeletedDeducciones, loading, GetDeletedDeducciones, RestoreDeduccion } = useDeduccionStore();
   const [search, setSearch] = useState("");
   
   const [restoreTarget, setRestoreTarget] = useState<Deduccion | null>(null);
   const [formLoading, setFormLoading] = useState(false);

   useEffect(() => {
      GetDeletedDeducciones({ force: true });
   }, [GetDeletedDeducciones]);

   const filtered = (DeletedDeducciones || []).filter((d) => {
      const q = search.toLowerCase();
      return (
         d.codigoReferencia.toLowerCase().includes(q) ||
         d.concepto.toLowerCase().includes(q) ||
         (d.empleado_nombre || "").toLowerCase().includes(q) ||
         (d.deleted_reason ?? "").toLowerCase().includes(q)
      );
   });

   async function handleRestore() {
      if (!restoreTarget) return;
      setFormLoading(true);
      try {
         const result = await RestoreDeduccion(restoreTarget.id);
         if (result instanceof Error) {
            alert(result.message);
         } else {
            setRestoreTarget(null);
         }
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Encabezado */}
         <div>
            <div className="flex items-center gap-3">
               <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.back()}
               >
                  <ArrowLeft className="size-4" />
               </Button>
               <Trash2 className="size-7 text-red-500" />
               <h1 className="text-3xl font-bold tracking-tight">
                  Deducciones Anuladas
               </h1>
            </div>
            <p className="mt-1.5 ml-14 text-sm text-gray-500">
               Historial y auditoría de deducciones revertidas del sistema
            </p>
         </div>

         {/* Buscador interno */}
         <div className="flex items-center gap-3">
            <input
               type="text"
               placeholder="Buscar por referencia, concepto, empleado o motivo..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
         </div>

         {/* Área de la Tabla / Estado de Carga */}
         {loading && DeletedDeducciones.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
               Cargando historial de eliminaciones...
            </div>
         ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 text-sm text-gray-500 dark:border-gray-800">
               <Trash2 className="size-8 mb-2 opacity-50" />
               <span>No hay deducciones anuladas que coincidan con la búsqueda.</span>
            </div>
         ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Ref. / Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Concepto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Empleado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Eliminado Por</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Motivo</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Monto</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                     {filtered.map((deduccion) => (
                        <tr key={deduccion.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                           <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-500 line-through">
                                 {deduccion.codigoReferencia}
                              </span>
                              <div className="text-xs text-gray-400 mt-0.5">
                                 {formatDate(deduccion.fecha)}
                              </div>
                           </td>
                           <td className="px-4 py-3 font-medium truncate max-w-[180px]" title={deduccion.concepto}>
                              {deduccion.concepto}
                           </td>
                           <td className="px-4 py-3 text-xs">
                              <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-medium">
                                 {deduccion.empleado_nombre || "N/A"}
                              </span>
                           </td>
                           <td className="px-4 py-3 text-xs">
                              <div className="font-medium">
                                 {deduccion.deleted_by ?? "Sistema"}
                              </div>
                              <div className="text-gray-400 mt-0.5">
                                 {formatDate(deduccion.deleted_at)}
                              </div>
                           </td>
                           <td className="px-4 py-3 text-xs text-red-500 italic truncate max-w-[180px]" title={deduccion.deleted_reason ?? "Sin motivo"}>
                              {deduccion.deleted_reason ?? "Sin motivo"}
                           </td>
                           <td className="px-4 py-3 text-right font-medium text-gray-400 line-through">
                              {formatMoney(deduccion.monto_total)}
                           </td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                 <Link href={`/dashboard/deducciones/${deduccion.id}`}>
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       className="h-8 text-brand-blue hover:bg-brand-blue/10 dark:text-blue-400 transition-colors"
                                       title="Ver Detalles"
                                    >
                                       <Eye className="size-4" />
                                    </Button>
                                 </Link>
                                 <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRestoreTarget(deduccion)}
                                    disabled={loading || formLoading}
                                    className="h-8 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400 transition-colors"
                                    title="Restaurar Deducción"
                                 >
                                    <RotateCcw className="size-4"/>
                                 </Button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         <RestoreDeduccionDialog
            deduccion={restoreTarget}
            onConfirm={handleRestore}
            onClose={() => setRestoreTarget(null)}
            loading={formLoading}
         />
      </div>
   );
}