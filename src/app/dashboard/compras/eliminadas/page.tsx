"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import type { PurchaseOrderDeleted } from "@/dtos/purchase-order.dto";
import { RestorePurchaseOrderDialog } from "../components/restore-purchase-order-dialog";
import { PermissionGuard } from "@/components/permission-guard";

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

export default function ComprasEliminadasPage() {
   const router = useRouter();
   const { PurchaseOrdersDeleted, loading, GetPurchaseOrdersDeleted, RestorePurchaseOrder } = usePurchaseOrderStore();
   const [search, setSearch] = useState("");
   
   const [restoreTarget, setRestoreTarget] = useState<PurchaseOrderDeleted | null>(null);
   const [formLoading, setFormLoading] = useState(false);

   useEffect(() => {
      GetPurchaseOrdersDeleted();
   }, [GetPurchaseOrdersDeleted]);

   const filtered = (PurchaseOrdersDeleted || []).filter((o) => {
      const q = search.toLowerCase();
      return (
         o.id.toLowerCase().includes(q) ||
         (o.proveedor_nombre ?? "").toLowerCase().includes(q) ||
         (o.deleted_reason ?? "").toLowerCase().includes(q)
      );
   });

   async function handleRestore() {
      if (!restoreTarget) return;
      setFormLoading(true);
      try {
         const result = await RestorePurchaseOrder(restoreTarget.id);
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
      <PermissionGuard resource="material_request" action="read">
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
                  Órdenes de Compra Eliminadas
               </h1>
            </div>
            <p className="mt-1.5 ml-14 text-sm text-gray-500">
               Historial y auditoría de órdenes que fueron removidas del sistema
            </p>
         </div>

         {/* Buscador interno */}
         <div className="flex items-center gap-3">
            <input
               type="text"
               placeholder="Buscar por ID, proveedor o motivo..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="h-9 w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
         </div>

         {/* Área de la Tabla / Estado de Carga */}
         {loading && PurchaseOrdersDeleted.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
               Cargando historial de eliminaciones...
            </div>
         ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 text-sm text-gray-500 dark:border-gray-800">
               <Trash2 className="size-8 mb-2 opacity-50" />
               <span>No hay órdenes de compra eliminadas que coincidan con la búsqueda.</span>
            </div>
         ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-brand-blue">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Nº / Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Proveedor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Eliminado Por</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Motivo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                     {filtered.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                           <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-500 line-through">
                                 {order.id.slice(0, 8)}...
                              </span>
                              <div className="text-xs text-gray-400 mt-0.5">
                                 {formatDate(order.fecha)}
                              </div>
                           </td>
                           <td className="px-4 py-3 font-medium">
                              {order.proveedor_nombre ?? order.proveedor_id}
                           </td>
                           <td className="px-4 py-3 text-xs">
                              <div className="font-medium">
                                 {order.deleted_by ?? "Sistema"}
                              </div>
                              <div className="text-gray-400 mt-0.5">
                                 {formatDate(order.deleted_at)}
                              </div>
                           </td>
                           <td className="px-4 py-3 text-xs text-red-500 italic truncate max-w-[200px]">
                              {order.deleted_reason ?? "Sin motivo"}
                           </td>
                           <td className="px-4 py-3 text-right font-medium text-gray-400 line-through">
                              {formatMoney(order.total)}
                           </td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => setRestoreTarget(order)}
                                 disabled={loading || formLoading}
                                 className="h-8 text-brand-blue hover:bg-brand-blue/10 dark:text-blue-400 transition-colors"
                                 title="Restaurar Orden"
                              >
                                 <RefreshCw className="size-4 mr-1" />
                                 Restaurar
                              </Button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         <RestorePurchaseOrderDialog
            order={restoreTarget}
            onConfirm={handleRestore}
            onClose={() => setRestoreTarget(null)}
            loading={formLoading}
         />
      </div>
      </PermissionGuard>
   );
}