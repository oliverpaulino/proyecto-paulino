import { create } from "zustand";
import type {
   Gasto,
   CreateGastoForm,
   UpdateGastoForm,
   DeleteGastoForm,
   MoveCobrableForm,
} from "@/dtos/gastos.dto";

type GastosFilters = {
   search?: string;
   start?: string;
   end?: string;
   categoria?: string;
   grupo?: string;
   orden_compra_id?: string;
   proyecto_id?: string;
   equipo_id?: string;
   cobrable_proyecto?: boolean;
};

type GastoStore = {
   Gastos: Gasto[];
   DeletedGastos: Gasto[];
   selectedGasto: Gasto | null;
   loading: boolean;
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
   };

   currentFilters: GastosFilters;

   _fetchedGastoLists: Set<string>;
   _fetchedDeletedLists: Set<string>;

   GetGastos: (params?: GastosFilters & { page?: number; limit?: number; force?: boolean }) => Promise<void>;
   GetDeletedGastos: (params?: GastosFilters & { page?: number; limit?: number; force?: boolean }) => Promise<void>;

   CreateGasto: (form: CreateGastoForm) => Promise<Gasto | Error>;
   UpdateGasto: (id: string, data: UpdateGastoForm) => Promise<void | Error>;
   DeleteGasto: (id: string, data: DeleteGastoForm) => Promise<void | Error>;
   RestoreGasto: (id: string) => Promise<void | Error>;
   MoveCobrable: (id: string, data: MoveCobrableForm) => Promise<void | Error>;

   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;

   setSelectedGasto: (gasto: Gasto | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedGasto: () => void;
   invalidateCache: () => void;
};

const BASE_URL = "/api/gastos";

export const useGastoStore = create<GastoStore>((set, get) => ({
   Gastos: [],
   DeletedGastos: [],
   selectedGasto: null,
   loading: false,
   pagination: {
      page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false,
   },
   currentFilters: {},
   _fetchedGastoLists: new Set<string>(),
   _fetchedDeletedLists: new Set<string>(),

   invalidateCache: () => {
      set({ 
         _fetchedGastoLists: new Set<string>(),
         _fetchedDeletedLists: new Set<string>() 
      });
   },

   GetGastos: async (params = {}) => {
      const { page = 1, limit = 20, force = false, ...filters } = params;
      const appliedFilters = { ...get().currentFilters, ...filters };
      
      set({ currentFilters: appliedFilters });

      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      Object.entries(appliedFilters).forEach(([key, val]) => {
         if (val !== undefined && val !== null && val !== "") query.append(key, String(val));
      });

      const cacheKey = query.toString();
      if (!force && get()._fetchedGastoLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`${BASE_URL}?${query.toString()}`);
         if (!res.ok) throw new Error("Error al cargar gastos");

         const items: Gasto[] = await res.json();
         const totalPages = Math.max(1, Math.ceil(items.length / limit));

         set((s) => ({
            Gastos: items,
            pagination: {
               page, limit, total: items.length, totalPages,
               hasNext: page < totalPages, hasPrev: page > 1,
            },
            _fetchedGastoLists: new Set(s._fetchedGastoLists).add(cacheKey),
         }));
      } catch (error) {
         console.error(error);
      } finally {
         set({ loading: false });
      }
   },

   GetDeletedGastos: async (params = {}) => {
      const { page = 1, limit = 20, force = false, ...filters } = params;
      const appliedFilters = { ...get().currentFilters, ...filters };
      
      set({ currentFilters: appliedFilters });

      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      Object.entries(appliedFilters).forEach(([key, val]) => {
         if (val !== undefined && val !== null && val !== "") query.append(key, String(val));
      });

      const cacheKey = query.toString();
      if (!force && get()._fetchedDeletedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`${BASE_URL}/deleted?${query.toString()}`);
         if (!res.ok) throw new Error("Error al cargar gastos eliminados");

         const items: Gasto[] = await res.json();
         const totalPages = Math.max(1, Math.ceil(items.length / limit));

         set((s) => ({
            DeletedGastos: items,
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

   CreateGasto: async (form) => {
      try {
         const res = await fetch(BASE_URL, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear gasto");

         get().invalidateCache();
         await get().GetGastos({ force: true });
         return data as Gasto;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateGasto: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar");

         get().invalidateCache();
         await get().GetGastos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   DeleteGasto: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, { 
            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar");

         get().invalidateCache();
         await get().GetGastos({ force: true });
         get().clearSelectedGasto();
      } catch (error) {
         return error as Error;
      }
   },

   RestoreGasto: async (id) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}/restore`, { 
            method: "PATCH" 
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al restaurar");

         get().invalidateCache();
         // Refrescamos ambas listas por si el usuario está en la vista de eliminados o en la normal
         await get().GetGastos({ force: true });
         await get().GetDeletedGastos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   MoveCobrable: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}/cobrable`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar cobrabilidad");

         get().invalidateCache();
         await get().GetGastos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) await get().GetGastos({ page: pagination.page + 1, limit: pagination.limit });
   },
   
   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) await get().GetGastos({ page: pagination.page - 1, limit: pagination.limit });
   },
   
   GoToPage: async (page) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) await get().GetGastos({ page, limit: pagination.limit });
   },

   setSelectedGasto: (gasto) => set({ selectedGasto: gasto }),
   setLoading: (loading) => set({ loading }),
   clearSelectedGasto: () => set({ selectedGasto: null }),
}));