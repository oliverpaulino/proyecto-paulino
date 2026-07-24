import { create } from "zustand";
import type {
   ConduceDTO,
   ConduceFiltros,
   ConduceListResult,
   CreateConduceForm,
} from "@/dtos/conduce.dto";

type ConduceStore = {
   conduces: ConduceDTO[];
   total: number;
   page: number;
   pageSize: number;
   loading: boolean;
   filtros: ConduceFiltros;

   SetFiltros: (filtros: ConduceFiltros) => void;
   GetConduces: (filtros?: ConduceFiltros) => Promise<void>;
   GetConducesByProyecto: (proyectoId: string) => Promise<void>;
   CreateConduce: (form: CreateConduceForm) => Promise<ConduceDTO | Error>;
   UpdateConduce: (
      id: string,
      form: Partial<CreateConduceForm>,
      proyectoIdAnterior?: string | null
   ) => Promise<ConduceDTO | Error>;
   DeleteConduce: (id: string) => Promise<true | Error>;
};

function buildQuery(filtros: ConduceFiltros): string {
   const params = new URLSearchParams();
   Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
   });
   return params.toString();
}

export const useConduceStore = create<ConduceStore>((set, get) => ({
   conduces: [],
   total: 0,
   page: 1,
   pageSize: 25,
   loading: false,
   filtros: {},

   SetFiltros: (filtros) => set({ filtros }),

   // Usado por el registro general (/dashboard/conduces): respeta filtros +
   // paginación, para poder navegar volúmenes grandes sin traer todo junto.
   GetConduces: async (filtros) => {
      const finalFiltros: ConduceFiltros = { page: 1, pageSize: 25, ...get().filtros, ...filtros };
      set({ loading: true, filtros: finalFiltros });
      try {
         const qs = buildQuery(finalFiltros);
         const res = await fetch(`/api/conduces?${qs}`);
         if (!res.ok) throw new Error("Error al cargar conduces");
         const data: ConduceListResult = await res.json();
         set({ conduces: data.data, total: data.total, page: data.page, pageSize: data.pageSize });
      } catch (error) {
         console.error("Error fetching conduces:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   // Usado en la página de detalle de un proyecto: trae todos los conduces
   // de ese proyecto (sin paginar, normalmente son pocos por proyecto).
   GetConducesByProyecto: async (proyectoId) => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/conduces?proyecto_id=${proyectoId}&pageSize=500`);
         if (!res.ok) throw new Error("Error al cargar conduces");
         const data: ConduceListResult = await res.json();
         set({ conduces: data.data, total: data.total });
      } finally {
         set({ loading: false });
      }
   },

   CreateConduce: async (form) => {
      try {
         const res = await fetch("/api/conduces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         const data: ConduceDTO = await res.json();
         set((s) => ({ conduces: [data, ...s.conduces], total: s.total + 1 }));
         return data;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateConduce: async (id, form, proyectoIdAnterior) => {
      try {
         const res = await fetch(`/api/conduces/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, proyecto_id_anterior: proyectoIdAnterior ?? null }),
         });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         const data: ConduceDTO = await res.json();
         set((s) => ({ conduces: s.conduces.map((c) => (c.id === id ? data : c)) }));
         return data;
      } catch (error) {
         return error as Error;
      }
   },

   DeleteConduce: async (id) => {
      try {
         const res = await fetch(`/api/conduces/${id}`, { method: "DELETE" });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         set((s) => ({ conduces: s.conduces.filter((c) => c.id !== id), total: Math.max(0, s.total - 1) }));
         return true;
      } catch (error) {
         return error as Error;
      }
   },
}));