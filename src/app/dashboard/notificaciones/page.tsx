"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { PermissionGuard } from "@/components/permission-guard";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { PageSizeSelector } from "@/components/page-size-selector";
import NotificationCard from "./components/NotificationCard";

const TIPO_OPTIONS: { value: string; label: string }[] = [
   { value: "PURCHASE_ORDER_REVIEW", label: "Orden de Compra" },
   { value: "PURCHASE_ORDER_DELETED", label: "Orden Eliminada" },
   { value: "PURCHASE_ORDER_RESTORED", label: "Orden Restaurada" },
   { value: "PAYROLL_CLOSED", label: "Nómina" },
   { value: "TASK_ASSIGNED", label: "Tarea" },
   { value: "GENERAL", label: "General" },
];

const ESTADO_OPTIONS: { value: "LEIDA" | "NO_LEIDA"; label: string }[] = [
   { value: "NO_LEIDA", label: "No leídas" },
   { value: "LEIDA", label: "Leídas" },
];

export default function NotificacionesPage() {
   const {
      notifications,
      total,
      unreadCount,
      loading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
   } = useNotificationStore();

   const [pageActual, setPage] = useState(1);
   const [pageSize, setPageSize] = useState(10);
   const [tipo, setTipo] = useState<string | undefined>(undefined);
   const [estado, setEstado] = useState<"LEIDA" | "NO_LEIDA" | undefined>(undefined);

   useEffect(() => {
      document.title = "Notificaciones";
      fetchNotifications({ page: pageActual, pageSize, tipo, estado });
      fetchUnreadCount();
   }, [fetchNotifications, fetchUnreadCount, pageActual, pageSize, tipo, estado]);

   const hayFiltros = !!tipo || !!estado;

   function handleTipoChange(value: string) {
      setTipo(value || undefined);
      setPage(1);
   }

   function handleEstadoChange(value: string) {
      setEstado((value as "LEIDA" | "NO_LEIDA") || undefined);
      setPage(1);
   }

   function handlePageSizeChange(value: number) {
      setPageSize(value);
      setPage(1);
   }

   async function handleMarkAllRead() {
      await markAllAsRead();
      await fetchNotifications({ page: pageActual, pageSize, tipo, estado });
   }

   return (
      <PermissionGuard resource="features" action="read" mode="page">
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
                        onClick={handleMarkAllRead}
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

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
               <Select value={tipo ?? ""} onValueChange={handleTipoChange}>
                  <SelectTrigger className="h-9 w-[200px]">
                     <SelectValue placeholder="Tipo: todos" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="">Tipo: todos</SelectItem>
                     {TIPO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                           {opt.label}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>

               <Select value={estado ?? ""} onValueChange={handleEstadoChange}>
                  <SelectTrigger className="h-9 w-[160px]">
                     <SelectValue placeholder="Estado: todos" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="">Estado: todos</SelectItem>
                     {ESTADO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                           {opt.label}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>

               {hayFiltros && (
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => {
                        setTipo(undefined);
                        setEstado(undefined);
                        setPage(1);
                     }}
                  >
                     Limpiar filtros
                  </Button>
               )}
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
                     <p className="text-base font-medium text-muted-foreground">
                        {hayFiltros ? "Sin resultados" : "Sin notificaciones"}
                     </p>
                     <p className="mt-1 text-sm text-muted-foreground/70">
                        {hayFiltros
                           ? "Ninguna notificación coincide con los filtros seleccionados."
                           : "Aquí aparecerán tus notificaciones cuando las recibas."}
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

            {/* Paginación */}
            {total > 0 && (() => {
               const totalPages = Math.max(1, Math.ceil(total / pageSize));
               return (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
                     <PageSizeSelector value={pageSize} onChange={handlePageSizeChange} />

                     <div className="flex items-center gap-4">
                        <span>
                           Mostrando {(pageActual - 1) * pageSize + 1}–
                           {Math.min(pageActual * pageSize, total)} de {total}
                        </span>
                        <div className="flex gap-2">
                           <Button
                              variant="outline"
                              size="sm"
                              disabled={pageActual <= 1}
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                           >
                              <ChevronLeft className="size-4" /> Anterior
                           </Button>
                           <Button
                              variant="outline"
                              size="sm"
                              disabled={pageActual >= totalPages}
                              onClick={() => setPage((p) => p + 1)}
                           >
                              Siguiente <ChevronRight className="size-4" />
                           </Button>
                        </div>
                     </div>
                  </div>
               );
            })()}
         </div>
      </PermissionGuard>
   );
}
