import { create } from "zustand";
import type { ProyectoEmpleadoTarifaDTO, UpsertProyectoEmpleadoTarifaForm, OperadorTarifaRowDTO, BulkUpsertPayload } from "@/dtos/proyecto-empleado-tarifa.dto";

type ProyectoEmpleadoTarifaStore = {
   tarifasPorProyecto: Record<string, ProyectoEmpleadoTarifaDTO[]>;
   operadoresRows: OperadorTarifaRowDTO[];
   operadoresTotal: number;
   loading: boolean;

   GetTarifas: (proyectoId: string) => Promise<void>;
   GetOperadoresConTarifas: (proyectoId: string, search?: string, page?: number, limit?: number) => Promise<void>;
   UpsertTarifa: (form: UpsertProyectoEmpleadoTarifaForm) => Promise<ProyectoEmpleadoTarifaDTO | Error>;
   BulkUpsertTarifas: (payload: BulkUpsertPayload) => Promise<true | Error>;
   DeleteTarifa: (id: string, proyectoId: string) => Promise<true | Error>;
};

export const useProyectoEmpleadoTarifaStore = create<ProyectoEmpleadoTarifaStore>((set, get) => ({
   tarifasPorProyecto: {},
   operadoresRows: [],
   operadoresTotal: 0,
   loading: false,

   GetTarifas: async (proyectoId) => {
      if (!proyectoId) return;
      set({ loading: true });
      try {
         const res = await fetch(`/api/proyecto-empleado-tarifas?proyecto_id=${proyectoId}`);
         if (!res.ok) throw new Error("Error al cargar tarifas de empleado del proyecto");
         const data: ProyectoEmpleadoTarifaDTO[] = await res.json();
         set((s) => ({ tarifasPorProyecto: { ...s.tarifasPorProyecto, [proyectoId]: data } }));
      } finally {
         set({ loading: false });
      }
   },

   GetOperadoresConTarifas: async (proyectoId, search = "", page = 1, limit = 20) => {
      if (!proyectoId) return;
      set({ loading: true });
      try {
         const params = new URLSearchParams({ proyecto_id: proyectoId, search, page: String(page), limit: String(limit) });
         const res = await fetch(`/api/proyecto-empleado-tarifas/operadores?${params}`);
         if (!res.ok) throw new Error("Error al cargar operadores");
         const data = await res.json();
         set({ operadoresRows: data.rows ?? [], operadoresTotal: data.total ?? 0 });
      } finally {
         set({ loading: false });
      }
   },

   UpsertTarifa: async (form) => {
      try {
         const res = await fetch("/api/proyecto-empleado-tarifas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         const data: ProyectoEmpleadoTarifaDTO = await res.json();
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
         const res = await fetch("/api/proyecto-empleado-tarifas/bulk", {
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
         const res = await fetch(`/api/proyecto-empleado-tarifas/${id}`, { method: "DELETE" });
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
}));
