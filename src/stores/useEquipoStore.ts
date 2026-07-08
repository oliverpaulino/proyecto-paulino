import { create } from "zustand";
import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";
import { Employee, OperadorAsignable } from "@/dtos/employee.dto";
import type { Equipo, EquipoForm, EstadoEquipo, UpdateEquipoForm } from "@/dtos/equipo.dto";

type EquipoStore = {
   Equipos: Equipo[];
   loading: boolean;
   _fetchedLists: Set<string>;


   GetEquipos: (params?: { page?: number; limit?: number; search?: string; force?: boolean }) => Promise<void>;
   CreateEquipo: (form: EquipoForm) => Promise<Equipo | Error>;
   UpdateEquipo: (id: string, data: Partial<UpdateEquipoForm>) => Promise<void | Error>;
   DeleteEquipo: (id: string) => Promise<void | Error>;
   GetCategoriasEquipoByEquipoId: (id: string) => Promise<CategoriaEquipo>;
   GetOperadorByEquipoId: (id: string) => Promise<OperadorAsignable | null>;
   ChangeEstado: (id: string, estado: EstadoEquipo, nota?: string) => Promise<Equipo | Error>;
   invalidateCache: () => void;
};

export const useEquipoStore = create<EquipoStore>((set, get) => ({
   Equipos: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetEquipos: async ({ page = 1, limit = 10, search = "", force = false } = {}) => {
      const cacheKey = `all_${search}_${page}_${limit}`;
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`/api/equipos?page=${page}&limit=${limit}&search=${search}`);
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

   GetCategoriasEquipoByEquipoId: async (id) => {
      try {
         const res = await fetch(`/api/equipos/${id}/categorias`);
         if (!res.ok) throw new Error("Error al cargar categorías de equipo");
         const data = await res.json();
         return data;
         // Aquí podrías hacer algo con los datos obtenidos, como almacenarlos en el estado si es necesario.
      } catch (error) {
         console.error("Error fetching categorias de equipo:", error);
         throw error;
      }
   },

   GetOperadorByEquipoId: async (id) => {
      try {
         const res = await fetch(`/api/equipos/${id}/operador`);
         console.log("estatus", res.ok)
         if (!res.ok) throw new Error("Error al cargar operador del equipo");
         const data = await res.json();
         return data;
      } catch (error) {
         console.error("Error fetching operador de equipo:", error);
         throw error;
      }
   },
   ChangeEstado: async (id, estado, nota) => {
      try {
         const res = await fetch(`/api/equipos/${id}/estado`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado, nota }),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al cambiar el estado");

         // Keep the cached list consistent (the list holds its own copy of estado).
         get().invalidateCache();
         return data as Equipo;
      } catch (error) {
         return error as Error;
      }
   },
}));
