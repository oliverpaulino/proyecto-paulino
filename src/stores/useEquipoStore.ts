import { create } from "zustand";
import type { Equipo, EquipoForm, UpdateEquipoForm } from "@/dtos/equipo.dto";

type EquipoStore = {
   Equipos: Equipo[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetEquipos: (params?: { force?: boolean }) => Promise<void>;
   CreateEquipo: (form: EquipoForm) => Promise<Equipo | Error>;
   UpdateEquipo: (id: string, data: Partial<UpdateEquipoForm>) => Promise<void | Error>;
   DeleteEquipo: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const useEquipoStore = create<EquipoStore>((set, get) => ({
   Equipos: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetEquipos: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/equipos");
         if (!res.ok) throw new Error("Error al cargar equipos");

         const data: Equipo[] = await res.json();

         set((state) => ({
            Equipos: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching equipos:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateEquipo: async (form) => {
      try {
         const res = await fetch("/api/equipos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear equipo");

         get().invalidateCache();
         await get().GetEquipos();
         return data as Equipo;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateEquipo: async (id, data) => {
      try {
         const res = await fetch(`/api/equipos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al actualizar equipo");

         get().invalidateCache();
         await get().GetEquipos();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteEquipo: async (id) => {
      try {
         const res = await fetch(`/api/equipos/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al eliminar equipo");

         get().invalidateCache();
         await get().GetEquipos();
      } catch (error) {
         return error as Error;
      }
   },
}));
