import { create } from "zustand";
import type { ProyectoTarifaDTO, UpsertProyectoTarifaForm } from "@/dtos/proyecto-tarifa.dto";

type ProyectoTarifaStore = {
   tarifasPorProyecto: Record<string, ProyectoTarifaDTO[]>;
   loading: boolean;

   GetTarifas: (proyectoId: string) => Promise<void>;
   UpsertTarifa: (form: UpsertProyectoTarifaForm) => Promise<ProyectoTarifaDTO | Error>;
   DeleteTarifa: (id: string, proyectoId: string) => Promise<true | Error>;

   /** Usado por conduce-form.tsx para precargar el precio con prioridad de proyecto. */
   getTarifa: (proyectoId: string, categoriaEquipoTarifaId: string) => ProyectoTarifaDTO | undefined;
};

export const useProyectoTarifaStore = create<ProyectoTarifaStore>((set, get) => ({
   tarifasPorProyecto: {},
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