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

type NotificationStore = {
   notifications: Notification[];
   unreadCount: number;
   loading: boolean;

   fetchNotifications: () => Promise<void>;
   fetchUnreadCount: () => Promise<void>;
   markAsRead: (id: string) => Promise<void>;
   markAllAsRead: () => Promise<void>;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
   notifications: [],
   unreadCount: 0,
   loading: false,

   fetchNotifications: async () => {
      set({ loading: true });
      try {
         const res = await fetch("/api/notifications");
         if (!res.ok) return;
         const data: Notification[] = await res.json();
         set({
            notifications: data,
            unreadCount: data.filter((n) => !n.is_read).length,
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
}));
