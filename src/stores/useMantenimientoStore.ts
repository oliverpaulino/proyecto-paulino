import { create } from "zustand";
import type {
   CloseMantenimientoForm,
   CreateMantenimientoForm,
   Mantenimiento,
   UpdateMantenimientoForm,
} from "@/dtos/mantenimiento.dto";

type MantenimientoFilters = {
   page?: number;
   limit?: number;
   search?: string;
   equipo_id?: string;
   estado?: string;
   tipo?: string;
   force?: boolean;
};

type MantenimientoStore = {
   Mantenimientos: Mantenimiento[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetMantenimientos: (params?: MantenimientoFilters) => Promise<void>;
   GetMantenimientosByEquipo: (equipoId: string) => Promise<Mantenimiento[]>;
   GetMantenimientoAbierto: (equipoId: string) => Promise<Mantenimiento | null>;
   CreateMantenimiento: (form: CreateMantenimientoForm) => Promise<Mantenimiento | Error>;
   UpdateMantenimiento: (
      id: string,
      data: UpdateMantenimientoForm
   ) => Promise<Mantenimiento | Error>;
   CloseMantenimiento: (
      id: string,
      data: CloseMantenimientoForm
   ) => Promise<Mantenimiento | Error>;
   DeleteMantenimiento: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const useMantenimientoStore = create<MantenimientoStore>((set, get) => ({
   Mantenimientos: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetMantenimientos: async ({
      page = 1,
      limit = 50,
      search = "",
      equipo_id = "",
      estado = "",
      tipo = "",
      force = false,
   }: MantenimientoFilters = {}) => {
      const cacheKey = `all_${search}_${equipo_id}_${estado}_${tipo}_${page}_${limit}`;
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
         if (search) qs.set("search", search);
         if (equipo_id) qs.set("equipo_id", equipo_id);
         if (estado) qs.set("estado", estado);
         if (tipo) qs.set("tipo", tipo);

         const res = await fetch(`/api/mantenimientos?${qs.toString()}`);
         if (!res.ok) throw new Error("Error al cargar mantenimientos");

         const data: Mantenimiento[] = await res.json();

         set((state) => ({
            Mantenimientos: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching mantenimientos:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetMantenimientosByEquipo: async (equipoId) => {
      try {
         const res = await fetch(`/api/equipos/${equipoId}/mantenimientos`);
         if (!res.ok) throw new Error("Error al cargar mantenimientos del equipo");
         return (await res.json()) as Mantenimiento[];
      } catch (error) {
         console.error("Error fetching mantenimientos del equipo:", error);
         return [];
      }
   },

   GetMantenimientoAbierto: async (equipoId) => {
      try {
         const res = await fetch(`/api/equipos/${equipoId}/mantenimiento-abierto`);
         if (!res.ok) throw new Error("Error al cargar el mantenimiento abierto");
         const data = await res.json();
         return (data ?? null) as Mantenimiento | null;
      } catch (error) {
         console.error("Error fetching mantenimiento abierto:", error);
         return null;
      }
   },

   CreateMantenimiento: async (form) => {
      try {
         const res = await fetch("/api/mantenimientos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear mantenimiento");

         get().invalidateCache();
         await get().GetMantenimientos({ force: true });
         return data as Mantenimiento;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateMantenimiento: async (id, data) => {
      try {
         const res = await fetch(`/api/mantenimientos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) {
            throw new Error(
               responseData.error || responseData.message || "Error al actualizar mantenimiento"
            );
         }

         get().invalidateCache();
         await get().GetMantenimientos({ force: true });
         return responseData as Mantenimiento;
      } catch (error) {
         return error as Error;
      }
   },

   CloseMantenimiento: async (id, data) => {
      try {
         const res = await fetch(`/api/mantenimientos/${id}/cerrar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) {
            throw new Error(
               responseData.error || responseData.message || "Error al cerrar el mantenimiento"
            );
         }

         get().invalidateCache();
         return responseData as Mantenimiento;
      } catch (error) {
         return error as Error;
      }
   },

   DeleteMantenimiento: async (id) => {
      try {
         const res = await fetch(`/api/mantenimientos/${id}`, { method: "DELETE" });
         const responseData = await res.json();
         if (!res.ok) {
            throw new Error(
               responseData.error || responseData.message || "Error al eliminar mantenimiento"
            );
         }

         get().invalidateCache();
         await get().GetMantenimientos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },
}));
