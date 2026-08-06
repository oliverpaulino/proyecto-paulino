import { create } from "zustand";

export interface Notification {
   id: string;
   user_id: string;
   title: string;
   message: string;
   type: string;
   reference_id: string | null;
   reference_type: string | null;
   is_read: boolean;
   created_at: string;
   read_at: string | null;
}

export interface NotificationFetchParams {
   page?: number;
   pageSize?: number;
   tipo?: string;
   estado?: "LEIDA" | "NO_LEIDA";
}

export interface NotificationPaginated {
   data: Notification[];
   total: number;
   page: number;
   pageSize: number;
   totalPages: number;
}

type NotificationStore = {
   notifications: Notification[];
   total: number;
   page: number;
   pageSize: number;
   totalPages: number;
   unreadCount: number;
   loading: boolean;
   deleteLoading: boolean;

   fetchNotifications: (params?: NotificationFetchParams) => Promise<void>;
   fetchUnreadCount: () => Promise<void>;
   markAsRead: (id: string) => Promise<void>;
   markAllAsRead: () => Promise<void>;
   deleteNotification: (id: string) => Promise<void>;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
   notifications: [],
   total: 0,
   page: 1,
   pageSize: 10,
   totalPages: 1,
   unreadCount: 0,
   loading: false,
   deleteLoading: false,
   fetchNotifications: async (params = {}) => {
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      set({ loading: true });
      try {
         const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
         if (params.tipo) qs.set("tipo", params.tipo);
         if (params.estado) qs.set("estado", params.estado);

         const res = await fetch(`/api/notifications?${qs.toString()}`);
         if (!res.ok) return;
         const data: NotificationPaginated = await res.json();
         set({
            notifications: data.data,
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
            totalPages: data.totalPages,
         });
      } catch {
         // silent
      } finally {
         set({ loading: false });
      }
   },

   fetchUnreadCount: async () => {
      try {
         const res = await fetch("/api/notifications/unread-count");
         if (!res.ok) return;
         const data = (await res.json()) as { count: number };
         set({ unreadCount: data.count });
      } catch {
         // silent
      }
   },

   markAsRead: async (id: string) => {
      try {
         const res = await fetch(`/api/notifications/${id}/read`, {
            method: "PATCH",
         });
         if (!res.ok) return;
         set((state) => ({
            notifications: state.notifications.map((n) =>
               n.id === id ? { ...n, is_read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
         }));
      } catch {
         // silent
      }
   },

   markAllAsRead: async () => {
      try {
         const res = await fetch("/api/notifications/read-all", {
            method: "PATCH",
         });
         if (!res.ok) return;
         set((state) => ({
            notifications: state.notifications.map((n) => ({
               ...n,
               is_read: true,
            })),
            unreadCount: 0,
         }));
      } catch {
         // silent
      }
   },

   deleteNotification: async (id: string) => {
      try {
         set((state) => ({ ...state, deleteLoading: true }));
         const res = await fetch(`/api/notifications/${id}`, {
            method: "DELETE",
         });
         if (!res.ok) return;
         set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: Math.max(
               0,
               state.unreadCount - (state.notifications.find((n) => n.id === id)?.is_read ? 0 : 1)
            ),
         }));
         // loading: false;
      } catch {
         set((state) => ({ ...state, deleteLoading: false }));
         // silent
      }
      finally {
         set((state) => ({ ...state, deleteLoading: false }));
      }
   }
}));
