import { create } from "zustand";
import type { Servicio, ServicioForm, UpdateServicioForm } from "@/dtos/service.dto";

type ServiceStore = {
   Services: Servicio[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetServices: (params?: { force?: boolean }) => Promise<void>;
   CreateService: (form: ServicioForm) => Promise<Servicio | Error>;
   UpdateService: (id: string, data: Partial<UpdateServicioForm>) => Promise<void | Error>;
   DeleteService: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const useServiceStore = create<ServiceStore>((set, get) => ({
   Services: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetServices: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/services");
         if (!res.ok) throw new Error("Error al cargar servicios");

         const data: Servicio[] = await res.json();

         set((state) => ({
            Services: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching services:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateService: async (form) => {
      try {
         const res = await fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear servicio");

         get().invalidateCache();
         await get().GetServices();
         return data as Servicio;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateService: async (id, data) => {
      try {
         const res = await fetch(`/api/services/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al actualizar servicio");

         get().invalidateCache();
         await get().GetServices();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteService: async (id) => {
      try {
         const res = await fetch(`/api/services/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al eliminar servicio");

         get().invalidateCache();
         await get().GetServices();
      } catch (error) {
         return error as Error;
      }
   },
}));
