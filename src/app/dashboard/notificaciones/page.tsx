"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore, type Notification } from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/components/permission-guard";

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

export default function NotificacionesPage() {
   const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } =
      useNotificationStore();

   useEffect(() => {
      fetchNotifications();
   }, [fetchNotifications]);

   return (
      <PermissionGuard resource="features" action="read">
         <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
                  <Bell className="size-7 text-brand-blue dark:text-blue-400" />
                  <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                     Notificaciones
                  </h1>
                  {unreadCount > 0 && (
                     <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                        {unreadCount > 9 ? "+9" : unreadCount}
                     </span>
                  )}
               </div>
               {unreadCount > 0 && (
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={markAllAsRead}
                     className="gap-2"
                  >
                     <CheckCheck className="size-4" />
                     Marcar todas como leídas
                  </Button>
               )}
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Centro de notificaciones del sistema
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Content */}
         {loading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-sm text-muted-foreground">
               <Loader2 className="size-5 animate-spin text-brand-blue" />
               Cargando notificaciones…
            </div>
         ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-16 text-center">
               <Bell className="size-12 text-muted-foreground/40" />
               <div>
                  <p className="text-base font-medium text-muted-foreground">Sin notificaciones</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                     Aquí aparecerán tus notificaciones cuando las recibas.
                  </p>
               </div>
            </div>
         ) : (
            <div className="flex flex-col gap-2">
               {notifications.map((n) => (
                  <NotificationCard
                     key={n.id}
                     notification={n}
                     onMarkRead={markAsRead}
                  />
               ))}
            </div>
         )}
         </div>
      </PermissionGuard>
   );
}

function NotificationCard({
   notification: n,
   onMarkRead,
}: {
   notification: Notification;
   onMarkRead: (id: string) => void;
}) {
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
                  <Check className="size-4" />
                  <span className="sr-only">Marcar como leída</span>
               </Button>
            )}
         </div>
      </div>
   );
}
