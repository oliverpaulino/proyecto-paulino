"use client";

import { useEffect } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/useNotificationStore";
import NotificationCard from "./components/NotificationCard";




export default function NotificacionesPage() {
   const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } =
      useNotificationStore();

   useEffect(() => {
      fetchNotifications();
   }, [fetchNotifications]);

   return (
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
   );
}
