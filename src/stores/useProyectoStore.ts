import { create } from "zustand";
import type {
   Proyecto,
} from "@/dtos/proyecto.dto";
import { CreateProyectoDTO, LiquidacionFacade } from "@/backend/modules/proyectos/domain/proyecto.domain";

type ProyectoStore = {
   proyectos: Proyecto[];
   proyecto: Proyecto | null;
   loading: boolean;
   _fetchedLists: Set<string>;

   GetProyectos: (opts?: { force?: boolean, search?: string, page?: number, limit?: number }) => Promise<void>;
   GetProyectoById: (id: string) => Promise<Proyecto | null>;
   GetProyectosByClientId: (clienteId: string, opts?: { force?: boolean, search?: string, page?: number, limit?: number }) => Promise<void>;
   CreateProyecto: (form: CreateProyectoDTO) => Promise<Proyecto | Error>;
   GetLiquidacion: (id: string) => Promise<LiquidacionFacade | Error>;
   ToggleDetalleCobrable: (ids: string[], es_cobrable: boolean) => Promise<true | Error>;
   invalidateCache: () => void;
};

export const useProyectoStore = create<ProyectoStore>((set, get) => ({
   proyectos: [],
   proyecto: null,
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => set({ _fetchedLists: new Set<string>() }),

   GetProyectos: async ({ force = false, search = "", page = 1, limit = 10 }: { force?: boolean, search?: string, page?: number, limit?: number } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const url = `/api/proyectos?search=${search}&page=${page}&limit=${limit}`;
         const res = await fetch(url);
         if (!res.ok) throw new Error("Error al cargar proyectos");

         const data: Proyecto[] = await res.json();
         set((s) => ({
            proyectos: data,
            _fetchedLists: new Set(s._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching proyectos:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetProyectoById: async (id) => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/proyectos/${id}`);
         if (!res.ok) throw new Error("Error al cargar proyecto");
         const data: Proyecto = await res.json();
         set({ proyecto: data });
         return data;
      } catch (error) {
         console.error("Error fetching proyecto by id:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetProyectosByClientId: async (clienteId, { force = false, search = "", page = 1, limit = 10 }: { force?: boolean, search?: string, page?: number, limit?: number } = {}) => {
      const cacheKey = `client-${clienteId}`;
      if (!force && get()._fetchedLists.has(cacheKey)) return;
      set({ loading: true });
      try {
         const res = await fetch(`/api/proyectos/cliente/${clienteId}?search=${search}&page=${page}&limit=${limit}`);
         if (!res.ok) throw new Error("Error al cargar proyectos por cliente");
         const data: Proyecto[] = await res.json();
         set((s) => ({
            proyectos: data,
            _fetchedLists: new Set(s._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching proyectos by client:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateProyecto: async (form) => {
      try {
         const res = await fetch("/api/proyectos/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }

         const data: Proyecto = await res.json();
         get().invalidateCache();
         await get().GetProyectos({ force: true, search: "", page: 1, limit: 10 });
         return data;
      } catch (error) {
         return error as Error;
      }
   },

    GetLiquidacion: async (id) => {
       try {
          const res = await fetch(`/api/proyectos/${id}/liquidacion`);
          if (!res.ok) throw new Error("Liquidación no disponible");
          return await res.json() as LiquidacionFacade;
       } catch (error) {
          return error as Error;
       }
    },

    ToggleDetalleCobrable: async (ids, es_cobrable) => {
       try {
          const res = await fetch("/api/proyectos/detalle/cobrable", {
             method: "PATCH",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ ids, es_cobrable }),
          });
          if (!res.ok) {
             const errorText = await res.text();
             throw new Error(`Error ${res.status}: ${errorText}`);
          }
          return true;
       } catch (error) {
          return error as Error;
       }
    },
}));