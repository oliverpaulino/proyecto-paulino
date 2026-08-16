"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, RefreshCw, Eye, RotateCcw } from "lucide-react";
import { useGastoStore } from "@/stores/useGastoStore";
import type { Gasto } from "@/dtos/gastos.dto";
import { RestoreGastoDialog } from "../components/restore-gasto-dialog";
import { toast } from "sonner";

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

export default function GastosEliminadosPage() {
   const router = useRouter();
   const { DeletedGastos, loading, GetDeletedGastos, RestoreGasto } = useGastoStore();
   const [search, setSearch] = useState("");
   
   const [restoreTarget, setRestoreTarget] = useState<Gasto | null>(null);
   const [formLoading, setFormLoading] = useState(false);

   useEffect(() => {
      GetDeletedGastos({ force: true });
   }, [GetDeletedGastos]);

   const filtered = (DeletedGastos || []).filter((g) => {
      const q = search.toLowerCase();
      return (
         g.codigoReferencia.toLowerCase().includes(q) ||
         g.concepto.toLowerCase().includes(q) ||
         g.categoria_gasto_nombre.toLowerCase().includes(q) ||
         (g.deleted_reason ?? "").toLowerCase().includes(q)
      );
   });

   async function handleRestore() {
      if (!restoreTarget) return;
      setFormLoading(true);
      try {
         const result = await RestoreGasto(restoreTarget.id);
          if (result instanceof Error) {
            toast.error(result.message);
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
                  Gastos Anulados
               </h1>
            </div>
            <p className="mt-1.5 ml-14 text-sm text-gray-500">
               Historial y auditoría de gastos que fueron removidos del sistema
            </p>
         </div>

         {/* Buscador interno */}
         <div className="flex items-center gap-3">
            <input
               type="text"
               placeholder="Buscar por referencia, concepto, categoría o motivo..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
         </div>

         {/* Área de la Tabla / Estado de Carga */}
         {loading && DeletedGastos.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
               Cargando historial de eliminaciones...
            </div>
         ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 text-sm text-gray-500 dark:border-gray-800">
               <Trash2 className="size-8 mb-2 opacity-50" />
               <span>No hay gastos anulados que coincidan con la búsqueda.</span>
            </div>
         ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Ref. / Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Concepto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Categoría</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Eliminado Por</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Motivo</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Monto</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                     {filtered.map((gasto) => (
                        <tr key={gasto.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                           <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-500 line-through">
                                 {gasto.codigoReferencia}
                              </span>
                              <div className="text-xs text-gray-400 mt-0.5">
                                 {formatDate(gasto.fecha)}
                              </div>
                           </td>
                           <td className="px-4 py-3 font-medium truncate max-w-[180px]" title={gasto.concepto}>
                              {gasto.concepto}
                           </td>
                           <td className="px-4 py-3 text-xs">
                              <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-medium">
                                 {gasto.categoria_gasto_nombre}
                              </span>
                           </td>
                           <td className="px-4 py-3 text-xs">
                              <div className="font-medium">
                                 {gasto.deleted_by ?? "Sistema"}
                              </div>
                              <div className="text-gray-400 mt-0.5">
                                 {formatDate(gasto.deleted_at)}
                              </div>
                           </td>
                           <td className="px-4 py-3 text-xs text-red-500 italic truncate max-w-[180px]" title={gasto.deleted_reason ?? "Sin motivo"}>
                              {gasto.deleted_reason ?? "Sin motivo"}
                           </td>
                           <td className="px-4 py-3 text-right font-medium text-gray-400 line-through">
                              {formatMoney(gasto.monto_total)}
                           </td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                 <Link href={`/dashboard/gastos/${gasto.id}`}>
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
                                    onClick={() => setRestoreTarget(gasto)}
                                    disabled={loading || formLoading}
                                    className="h-8 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400 transition-colors"
                                    title="Restaurar Gasto"
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

         <RestoreGastoDialog
            gasto={restoreTarget}
            onConfirm={handleRestore}
            onClose={() => setRestoreTarget(null)}
            loading={formLoading}
         />
      </div>
   );
}