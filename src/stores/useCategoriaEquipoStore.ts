import { create } from "zustand";
import type { CategoriaEquipo, CategoriaEquipoForm, UpdateCategoriaEquipoForm } from "@/dtos/categoria-equipo.dto";

type CategoriaEquipoStore = {
   CategoriaEquipos: CategoriaEquipo[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetCategoriaEquipos: (params?: { force?: boolean }) => Promise<void>;
   CreateCategoriaEquipo: (form: CategoriaEquipoForm) => Promise<CategoriaEquipo | Error>;
   UpdateCategoriaEquipo: (id: string, data: Partial<UpdateCategoriaEquipoForm>) => Promise<void | Error>;
   DeleteCategoriaEquipo: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const useCategoriaEquipoStore = create<CategoriaEquipoStore>((set, get) => ({
   CategoriaEquipos: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetCategoriaEquipos: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/categoria-equipos");
         if (!res.ok) throw new Error("Error al cargar categorías de equipos");

         const data: CategoriaEquipo[] = await res.json();

         set((state) => ({
            CategoriaEquipos: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching categoria_equipo:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateCategoriaEquipo: async (form) => {
      try {
         const res = await fetch("/api/categoria-equipos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear categoría");

         get().invalidateCache();
         await get().GetCategoriaEquipos();
         return data as CategoriaEquipo;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateCategoriaEquipo: async (id, data) => {
      try {
         const res = await fetch(`/api/categoria-equipos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al actualizar categoría");

         get().invalidateCache(); // Limpia la caché
         await get().GetCategoriaEquipos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   DeleteCategoriaEquipo: async (id) => {
      try {
         const res = await fetch(`/api/categoria-equipos/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al eliminar categoría");

         get().invalidateCache();
         await get().GetCategoriaEquipos();
      } catch (error) {
         return error as Error;
      }
   },
}));
