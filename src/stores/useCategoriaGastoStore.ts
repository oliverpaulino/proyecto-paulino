import { create } from "zustand";
import type {
   CategoriaGasto,
   CreateCategoriaGastoForm,
   UpdateCategoriaGastoForm,
   GrupoGasto,
} from "@/dtos/categoria-gasto.dto";

type CategoriaGastoStore = {
   Categorias: CategoriaGasto[];
   allFetchedCategorias: CategoriaGasto[];
   selectedCategoria: CategoriaGasto | null;
   loading: boolean;
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
   };

   currentFilters: {
      search: string;
      grupo?: GrupoGasto;
   };

   _fetchedCategoriaLists: Set<string>;

   GetCategorias: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      grupo?: GrupoGasto;
      force?: boolean;
   }) => Promise<void>;

   CreateCategoria: (form: CreateCategoriaGastoForm) => Promise<CategoriaGasto | Error>;
   UpdateCategoria: (id: string, data: UpdateCategoriaGastoForm) => Promise<void | Error>;
   DeleteCategoria: (id: string) => Promise<void | Error>;

   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;
   SearchCategorias: (search: string, grupo?: GrupoGasto) => Promise<void>;

   setSelectedCategoria: (categoria: CategoriaGasto | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedCategoria: () => void;
   invalidateCache: () => void;
};

const BASE_URL = "/api/categoria-gastos";

export const useCategoriaGastoStore = create<CategoriaGastoStore>((set, get) => ({
   Categorias: [],
   allFetchedCategorias: [],
   selectedCategoria: null,
   loading: false,
   pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
   },
   currentFilters: {
      search: "",
   },
   _fetchedCategoriaLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedCategoriaLists: new Set<string>() });
   },

   GetCategorias: async (params = {}) => {
      const {
         page = 1,
         limit = 20,
         search = get().currentFilters.search,
         grupo = get().currentFilters.grupo,
         force = false,
      } = params;

      set({ currentFilters: { search, grupo } });

      const cacheKey = `${page}:${limit}:${search}:${grupo || ""}`;
      
      if (!force && get()._fetchedCategoriaLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const query = new URLSearchParams();
         query.append("page", String(page));
         query.append("limit", String(limit));
         if (search) query.append("search", search);
         if (grupo) query.append("grupo", grupo);

         const res = await fetch(`${BASE_URL}?${query.toString()}`);
         if (!res.ok) throw new Error("Error al cargar categorías de gasto");

         const items: CategoriaGasto[] = await res.json();
         const total = items.length; // Si en un futuro la API devuelve el count, aquí se ajusta
         const totalPages = Math.max(1, Math.ceil(total / limit));

         set((s) => ({
            Categorias: items,
            allFetchedCategorias: items,
            pagination: {
               page,
               limit,
               total,
               totalPages,
               hasNext: page < totalPages,
               hasPrev: page > 1,
            },
            _fetchedCategoriaLists: new Set(s._fetchedCategoriaLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching categoria gastos:", error);
      } finally {
         set({ loading: false });
      }
   },

   CreateCategoria: async (form) => {
      try {
         const res = await fetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear categoría");

         get().invalidateCache();
         await get().GetCategorias({ force: true });
         return data as CategoriaGasto;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateCategoria: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar");

         get().invalidateCache();
         await get().GetCategorias({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   DeleteCategoria: async (id) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
         
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar");

         get().invalidateCache();
         await get().GetCategorias({ force: true });
         get().clearSelectedCategoria();
      } catch (error) {
         return error as Error;
      }
   },

   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) {
         await get().GetCategorias({ page: pagination.page + 1, limit: pagination.limit });
      }
   },

   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) {
         await get().GetCategorias({ page: pagination.page - 1, limit: pagination.limit });
      }
   },

   GoToPage: async (page) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) {
         await get().GetCategorias({ page, limit: pagination.limit });
      }
   },

   SearchCategorias: async (search, grupo) => {
      const { pagination } = get();
      await get().GetCategorias({ page: 1, limit: pagination.limit, search, grupo, force: true });
   },

   setSelectedCategoria: (categoria) => set({ selectedCategoria: categoria }),
   setLoading: (loading) => set({ loading }),
   clearSelectedCategoria: () => set({ selectedCategoria: null }),
}));