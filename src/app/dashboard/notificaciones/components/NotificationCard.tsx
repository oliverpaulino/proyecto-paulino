import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Delete, ExternalLink, Loader, Trash } from "lucide-react";
import { useNotificationStore, type Notification } from "@/stores/useNotificationStore";
import Link from "next/link";
import { useState } from "react";

const TYPE_LABELS: Record<string, string> = {
   PURCHASE_ORDER_REVIEW: "Orden de Compra",
   PURCHASE_ORDER_DELETED: "Orden de Compra Eliminada",
   TASK_ASSIGNED: "Tarea",
   GENERAL: "General",
};

const TYPE_COLORS: Record<string, string> = {
   PURCHASE_ORDER_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
   PURCHASE_ORDER_DELETED: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
   TASK_ASSIGNED: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   GENERAL: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-600",
};

const REFERENCE_URLS: Record<string, (id: string) => string> = {
   purchase_order: (id) => `/dashboard/compras/${id}`,
};



export default function NotificationCard({
   notification: n,
   onMarkRead,
}: {
   notification: Notification;
   onMarkRead: (id: string) => void;
}) {

   const { deleteNotification, deleteLoading } = useNotificationStore();

   function timeAgo(dateStr: string): string {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60_000);
      if (mins < 1) return "Ahora mismo";
      if (mins < 60) return `Hace ${mins} min`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `Hace ${hrs} h`;
      const days = Math.floor(hrs / 24);
      return `Hace ${days} día${days !== 1 ? "s" : ""}`;
   }

   const [deletingId, setDeletingId] = useState<string | null>(null);

   const handleDelete = async (id: string) => {
      setDeletingId(id);

      try {
         await deleteNotification(id);
      } finally {
         setDeletingId(null);
      }
   };

   const refUrl =
      n.reference_type && n.reference_id
         ? REFERENCE_URLS[n.reference_type]?.(n.reference_id)
         : null;

   const typeLabel = TYPE_LABELS[n.type] ?? n.type;
   const typeColor = TYPE_COLORS[n.type] ?? TYPE_COLORS.GENERAL;

   return (
      <div
         className={cn(
            "flex items-start gap-4 rounded-xl border p-4 transition-colors",
            n.is_read
               ? "border-border bg-card"
               : "border-brand-blue/30 bg-brand-blue/5 dark:bg-brand-blue/10"
         )}
      >
         {/* Unread dot */}
         <div className="mt-1 shrink-0">
            {!n.is_read ? (
               <span className="block h-2 w-2 rounded-full bg-brand-blue" />
            ) : (
               <span className="block h-2 w-2 rounded-full bg-transparent" />
            )}
         </div>

         {/* Content */}
         <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
               <span
                  className={cn(
                     "rounded-full border px-2 py-0.5 text-xs font-medium",
                     typeColor
                  )}
               >
                  {typeLabel}
               </span>
               <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
            </div>
            <p className={cn("mt-1 text-sm font-semibold", n.is_read && "font-medium text-muted-foreground")}>
               {n.title}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
         </div>

         {/* Actions */}
         <div className="flex shrink-0 items-center gap-1">
            {refUrl && (
               <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href={refUrl}>
                     <ExternalLink className="size-4" />
                     <span className="sr-only">Ver detalle</span>
                  </Link>
               </Button>

            )}
            {!n.is_read && (
               <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onMarkRead(n.id)}
                  title="Marcar como leída"
               >
                  <Check className="size-4 text-green-500" />
                  <span className="sr-only">Marcar como leída</span>
               </Button>
            )}
            <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 hover:bg-brand-red/10 dark:hover:bg-brand-red/20"
               onClick={() => handleDelete(n.id)}
               title="Eliminar"
            >
               {
                  deletingId === n.id ? <Loader className="size-4 animate-spin text-brand-black" /> : <Trash className="size-4 text-brand-red" />
               }
               <span className="sr-only">Eliminar</span>
            </Button>
         </div>
      </div>
   );
}
