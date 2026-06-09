import { create } from "zustand";
import type { Item, ItemForm, UpdateItemForm } from "@/dtos/item.dto";

type ItemStore = {
   Items: Item[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetItems: (params?: { force?: boolean }) => Promise<void>;
   CreateItem: (form: ItemForm) => Promise<Item | Error>;
   UpdateItem: (id: string, data: Partial<UpdateItemForm>) => Promise<void | Error>;
   DeleteItem: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const useItemStore = create<ItemStore>((set, get) => ({
   Items: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetItems: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/items");
         if (!res.ok) throw new Error("Error al cargar items");

         const data: Item[] = await res.json();

         set((state) => ({
            Items: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching items:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateItem: async (form) => {
      try {
         const res = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear item");

         get().invalidateCache();
         await get().GetItems();
         return data as Item;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateItem: async (id, data) => {
      try {
         const res = await fetch(`/api/items/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al actualizar item");

         get().invalidateCache();
         await get().GetItems();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteItem: async (id) => {
      try {
         const res = await fetch(`/api/items/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al eliminar item");

         get().invalidateCache();
         await get().GetItems();
      } catch (error) {
         return error as Error;
      }
   },
}));
