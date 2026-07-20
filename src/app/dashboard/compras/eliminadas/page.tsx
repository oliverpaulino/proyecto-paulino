"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import type { PurchaseOrderDeleted } from "@/dtos/purchase-order.dto";
import { RestorePurchaseOrderDialog } from "../components/restore-purchase-order-dialog";
import { TableSearch } from "@/components/table-search";

// Utilidades puras fuera del componente para no recrearlas en cada render
const formatMoney = (value: number): string =>
   new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);

const formatDate = (value: string | Date | null | undefined): string =>
   value ? new Date(value).toLocaleDateString("es-DO") : "-";

export default function ComprasEliminadasPage() {
   const router = useRouter();
   const { PurchaseOrdersDeleted, loading, GetPurchaseOrdersDeleted, RestorePurchaseOrder } = usePurchaseOrderStore();

   const [search, setSearch] = useState("");
   const [page, setPage] = useState(1);
   const limit = 10;

   const [restoreTarget, setRestoreTarget] = useState<PurchaseOrderDeleted | null>(null);
   const [formLoading, setFormLoading] = useState(false);

   // Sincronización con el Backend
   useEffect(() => {
      document.title = "Órdenes de Compra Eliminadas";
      GetPurchaseOrdersDeleted({ force: true, page, limit, search });
   }, [page, search, limit, GetPurchaseOrdersDeleted]);

   // Handlers limpios
   const handleSearch = (value: string) => {
      setSearch(value);
      setPage(1); // Crucial: Volver a la página 1 al buscar
   };

   const handleRestore = async () => {
      if (!restoreTarget) return;
      setFormLoading(true);
      try {
         const result = await RestorePurchaseOrder(restoreTarget.id);
         if (result instanceof Error) throw result; // Manejo directo del error
         setRestoreTarget(null);
      } catch (error: any) {
         alert(error.message || "Error al restaurar la orden");
      } finally {
         setFormLoading(false);
      }
   };

   // Estados derivados para facilitar la lectura del renderizado
   const hasData = PurchaseOrdersDeleted.data.length > 0;
   const isInitialLoading = loading && !hasData;
   const isBackgroundLoading = loading && hasData; // Cuando cambia de página o busca

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Encabezado */}
         <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
               <Button variant="outline" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="size-4" />
               </Button>
               <Trash2 className="size-7 text-red-500" />
               <h1 className="text-3xl font-bold tracking-tight">
                  Órdenes Eliminadas
               </h1>
            </div>
            <p className="ml-14 text-sm text-gray-500">
               Historial y auditoría de órdenes que fueron removidas del sistema
            </p>
         </div>

         {/* Barra de Herramientas (Buscador + Indicador de carga) */}
         <div className="flex items-center justify-between gap-3">
            <div className="w-full max-w-sm">
               <TableSearch
                  placeholder="Buscar por OC, proveedor o motivo..."
                  value={search}
                  onValueChange={handleSearch}
               />
            </div>
            {/* Feedback visual sutil cuando busca o cambia de página */}
            {isBackgroundLoading && (
               <div className="flex items-center text-sm text-gray-400 gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Actualizando...
               </div>
            )}
         </div>

         {/* Renderizado Condicional del Contenido */}
         {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-sm text-gray-500 gap-3">
               <Loader2 className="size-8 animate-spin text-brand-blue" />
               Cargando historial...
            </div>
         ) : !hasData ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16 text-sm text-gray-500 dark:border-gray-800 bg-gray-50/50">
               <Trash2 className="size-10 mb-3 opacity-20" />
               <span className="text-base font-medium text-gray-600">No se encontraron órdenes eliminadas</span>
               <span className="text-gray-400 mt-1">Intenta con otros términos de búsqueda.</span>
            </div>
         ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue/90 border-b">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Nº / Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Proveedor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Eliminado Por</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Motivo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white">Acciones</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                     {PurchaseOrdersDeleted.data.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                           <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                                 {order.codigoReferencia}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                 {formatDate(order.fecha)}
                              </div>
                           </td>
                           <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                              {order.proveedor_nombre ?? "Proveedor Desconocido"}
                           </td>
                           <td className="px-4 py-3 text-xs">
                              <div className="font-medium text-gray-700 dark:text-gray-300">
                                 {order.deleted_by ?? "Sistema"}
                              </div>
                              <div className="text-gray-400 mt-0.5">
                                 {formatDate(order.deleted_at)}
                              </div>
                           </td>
                           <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 italic truncate max-w-[200px]">
                              {order.deleted_reason ?? "Sin motivo especificado"}
                           </td>
                           <td className="px-4 py-3 text-left font-medium text-gray-400 line-through">
                              {formatMoney(order.total)}
                           </td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setRestoreTarget(order)}
                                 disabled={loading || formLoading}
                                 className="h-8 text-brand-blue border-brand-blue/20 hover:bg-brand-blue hover:text-white transition-all"
                              >
                                 <RefreshCw className="size-3.5 mr-1.5" />
                                 Restaurar
                              </Button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>

               {/* Paginación */}
               <div className="flex p-4 border-t items-center justify-between bg-gray-50 dark:bg-gray-900/20">
                  <p className="text-sm text-gray-500 font-medium">
                     Página {PurchaseOrdersDeleted.page} de {Math.max(1, PurchaseOrdersDeleted.totalPages)}
                  </p>

                  <div className="flex gap-2">
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || loading}
                        onClick={() => setPage((p) => p - 1)}
                     >
                        Anterior
                     </Button>
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= PurchaseOrdersDeleted.totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}
                     >
                        Siguiente
                     </Button>
                  </div>
               </div>
            </div>
         )}

         <RestorePurchaseOrderDialog
            order={restoreTarget}
            onConfirm={handleRestore}
            onClose={() => setRestoreTarget(null)}
            loading={formLoading}
         />
      </div>
   );
}