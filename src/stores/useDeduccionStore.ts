import { create } from "zustand";
import type {
   Deduccion,
   CreateDeduccionForm,
   UpdateDeduccionForm,
   DeleteDeduccionForm,
   PagarDeduccionForm,
} from "@/dtos/deducciones.dto";

type DeduccionesFilters = {
   search?: string;
   start?: string;
   end?: string;
   empleado_id?: string;
   equipo_id?: string;
};

type DeduccionStore = {
   Deducciones: Deduccion[];
   DeletedDeducciones: Deduccion[];
   selectedDeduccion: Deduccion | null;
   loading: boolean;
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
   };

   currentFilters: DeduccionesFilters;

   _fetchedDeduccionLists: Set<string>;
   _fetchedDeletedLists: Set<string>;

   GetDeducciones: (params?: DeduccionesFilters & { page?: number; limit?: number; force?: boolean }) => Promise<void>;
   GetDeletedDeducciones: (params?: DeduccionesFilters & { page?: number; limit?: number; force?: boolean }) => Promise<void>;
   GetDeduccionById: (id: string) => Promise<Deduccion | null>;

   CreateDeduccion: (form: CreateDeduccionForm) => Promise<Deduccion | Error>;
   UpdateDeduccion: (id: string, data: UpdateDeduccionForm) => Promise<void | Error>;
   DeleteDeduccion: (id: string, data: DeleteDeduccionForm) => Promise<void | Error>;
   RestoreDeduccion: (id: string) => Promise<void | Error>;
   PagarDeduccion: (id: string, data: PagarDeduccionForm) => Promise<Deduccion | Error>;

   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;

   setSelectedDeduccion: (deduccion: Deduccion | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedDeduccion: () => void;
   invalidateCache: () => void;
};

const BASE_URL = "/api/deducciones";

export const useDeduccionStore = create<DeduccionStore>((set, get) => ({
   Deducciones: [],
   DeletedDeducciones: [],
   selectedDeduccion: null,
   loading: false,
   pagination: {
      page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false,
   },
   currentFilters: {},
   _fetchedDeduccionLists: new Set<string>(),
   _fetchedDeletedLists: new Set<string>(),

   invalidateCache: () => {
      set({ 
         _fetchedDeduccionLists: new Set<string>(),
         _fetchedDeletedLists: new Set<string>() 
      });
   },

   GetDeducciones: async (params = {}) => {
      const { page = 1, limit = 20, force = false, ...filters } = params;
      const appliedFilters = { ...get().currentFilters, ...filters };
      
      set({ currentFilters: appliedFilters });

      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      Object.entries(appliedFilters).forEach(([key, val]) => {
         if (val) query.append(key, val);
      });

      const cacheKey = query.toString();
      if (!force && get()._fetchedDeduccionLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`${BASE_URL}?${query.toString()}`);
         if (!res.ok) throw new Error("Error al cargar deducciones");

         const result: { data: Deduccion[]; total: number; page: number; limit: number; totalPages: number } = await res.json();
         const totalPages = Math.max(1, result.totalPages);

         set((s) => ({
            Deducciones: result.data,
            pagination: {
               page: result.page, limit: result.limit, total: result.total, totalPages,
               hasNext: result.page < totalPages, hasPrev: result.page > 1,
            },
            _fetchedDeduccionLists: new Set(s._fetchedDeduccionLists).add(cacheKey),
         }));
      } catch (error) {
         console.error(error);
      } finally {
         set({ loading: false });
      }
   },

   GetDeletedDeducciones: async (params = {}) => {
      const { page = 1, limit = 20, force = false, ...filters } = params;
      const appliedFilters = { ...get().currentFilters, ...filters };
      
      set({ currentFilters: appliedFilters });

      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      Object.entries(appliedFilters).forEach(([key, val]) => {
         if (val) query.append(key, val);
      });

      const cacheKey = query.toString();
      if (!force && get()._fetchedDeletedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`${BASE_URL}/deleted?${query.toString()}`);
         if (!res.ok) throw new Error("Error al cargar deducciones eliminadas");

         const result: { data: Deduccion[]; total: number; page: number; limit: number; totalPages: number } = await res.json();
         const totalPages = Math.max(1, result.totalPages);

         set((s) => ({
            DeletedDeducciones: result.data,
            pagination: {
               page: result.page, limit: result.limit, total: result.total, totalPages,
               hasNext: result.page < totalPages, hasPrev: result.page > 1,
            },
            _fetchedDeletedLists: new Set(s._fetchedDeletedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error(error);
      } finally {
         set({ loading: false });
      }
   },

   GetDeduccionById: async (id) => {
      set({ loading: true });
      try {
         const res = await fetch(`${BASE_URL}/${id}`);
         if (!res.ok) throw new Error("Error al cargar deducción");
         const data: Deduccion = await res.json();
         set({ selectedDeduccion: data });
         return data;
      } catch (error) {
         console.error(error);
         return null;
      } finally {
         set({ loading: false });
      }
   },

   CreateDeduccion: async (form) => {
      try {
         const res = await fetch(BASE_URL, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear deducción");

         get().invalidateCache();
         await get().GetDeducciones({ force: true });
         return data as Deduccion;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateDeduccion: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar");

         get().invalidateCache();
         await get().GetDeducciones({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   DeleteDeduccion: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, { 
            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar");

         get().invalidateCache();
         await get().GetDeducciones({ force: true });
         get().clearSelectedDeduccion();
      } catch (error) {
         return error as Error;
      }
   },

   RestoreDeduccion: async (id) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}/restore`, { 
            method: "PATCH" 
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al restaurar");

         get().invalidateCache();
         await get().GetDeducciones({ force: true });
         await get().GetDeletedDeducciones({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   PagarDeduccion: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}/pagar`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
         });
         const result = await res.json();
         if (!res.ok) throw new Error(result.error || "Error al registrar el pago");

         get().invalidateCache();
         await get().GetDeducciones({ force: true });
         return result as Deduccion;
      } catch (error) {
         return error as Error;
      }
   },

   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) await get().GetDeducciones({ page: pagination.page + 1, limit: pagination.limit });
   },
   
   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) await get().GetDeducciones({ page: pagination.page - 1, limit: pagination.limit });
   },
   
   GoToPage: async (page) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) await get().GetDeducciones({ page, limit: pagination.limit });
   },

   setSelectedDeduccion: (deduccion) => set({ selectedDeduccion: deduccion }),
   setLoading: (loading) => set({ loading }),
   clearSelectedDeduccion: () => set({ selectedDeduccion: null }),
}));