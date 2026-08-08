import { create } from "zustand";
import type {
   Proyecto,
   CreateProyectoForm,
   LiquidacionExpress,
   EstadoProyecto, // Asumiendo que esto también está en proyecto.dto.ts
   UpdateProyectoForm
} from "@/dtos/proyecto.dto";

// Creamos un tipo que refleja UpdateProyectoDTO del backend, 
// pero adaptado para el frontend (ej. las fechas son strings que se envían al backend)


type ProyectoStore = {
   proyectos: Proyecto[];
   proyecto: Proyecto | null;
   loading: boolean;
   _fetchedLists: Set<string>;

   GetProyectos: (opts?: { force?: boolean, search?: string, page?: number, limit?: number }) => Promise<void>;
   GetProyectoById: (id: string) => Promise<Proyecto | null>;
   GetProyectosByClientId: (clienteId: string, opts?: { force?: boolean, search?: string, page?: number, limit?: number }) => Promise<void>;
   CreateProyecto: (form: CreateProyectoForm) => Promise<Proyecto | Error>;
   GetLiquidacion: (id: string) => Promise<LiquidacionExpress | Error>;

   // AQUÍ ESTÁ EL CAMBIO: Reemplazamos Record<string, unknown> por UpdateProyectoForm
   UpdateProyecto: (id: string, data: UpdateProyectoForm) => Promise<true | Error>;

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

   GetProyectoById: async (id: string) => {
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

   GetProyectosByClientId: async (clienteId: string, { force = false, search = "", page = 1, limit = 10 }: { force?: boolean, search?: string, page?: number, limit?: number } = {}) => {
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

   CreateProyecto: async (form: CreateProyectoForm) => {
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

   GetLiquidacion: async (id: string) => {
      try {
         const res = await fetch(`/api/proyectos/${id}/liquidacion`);
         if (!res.ok) throw new Error("Liquidación no disponible");
         return await res.json() as LiquidacionExpress;
      } catch (error) {
         return error as Error;
      }
   },

   // AQUÍ ESTÁ EL CAMBIO EN LA IMPLEMENTACIÓN
   UpdateProyecto: async (id: string, data: UpdateProyectoForm) => {
      try {
         const res = await fetch(`/api/proyectos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) {
            const errData = await res.json().catch(() => null);
            throw new Error(errData?.error ?? "Error al actualizar el proyecto");
         }
         const updated = await res.json();
         set({ proyecto: updated });
         return true;
      } catch (e) {
         return e as Error;
      }
   },

   ToggleDetalleCobrable: async (ids: string[], es_cobrable: boolean) => {
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