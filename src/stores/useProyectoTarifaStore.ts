import { create } from "zustand";
import type { ProyectoTarifaDTO, UpsertProyectoTarifaForm, TarifaGlobalRowDTO, BulkUpsertTarifaPayload } from "@/dtos/proyecto-tarifa.dto";

type ProyectoTarifaStore = {
   tarifasPorProyecto: Record<string, ProyectoTarifaDTO[]>;
   tarifasGlobales: TarifaGlobalRowDTO[];
   tarifasGlobalesTotal: number;
   loading: boolean;

   GetTarifas: (proyectoId: string) => Promise<void>;
   GetTarifasGlobales: (proyectoId: string, search?: string, page?: number, limit?: number) => Promise<void>;
   UpsertTarifa: (form: UpsertProyectoTarifaForm) => Promise<ProyectoTarifaDTO | Error>;
   BulkUpsertTarifas: (payload: BulkUpsertTarifaPayload) => Promise<true | Error>;
   DeleteTarifa: (id: string, proyectoId: string) => Promise<true | Error>;
   getTarifa: (proyectoId: string, categoriaEquipoTarifaId: string) => ProyectoTarifaDTO | undefined;
};

export const useProyectoTarifaStore = create<ProyectoTarifaStore>((set, get) => ({
   tarifasPorProyecto: {},
   tarifasGlobales: [],
   tarifasGlobalesTotal: 0,
   loading: false,

   GetTarifas: async (proyectoId) => {
      if (!proyectoId) return;
      set({ loading: true });
      try {
         const res = await fetch(`/api/proyecto-tarifas?proyecto_id=${proyectoId}`);
         if (!res.ok) throw new Error("Error al cargar tarifas del proyecto");
         const data: ProyectoTarifaDTO[] = await res.json();
         set((s) => ({ tarifasPorProyecto: { ...s.tarifasPorProyecto, [proyectoId]: data } }));
      } finally {
         set({ loading: false });
      }
   },

   GetTarifasGlobales: async (proyectoId, search = "", page = 1, limit = 20) => {
      if (!proyectoId) return;
      set({ loading: true });
      try {
         const params = new URLSearchParams({ proyecto_id: proyectoId, search, page: String(page), limit: String(limit) });
         const res = await fetch(`/api/proyecto-tarifas/todas?${params}`);
         if (!res.ok) throw new Error("Error al cargar tarifas");
         const data = await res.json();
         set({ tarifasGlobales: data.rows ?? [], tarifasGlobalesTotal: data.total ?? 0 });
      } finally {
         set({ loading: false });
      }
   },

   UpsertTarifa: async (form) => {
      try {
         const res = await fetch("/api/proyecto-tarifas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         const data: ProyectoTarifaDTO = await res.json();
         set((s) => {
            const actuales = s.tarifasPorProyecto[form.proyecto_id] ?? [];
            const sinEsta = actuales.filter((t) => t.id !== data.id);
            return { tarifasPorProyecto: { ...s.tarifasPorProyecto, [form.proyecto_id]: [...sinEsta, data] } };
         });
         return data;
      } catch (error) {
         return error as Error;
      }
   },

   BulkUpsertTarifas: async (payload) => {
      try {
         const res = await fetch("/api/proyecto-tarifas/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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

   DeleteTarifa: async (id, proyectoId) => {
      try {
         const res = await fetch(`/api/proyecto-tarifas/${id}`, { method: "DELETE" });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         set((s) => ({
            tarifasPorProyecto: {
               ...s.tarifasPorProyecto,
               [proyectoId]: (s.tarifasPorProyecto[proyectoId] ?? []).filter((t) => t.id !== id),
            },
         }));
         return true;
      } catch (error) {
         return error as Error;
      }
   },

   getTarifa: (proyectoId, categoriaEquipoTarifaId) =>
      (get().tarifasPorProyecto[proyectoId] ?? []).find(
         (t) => t.categoria_equipo_tarifa_id === categoriaEquipoTarifaId
      ),
}));
