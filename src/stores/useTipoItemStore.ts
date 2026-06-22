import { create } from "zustand";
import type { TipoItem, TipoItemForm, UpdateTipoItemForm } from "@/dtos/tipo-item.dto";

type TipoItemStore = {
   TipoItems: TipoItem[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetTipoItems: (params?: { force?: boolean }) => Promise<void>;
   CreateTipoItem: (form: TipoItemForm) => Promise<TipoItem | Error>;
   UpdateTipoItem: (id: string, data: Partial<UpdateTipoItemForm>) => Promise<void | Error>;
   DeleteTipoItem: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const useTipoItemStore = create<TipoItemStore>((set, get) => ({
   TipoItems: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetTipoItems: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/tipo-items");
         if (!res.ok) throw new Error("Error al cargar categorías");

         const data: TipoItem[] = await res.json();

         set((state) => ({
            TipoItems: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching tipo_item:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateTipoItem: async (form) => {
      try {
         const res = await fetch("/api/tipo-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear categoría");

         get().invalidateCache();
         await get().GetTipoItems();
         return data as TipoItem;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateTipoItem: async (id, data) => {
      try {
         const res = await fetch(`/api/tipo-items/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al actualizar categoría");

         get().invalidateCache();
         await get().GetTipoItems();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteTipoItem: async (id) => {
      try {
         const res = await fetch(`/api/tipo-items/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al eliminar categoría");

         get().invalidateCache();
         await get().GetTipoItems();
      } catch (error) {
         return error as Error;
      }
   },
}));
