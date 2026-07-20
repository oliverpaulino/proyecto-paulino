import { create } from "zustand";
import type {
   Costo,
   CreateCostoForm,
   UpdateCostoForm,
   DeleteCostoForm,
} from "@/dtos/costos.dto";

type CostosFilters = {
   search?: string;
   start?: string;
   end?: string;
   proyecto_id?: string;
   orden_compra_id?: string;
};

type CostoStore = {
   Costos: Costo[];
   DeletedCostos: Costo[];
   selectedCosto: Costo | null;
   loading: boolean;
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
   };

   currentFilters: CostosFilters;

   _fetchedCostoLists: Set<string>;
   _fetchedDeletedLists: Set<string>;

   GetCostos: (params?: CostosFilters & { page?: number; limit?: number; force?: boolean }) => Promise<void>;
   GetDeletedCostos: (params?: CostosFilters & { page?: number; limit?: number; force?: boolean }) => Promise<void>;

   CreateCosto: (form: CreateCostoForm) => Promise<Costo | Error>;
   UpdateCosto: (id: string, data: UpdateCostoForm) => Promise<void | Error>;
   DeleteCosto: (id: string, data: DeleteCostoForm) => Promise<void | Error>;
   RestoreCosto: (id: string) => Promise<void | Error>;

   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;

   setSelectedCosto: (costo: Costo | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedCosto: () => void;
   invalidateCache: () => void;
};

const BASE_URL = "/api/costos";

export const useCostoStore = create<CostoStore>((set, get) => ({
   Costos: [],
   DeletedCostos: [],
   selectedCosto: null,
   loading: false,
   pagination: {
      page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false,
   },
   currentFilters: {},
   _fetchedCostoLists: new Set<string>(),
   _fetchedDeletedLists: new Set<string>(),

   invalidateCache: () => {
      set({ 
         _fetchedCostoLists: new Set<string>(),
         _fetchedDeletedLists: new Set<string>() 
      });
   },

   GetCostos: async (params = {}) => {
      const { page = 1, limit = 20, force = false, ...filters } = params;
      const appliedFilters = { ...get().currentFilters, ...filters };
      
      set({ currentFilters: appliedFilters });

      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      Object.entries(appliedFilters).forEach(([key, val]) => {
         if (val) query.append(key, val);
      });

      const cacheKey = query.toString();
      if (!force && get()._fetchedCostoLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`${BASE_URL}?${query.toString()}`);
         if (!res.ok) throw new Error("Error al cargar costos");

         const items: Costo[] = await res.json();
         const totalPages = Math.max(1, Math.ceil(items.length / limit));

         set((s) => ({
            Costos: items,
            pagination: {
               page, limit, total: items.length, totalPages,
               hasNext: page < totalPages, hasPrev: page > 1,
            },
            _fetchedCostoLists: new Set(s._fetchedCostoLists).add(cacheKey),
         }));
      } catch (error) {
         console.error(error);
      } finally {
         set({ loading: false });
      }
   },

   GetDeletedCostos: async (params = {}) => {
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
         if (!res.ok) throw new Error("Error al cargar costos eliminados");

         const items: Costo[] = await res.json();
         const totalPages = Math.max(1, Math.ceil(items.length / limit));

         set((s) => ({
            DeletedCostos: items,
            pagination: {
               page, limit, total: items.length, totalPages,
               hasNext: page < totalPages, hasPrev: page > 1,
            },
            _fetchedDeletedLists: new Set(s._fetchedDeletedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error(error);
      } finally {
         set({ loading: false });
      }
   },

   CreateCosto: async (form) => {
      try {
         const res = await fetch(BASE_URL, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear costo");

         get().invalidateCache();
         await get().GetCostos({ force: true });
         return data as Costo;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateCosto: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar");

         get().invalidateCache();
         await get().GetCostos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   DeleteCosto: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, { 
            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar");

         get().invalidateCache();
         await get().GetCostos({ force: true });
         get().clearSelectedCosto();
      } catch (error) {
         return error as Error;
      }
   },

   RestoreCosto: async (id) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}/restore`, { 
            method: "PATCH" 
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al restaurar");

         get().invalidateCache();
         await get().GetCostos({ force: true });
         await get().GetDeletedCostos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) await get().GetCostos({ page: pagination.page + 1, limit: pagination.limit });
   },
   
   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) await get().GetCostos({ page: pagination.page - 1, limit: pagination.limit });
   },
   
   GoToPage: async (page) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) await get().GetCostos({ page, limit: pagination.limit });
   },

   setSelectedCosto: (costo) => set({ selectedCosto: costo }),
   setLoading: (loading) => set({ loading }),
   clearSelectedCosto: () => set({ selectedCosto: null }),
}));