import { create } from "zustand";
import type {
   Proyecto,
   CreateProyectoExpressForm,
   LiquidacionExpress,
   TipoProyecto,
} from "@/dtos/proyecto.dto";

type ProyectoStore = {
   proyectos: Proyecto[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetProyectos: (tipo?: TipoProyecto, opts?: { force?: boolean }) => Promise<void>;
   GetProyectosByClientId: (clienteId: string, opts?: { force?: boolean }) => Promise<void>;
   CreateExpressProyecto: (form: CreateProyectoExpressForm) => Promise<Proyecto | Error>;
   GetLiquidacion: (id: string) => Promise<LiquidacionExpress | Error>;
   invalidateCache: () => void;
};

export const useProyectoStore = create<ProyectoStore>((set, get) => ({
   proyectos: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => set({ _fetchedLists: new Set<string>() }),

   GetProyectos: async (tipo, { force = false } = {}) => {
      const cacheKey = tipo ?? "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const url = tipo ? `/api/proyectos?tipo=${tipo}` : "/api/proyectos";
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

   GetProyectosByClientId: async (clienteId, { force = false } = {}) => {
      const cacheKey = `client-${clienteId}`;
      if (!force && get()._fetchedLists.has(cacheKey)) return;
      set({ loading: true });
      try {
         const res = await fetch(`/api/proyectos/cliente/${clienteId}`);
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

   CreateExpressProyecto: async (form) => {
      try {
         const res = await fetch("/api/proyectos/express", {
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
         await get().GetProyectos("EXPRESS", { force: true });
         return data;
      } catch (error) {
         return error as Error;
      }
   },

   GetLiquidacion: async (id) => {
      try {
         const res = await fetch(`/api/proyectos/${id}/liquidacion`);
         if (!res.ok) throw new Error("Liquidación no disponible");
         return await res.json() as LiquidacionExpress;
      } catch (error) {
         return error as Error;
      }
   },
}));