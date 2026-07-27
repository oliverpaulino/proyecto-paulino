import { create } from "zustand";

export type FrecuenciaPago = "SEMANAL" | "QUINCENAL" | "MENSUAL";
export type EstadoCiclo = "ABIERTO" | "CALCULADO" | "CERRADO" | "PAGADO";

export interface PayrollCycle {
   id: string;
   nombre: string;
   frecuencia: FrecuenciaPago;
   fecha_inicio: string;
   fecha_fin: string;
   fecha_pago: string | null;
   estado: EstadoCiclo;
   created_at: string;
}

export interface TarifaDesglose {
   categoria_equipo_tarifa_id: string | null;
   categoria_equipo_tarifa_nombre: string;
   medida_cobro_nombre: string | null;
   cantidad: number;
   monto_pago: number;
   subtotal: number;
}

export interface NominaEmpleado {
   id: string;
   cycle_id: string;
   empleado_id: string;
   empleado_nombre: string | null;
   minimo_garantizado: number;
   devengado_tarifas: number;
   complemento_minimo: number;
   seguro: number;
   /** Suma real de las deducciones del período. */
   deducciones: number;
   /** Override manual. null = usar `deducciones`. */
   deducciones_ajuste: number | null;
   deuda_total: number;
   deuda_pendiente: number;
   neto_pagar: number;
   total_conduces: number;
   conduces_inferidos: number;
   tarifas?: TarifaDesglose[];
}

export interface ResultadoCalculo {
   empleados_procesados: number;
   total_neto: number;
   empleados_con_inferencia: number;
   conduces_sin_tarifa: number;
}

interface NominaState {
   cycles: PayrollCycle[];
   empleados: NominaEmpleado[];
   selectedCycle: PayrollCycle | null;
   loading: boolean;
   calculando: boolean;
   error: string | null;
   ultimoCalculo: ResultadoCalculo | null;

   GetCycles: () => Promise<void>;
   CreateCycle: (data: Partial<PayrollCycle>) => Promise<PayrollCycle | null>;
   DeleteCycle: (id: string) => Promise<void>;
   SelectCycle: (cycle: PayrollCycle | null) => void;
   GetEmpleados: (cycleId: string) => Promise<void>;
   CalcularCiclo: (cycleId: string) => Promise<void>;
   CerrarCiclo: (cycleId: string) => Promise<void>;
   UpdateSeguro: (cycleEmployeeId: string, seguro: number) => Promise<void>;
   UpdateDeduccion: (cycleEmployeeId: string, ajuste: number | null) => Promise<void>;
   RefrescarDeducciones: (cycleId: string) => Promise<number>;
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
   const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
   });
   const data = await res.json().catch(() => ({}));
   if (!res.ok) throw new Error((data as any)?.error ?? "Error en la solicitud");
   return data as T;
}

export const useNominaStore = create<NominaState>((set, get) => ({
   cycles: [],
   empleados: [],
   selectedCycle: null,
   loading: false,
   calculando: false,
   error: null,
   ultimoCalculo: null,

   GetCycles: async () => {
      set({ loading: true, error: null });
      try {
         set({ cycles: await pedir<PayrollCycle[]>("/api/nomina/cycles") });
      } catch (e: any) {
         set({ error: e.message });
      } finally {
         set({ loading: false });
      }
   },

   CreateCycle: async (data) => {
      set({ loading: true, error: null });
      try {
         const nuevo = await pedir<PayrollCycle>("/api/nomina/cycles", {
            method: "POST",
            body: JSON.stringify(data),
         });
         set({ cycles: [nuevo, ...get().cycles] });
         return nuevo;
      } catch (e: any) {
         set({ error: e.message });
         return null;
      } finally {
         set({ loading: false });
      }
   },

   DeleteCycle: async (id) => {
      try {
         await pedir(`/api/nomina/cycles/${id}`, { method: "DELETE" });
         const { selectedCycle } = get();
         set({
            cycles: get().cycles.filter((c) => c.id !== id),
            selectedCycle: selectedCycle?.id === id ? null : selectedCycle,
            empleados: selectedCycle?.id === id ? [] : get().empleados,
         });
      } catch (e: any) {
         set({ error: e.message });
      }
   },

   SelectCycle: (cycle) => set({ selectedCycle: cycle, empleados: [], ultimoCalculo: null }),

   GetEmpleados: async (cycleId) => {
      set({ loading: true, error: null });
      try {
         set({ empleados: await pedir<NominaEmpleado[]>(`/api/nomina/cycles/${cycleId}/empleados`) });
      } catch (e: any) {
         set({ error: e.message });
      } finally {
         set({ loading: false });
      }
   },

   CalcularCiclo: async (cycleId) => {
      set({ calculando: true, error: null });
      try {
         const resultado = await pedir<ResultadoCalculo>(
            `/api/nomina/cycles/${cycleId}/calcular`,
            { method: "POST" }
         );
         set({ ultimoCalculo: resultado });
         await get().GetEmpleados(cycleId);
         await get().GetCycles();
      } catch (e: any) {
         set({ error: e.message });
      } finally {
         set({ calculando: false });
      }
   },

   CerrarCiclo: async (cycleId) => {
      try {
         await pedir(`/api/nomina/cycles/${cycleId}/cerrar`, { method: "POST" });
         await get().GetCycles();
         const actualizado = get().cycles.find((c) => c.id === cycleId) ?? null;
         set({ selectedCycle: actualizado });
      } catch (e: any) {
         set({ error: e.message });
      }
   },

   UpdateSeguro: async (cycleEmployeeId, seguro) => {
      try {
         const row = await pedir<NominaEmpleado>(
            `/api/nomina/cycle-employees/${cycleEmployeeId}/seguro`,
            { method: "PATCH", body: JSON.stringify({ seguro }) }
         );
         set({
            empleados: get().empleados.map((e) =>
               e.id === cycleEmployeeId
                  ? { ...e, seguro: row.seguro, neto_pagar: row.neto_pagar }
                  : e
            ),
         });
      } catch (e: any) {
         set({ error: e.message });
      }
   },

   /** `null` restaura el monto calculado desde las deducciones del período. */
   UpdateDeduccion: async (cycleEmployeeId, ajuste) => {
      try {
         const row = await pedir<NominaEmpleado>(
            `/api/nomina/cycle-employees/${cycleEmployeeId}/deduccion`,
            { method: "PATCH", body: JSON.stringify({ ajuste }) }
         );
         set({
            empleados: get().empleados.map((e) =>
               e.id === cycleEmployeeId
                  ? {
                       ...e,
                       deducciones_ajuste: row.deducciones_ajuste,
                       deuda_pendiente: row.deuda_pendiente,
                       neto_pagar: row.neto_pagar,
                    }
                  : e
            ),
         });
      } catch (e: any) {
         set({ error: e.message });
      }
   },

   /** Recoge deducciones creadas a mano tras el cálculo. */
   RefrescarDeducciones: async (cycleId) => {
      set({ error: null });
      try {
         const r = await pedir<{ actualizados: number }>(
            `/api/nomina/cycles/${cycleId}/refrescar-deducciones`,
            { method: "POST" }
         );
         await get().GetEmpleados(cycleId);
         return r.actualizados;
      } catch (e: any) {
         set({ error: e.message });
         return 0;
      }
   },
}));
