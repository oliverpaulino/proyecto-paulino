import { create } from "zustand";
import type {
   Pago,
   CreatePagoForm,
   UpdatePagoForm,
   DeletePagoForm,
} from "@/dtos/pagos.dto";

type PagosFilters = {
   search?: string;
   start?: string;
   end?: string;
   gasto_empresa_id?: string;
   costo_cliente_id?: string;
   deduccion_empleado_id?: string;
   proveedor_id?: string;
};

type PagoStore = {
   Pagos: Pago[];
   DeletedPagos: Pago[];
   selectedPago: Pago | null;
   loading: boolean;
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
   };

   currentFilters: PagosFilters;

   _fetchedPagoLists: Set<string>;
   _fetchedDeletedLists: Set<string>;

   GetPagos: (params?: PagosFilters & { page?: number; limit?: number; force?: boolean }) => Promise<void>;
   GetPagosByOrdenCompra: (ordenCompraId: string, params?: { limit?: number; force?: boolean }) => Promise<void>;
   GetDeletedPagos: (params?: PagosFilters & { page?: number; limit?: number; force?: boolean }) => Promise<void>;

   CreatePago: (form: CreatePagoForm) => Promise<Pago | Error>;
   UpdatePago: (id: string, data: UpdatePagoForm) => Promise<void | Error>;
   DeletePago: (id: string, data: DeletePagoForm) => Promise<void | Error>;
   RestorePago: (id: string) => Promise<void | Error>;

   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;

   setSelectedPago: (pago: Pago | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedPago: () => void;
   invalidateCache: () => void;
};

const BASE_URL = "/api/pagos";

export const usePagoStore = create<PagoStore>((set, get) => ({
   Pagos: [],
   DeletedPagos: [],
   selectedPago: null,
   loading: false,
   pagination: {
      page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false,
   },
   currentFilters: {},
   _fetchedPagoLists: new Set<string>(),
   _fetchedDeletedLists: new Set<string>(),

   invalidateCache: () => {
      set({ 
         _fetchedPagoLists: new Set<string>(),
         _fetchedDeletedLists: new Set<string>() 
      });
   },

   GetPagos: async (params = {}) => {
      const { page = 1, limit = 20, force = false, ...filters } = params;
      const appliedFilters = { ...get().currentFilters, ...filters };
      
      set({ currentFilters: appliedFilters });

      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      Object.entries(appliedFilters).forEach(([key, val]) => {
         if (val) query.append(key, val);
      });

      const cacheKey = query.toString();
      if (!force && get()._fetchedPagoLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`${BASE_URL}?${query.toString()}`);
         if (!res.ok) throw new Error("Error al cargar pagos");

         const items: Pago[] = await res.json();
         const totalPages = Math.max(1, Math.ceil(items.length / limit));

         set((s) => ({
            Pagos: items,
            pagination: {
               page, limit, total: items.length, totalPages,
               hasNext: page < totalPages, hasPrev: page > 1,
            },
            _fetchedPagoLists: new Set(s._fetchedPagoLists).add(cacheKey),
         }));
      } catch (error) {
         console.error(error);
      } finally {
         set({ loading: false });
      }
   },

   GetDeletedPagos: async (params = {}) => {
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
         if (!res.ok) throw new Error("Error al cargar pagos anulados");

         const items: Pago[] = await res.json();
         const totalPages = Math.max(1, Math.ceil(items.length / limit));

         set((s) => ({
            DeletedPagos: items,
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

   GetPagosByOrdenCompra: async (ordenCompraId, { limit = 50, force = false } = {}) => {
      const cacheKey = `orden-${ordenCompraId}-${limit}`;
      if (!force && get()._fetchedPagoLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`${BASE_URL}?orden_compra_id=${ordenCompraId}&limit=${limit}`);
         if (!res.ok) throw new Error("Error al cargar pagos de la orden");

         const items: Pago[] = await res.json();
         set((s) => ({
            Pagos: items,
            _fetchedPagoLists: new Set(s._fetchedPagoLists).add(cacheKey),
         }));
      } catch (error) {
         console.error(error);
      } finally {
         set({ loading: false });
      }
   },

   CreatePago: async (form) => {
      try {
         const res = await fetch(BASE_URL, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error?.concepto?._errors?.[0] || data.error || "Error al crear pago");

         get().invalidateCache();
         await get().GetPagos({ force: true });
         return data as Pago;
      } catch (error) {
         return error as Error;
      }
   },

   UpdatePago: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
         });
         const resultData = await res.json();
         if (!res.ok) throw new Error(resultData.error?.concepto?._errors?.[0] || resultData.error || "Error al actualizar");

         get().invalidateCache();
         await get().GetPagos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   DeletePago: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, { 
            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar");

         get().invalidateCache();
         await get().GetPagos({ force: true });
         get().clearSelectedPago();
      } catch (error) {
         return error as Error;
      }
   },

   RestorePago: async (id) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}/restore`, { 
            method: "PATCH" 
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al restaurar");

         get().invalidateCache();
         await get().GetPagos({ force: true });
         await get().GetDeletedPagos({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) await get().GetPagos({ page: pagination.page + 1, limit: pagination.limit });
   },
   
   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) await get().GetPagos({ page: pagination.page - 1, limit: pagination.limit });
   },
   
   GoToPage: async (page) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) await get().GetPagos({ page, limit: pagination.limit });
   },

   setSelectedPago: (pago) => set({ selectedPago: pago }),
   setLoading: (loading) => set({ loading }),
   clearSelectedPago: () => set({ selectedPago: null }),
}));