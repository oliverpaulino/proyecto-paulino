import { create } from "zustand";

export type FrecuenciaPago = "SEMANAL" | "QUINCENAL" | "MENSUAL";
export type EstadoCiclo = "ABIERTO" | "CALCULADO" | "CERRADO" | "PAGADO";

export const ESTADOS_CICLO: EstadoCiclo[] = ["ABIERTO", "CALCULADO", "CERRADO", "PAGADO"];

export interface PayrollCycle {
   id: string;
   nombre: string;
   frecuencia: FrecuenciaPago;
   fecha_inicio: string;
   fecha_fin: string;
   fecha_pago: string | null;
   estado: EstadoCiclo;
   /** Gasto generado al cerrar el ciclo. null si aún no se ha cerrado. */
   gasto_id: string | null;
   created_at: string;
}

export interface TarifaDesglose {
   categoria_equipo_tarifa_id: string | null;
   categoria_equipo_tarifa_nombre: string;
   /**
    * Categoría del equipo (el "tipo de camión") con el que se generó esta
    * producción. El desglose agrupa por (categoría, tarifa), así que la misma
    * tarifa usada con dos categorías distintas aparece en dos filas.
    *
    * NULL en snapshots viejos: ciclos calculados antes de la migración 015 y
    * ciclos cerrados, que ya no se recalculan.
    */
   categoria_equipo_id: string | null;
   categoria_equipo_nombre: string | null;
   medida_cobro_nombre: string | null;
    cantidad: number;
    monto_pago: number;
    subtotal: number;

    /**
     * Proyecto del conduce, cuando lo tiene. El desglose agrupa por
     * (categoría, tarifa, proyecto): la misma tarifa con precio distinto por
     * proyecto (tarifa del proyecto vs. base) aparece en filas separadas.
     * `undefined` en snapshots viejos (ciclos de antes de esta columna).
     */
    proyecto_id?: string | null;
    proyecto_nombre?: string | null;

   /**
    * Solo en tarifas sin id. Dice si el nombre guardado corresponde hoy a una
    * categoría viva, y por tanto si su precio se puede corregir:
    * "vinculable" (una sola, editable), "ambigua" (varias con ese nombre, hay
    * que desambiguar) o "sin_categoria" (la categoría ya no existe).
    */
   rescate?: "vinculable" | "ambigua" | "sin_categoria";
   /** Id al que re-vincular cuando `rescate === "vinculable"`. */
   rescate_id?: string | null;
   rescate_candidatas?: number;

   /** El monto viene de un precio escrito a mano para este ciclo. */
   precio_manual?: boolean;
   precio_manual_nota?: string | null;
}

export interface DeduccionDelPeriodo {
   id: string;
   concepto: string;
   monto_total: number;
   /** Cuota configurada por nómina (editable). Puede diferir del período. */
   monto_cuota: number;
   /** Cuota que se descuenta en este período (no necesariamente el total). */
   monto_periodo: number;
   cuotas_sugeridas: number;
   /** Cuotas ya aplicadas, incluida la de este período. */
   cuotas_aplicadas: number;
   fecha: string;
}

export type ModalidadPago = "PRODUCCION" | "FIJO";

export interface NominaEmpleado {
   id: string;
   cycle_id: string;
   empleado_id: string;
   empleado_nombre: string | null;
   rol: string | null;
   /** PRODUCCION = chofer (cobra conduces); FIJO = asalariado. */
   modalidad: ModalidadPago;
   minimo_garantizado: number;
   devengado_tarifas: number;
   complemento_minimo: number;
   seguro: number;
   /** Suma de las deducciones del período. */
   deducciones: number;
   /** Cuántos conceptos componen ese monto. Viene siempre en el listado. */
   deducciones_count: number;
   /**
    * Las deducciones concretas. NO viene en el listado: se carga al expandir
    * la fila, vía `GetDetalleEmpleado`.
    */
   detalle_deducciones?: DeduccionDelPeriodo[];
   deuda_total: number;
   deuda_pendiente: number;
   neto_pagar: number;
   total_conduces: number;
   conduces_inferidos: number;
   tarifas?: TarifaDesglose[];
}

export interface ResultadoCalculo {
   empleados_procesados: number;
   choferes: number;
   asalariados: number;
   total_neto: number;
   empleados_con_inferencia: number;
   conduces_sin_tarifa: number;
}

/** Detalle de un empleado ya traído, con el momento en que se cacheó. */
interface DetalleCacheado {
   tarifas: TarifaDesglose[];
   detalle_deducciones: DeduccionDelPeriodo[];
   /** `Date.now()` de cuando se guardó, para poder caducarlo. */
   cargadoEn: number;
}

/**
 * Cuánto vive el detalle cacheado. Corto a propósito: el ciclo se edita
 * mientras se revisa (se agregan deducciones, se ajusta el seguro), así que
 * un caché largo mostraría números viejos. 30s cubre el caso real — abrir y
 * cerrar la misma fila un par de veces seguidas — sin arriesgar datos rancios.
 */
const DETALLE_TTL_MS = 30_000;

interface NominaState {
   cycles: PayrollCycle[];
   empleados: NominaEmpleado[];
   selectedCycle: PayrollCycle | null;
   loading: boolean;
   calculando: boolean;
   error: string | null;
   ultimoCalculo: ResultadoCalculo | null;
   /** Detalle por `empleado_id`. Se limpia al recalcular o cambiar de ciclo. */
   detalles: Record<string, DetalleCacheado>;
   /**
    * `empleado_id`s cuyo detalle se está pidiendo ahora mismo. Es un conjunto
    * y no un solo id porque el PDF hidrata varios a la vez.
    */
   cargandoDetalle: string[];

   GetCycles: () => Promise<void>;
   CreateCycle: (data: Partial<PayrollCycle>) => Promise<PayrollCycle | null>;
   DeleteCycle: (id: string) => Promise<void>;
   SelectCycle: (cycle: PayrollCycle | null) => void;
   GetEmpleados: (cycleId: string) => Promise<void>;
   /** Carga (o reusa del caché) el detalle de un empleado al expandir su fila. */
   GetDetalleEmpleado: (cycleId: string, empleadoId: string) => Promise<void>;
   /**
    * Rellena el detalle de una lista concreta de empleados (para el PDF, que
    * sí necesita el desglose completo de cada uno). Devuelve copias con
    * `detalle_deducciones` puesto; no toca `empleados`.
    */
   HidratarDetalles: (
      cycleId: string,
      empleados: NominaEmpleado[]
   ) => Promise<NominaEmpleado[]>;
   CalcularCiclo: (cycleId: string) => Promise<void>;
   CerrarCiclo: (cycleId: string) => Promise<void>;
   /**
    * Guarda las tarifas del empleado (`empleado_categoria_tarifa`) y recalcula
    * el ciclo. Los dos pasos van juntos a propósito: la tarifa vive en el
    * empleado, pero el devengado del ciclo es un snapshot — sin recalcular, el
    * "sin tarifa" en RD$ 0 seguiría ahí después de guardar.
    */
    GuardarTarifasEmpleado: (
       cycleId: string,
       empleadoId: string,
       tarifas: { categoria_equipo_tarifa_id: string; monto_pago: number }[]
    ) => Promise<boolean>;
    /**
     * Cambia lo que el proyecto paga a este chofer por una tarifa. El backend
     * actualiza `proyecto_empleado_tarifa` y recalcula el ciclo, así que se
     * actualiza en sitio la fila del empleado y el detalle cacheado de su
     * acordeón, para no recargar todo el listado.
     */
    GuardarTarifaProyecto: (
       cycleId: string,
       empleadoId: string,
       data: { proyecto_id: string; categoria_equipo_tarifa_id: string; monto_pago: number }
    ) => Promise<boolean>;
   UpdateSeguro: (cycleEmployeeId: string, seguro: number) => Promise<void>;
   AgregarDeduccion: (
      cycleId: string,
      empleadoId: string,
      data: { monto: number; concepto: string; fecha?: string; cuotas?: number; monto_cuota?: number }
   ) => Promise<boolean>;
   RefrescarDeducciones: (cycleId: string) => Promise<number>;
   /**
    * Cambia la cuota por nómina de una deducción con cuotas. Subir la cuota
    * acelera el saldo, bajarla lo frena. Recarga la nómina para ver el monto
    * ya aplicado.
    */
   ActualizarCuotaDeduccion: (
      cycleId: string,
      empleadoId: string,
      deduccionId: string,
      montoCuota: number
   ) => Promise<boolean>;
   /**
    * Fija a mano el precio de una tarifa que la nómina no puede resolver.
    * Aplica solo a este empleado en este ciclo; recalcula al guardar.
    */
   FijarPrecioManual: (
      cycleId: string,
      empleadoId: string,
      data: { tarifa_nombre: string; monto_pago: number; nota?: string | null }
   ) => Promise<boolean>;
   /** Quita el precio manual y recalcula. */
   QuitarPrecioManual: (
      cycleId: string,
      empleadoId: string,
      tarifaNombre: string
   ) => Promise<boolean>;
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
   detalles: {},
   cargandoDetalle: [],

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

   // Otro ciclo son otros números: el detalle cacheado no sirve.
   SelectCycle: (cycle) =>
      set({ selectedCycle: cycle, empleados: [], ultimoCalculo: null, detalles: {} }),

   GetEmpleados: async (cycleId) => {
      set({ loading: true, error: null });
      try {
         // Los montos vienen de nuevo, así que el detalle cacheado ya no es
         // confiable: se descarta y se recarga cuando se abra una fila.
         set({
            empleados: await pedir<NominaEmpleado[]>(`/api/nomina/cycles/${cycleId}/empleados`),
            detalles: {},
         });
      } catch (e: any) {
         set({ error: e.message });
      } finally {
         set({ loading: false });
      }
   },

   /**
    * Trae las tarifas y las deducciones concretas de un empleado. El listado
    * del ciclo no las incluye a propósito (sería una query por empleado), así
    * que se piden al abrir la fila.
    *
    * Reusa el caché mientras esté fresco: abrir y cerrar la misma fila no
    * vuelve a pegarle al backend, pero un detalle de hace rato se revalida.
    */
   GetDetalleEmpleado: async (cycleId, empleadoId) => {
      const cacheado = get().detalles[empleadoId];
      if (cacheado && Date.now() - cacheado.cargadoEn < DETALLE_TTL_MS) return;
      // Ya hay una petición viva para esta persona: no se duplica.
      if (get().cargandoDetalle.includes(empleadoId)) return;

      set({ cargandoDetalle: [...get().cargandoDetalle, empleadoId], error: null });
      try {
         const row = await pedir<NominaEmpleado>(
            `/api/nomina/cycles/${cycleId}/empleados/${empleadoId}`
         );
         set({
            detalles: {
               ...get().detalles,
               [empleadoId]: {
                  tarifas: row.tarifas ?? [],
                  detalle_deducciones: row.detalle_deducciones ?? [],
                  cargadoEn: Date.now(),
               },
            },
         });
      } catch (e: any) {
         set({ error: e.message });
      } finally {
         set({ cargandoDetalle: get().cargandoDetalle.filter((id) => id !== empleadoId) });
      }
   },

   /**
    * El PDF imprime el desglose de deducciones de cada empleado, que el
    * listado ya no trae. Se piden aquí, solo para los que se van a imprimir.
    *
    * En tandas y no todas a la vez: exportar 100 volantes no debe abrir 100
    * conexiones simultáneas. Los que ya estén cacheados no se vuelven a pedir.
    */
   HidratarDetalles: async (cycleId, lista) => {
      const pendientes = lista.filter((e) => {
         if (e.deducciones_count === 0) return false;
         const c = get().detalles[e.empleado_id];
         return !c || Date.now() - c.cargadoEn >= DETALLE_TTL_MS;
      });

      const TANDA = 8;
      for (let i = 0; i < pendientes.length; i += TANDA) {
         await Promise.all(
            pendientes
               .slice(i, i + TANDA)
               .map((e) => get().GetDetalleEmpleado(cycleId, e.empleado_id))
         );
      }

      const cache = get().detalles;
      return lista.map((e) => ({
         ...e,
         detalle_deducciones: cache[e.empleado_id]?.detalle_deducciones ?? [],
      }));
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

   /**
    * Corrige las tarifas del chofer sin salir de la nómina. Usa el endpoint
    * bulk de empleados, que hace UPSERT por (empleado_id,
    * categoria_equipo_tarifa_id): la misma llamada sirve para arreglar una
    * tarifa mal puesta y para crear la que faltaba (el caso "sin tarifa").
    *
    * Recalcular después no es opcional: `payroll_cycle_employee_tarifas` es un
    * snapshot tomado al calcular el ciclo. Guardar la tarifa sola dejaría la
    * nómina mostrando el RD$ 0 de antes.
    */
   GuardarTarifasEmpleado: async (cycleId, empleadoId, tarifas) => {
      set({ error: null });
      try {
         await pedir(`/api/employees/${empleadoId}/tarifas/bulk`, {
            method: "POST",
            body: JSON.stringify({ tarifas }),
         });
         await get().CalcularCiclo(cycleId);
         // CalcularCiclo traga sus propios errores en `error`: si falló, el
         // ciclo no está recalculado y decir que sí sería mentir.
         return get().error === null;
      } catch (e: any) {
         set({ error: e.message });
         return false;
      }
   },

   /**
    * El backend recalcula el ciclo al guardar y devuelve la fila ya
    * refrescada, así que se actualiza en sitio (como ActualizarCuotaDeduccion)
    * y el desglose expandido queda al día sin recargar el listado.
    */
   GuardarTarifaProyecto: async (cycleId, empleadoId, data) => {
      set({ error: null });
      try {
         const row = await pedir<NominaEmpleado>(
            `/api/nomina/cycles/${cycleId}/empleados/${empleadoId}/tarifa-proyecto`,
            { method: "PATCH", body: JSON.stringify(data) }
         );
         set({
            empleados: get().empleados.map((e) =>
               e.empleado_id === empleadoId ? { ...e, ...row } : e
            ),
            detalles: {
               ...get().detalles,
               [empleadoId]: {
                  tarifas: row.tarifas ?? [],
                  detalle_deducciones: row.detalle_deducciones ?? [],
                  cargadoEn: Date.now(),
               },
            },
         });
         return true;
      } catch (e: any) {
         set({ error: e.message });
         return false;
      }
   },

   /*
      El backend recalcula el ciclo al guardar, así que se recargan los
      empleados para ver el monto ya aplicado. Guardar sin recalcular dejaría
      la nómina mostrando el RD$ 0 de antes.
   */
   FijarPrecioManual: async (cycleId, empleadoId, data) => {
      set({ error: null });
      try {
         await pedir(`/api/nomina/cycles/${cycleId}/empleados/${empleadoId}/precio-manual`, {
            method: "POST",
            body: JSON.stringify(data),
         });
         await get().GetEmpleados(cycleId);
         await get().GetCycles();
         return get().error === null;
      } catch (e: any) {
         set({ error: e.message });
         return false;
      }
   },

   QuitarPrecioManual: async (cycleId, empleadoId, tarifaNombre) => {
      set({ error: null });
      try {
         await pedir(
            `/api/nomina/cycles/${cycleId}/empleados/${empleadoId}/precio-manual` +
               `?tarifa_nombre=${encodeURIComponent(tarifaNombre)}`,
            { method: "DELETE" }
         );
         await get().GetEmpleados(cycleId);
         return get().error === null;
      } catch (e: any) {
         set({ error: e.message });
         return false;
      }
   },

   UpdateSeguro: async (cycleEmployeeId, seguro) => {
      try {
         const row = await pedir<NominaEmpleado>(
            `/api/nomina/cycle-employees/${cycleEmployeeId}/seguro`,
            { method: "PATCH", body: JSON.stringify({ seguro }) }
         );
         // El desglose expandido muestra el neto y el bruto, así que el
         // detalle de esta persona queda obsoleto: se descarta el suyo (no
         // todo el caché — las demás filas no cambiaron).
         const afectado = get().empleados.find((e) => e.id === cycleEmployeeId);
         const detalles = { ...get().detalles };
         if (afectado) delete detalles[afectado.empleado_id];

         set({
            detalles,
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

   /**
    * Crea una deducción NUEVA (no modifica las existentes) y actualiza en
    * sitio la fila del empleado y el detalle cacheado de su acordeón. El
    * backend devuelve la fila ya refrescada (deducciones, pendiente, neto y
    * detalle), así que no hace falta recargar todo el listado.
    */
   AgregarDeduccion: async (cycleId, empleadoId, data) => {
      set({ error: null });
      try {
         const row = await pedir<NominaEmpleado>(
            `/api/nomina/cycles/${cycleId}/empleados/${empleadoId}/deducciones`,
            { method: "POST", body: JSON.stringify(data) }
         );
         set({
            empleados: get().empleados.map((e) =>
               e.empleado_id === empleadoId ? { ...e, ...row } : e
            ),
            detalles: {
               ...get().detalles,
               [empleadoId]: {
                  tarifas: row.tarifas ?? [],
                  detalle_deducciones: row.detalle_deducciones ?? [],
                  cargadoEn: Date.now(),
               },
            },
         });
         return true;
      } catch (e: any) {
         set({ error: e.message });
         return false;
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

   /**
    * Cambia la cuota por nómina de una deducción con cuotas. El backend vuelve
    * a aplicar los cobros del ciclo, así que se actualiza en sitio la fila del
    * empleado (deducciones, pendiente, neto) y el detalle cacheado de su
    * acordeón, para no dejarlo en "Cargando…".
    */
   ActualizarCuotaDeduccion: async (cycleId, empleadoId, deduccionId, montoCuota) => {
      set({ error: null });
      try {
         const row = await pedir<NominaEmpleado>(
            `/api/nomina/cycles/${cycleId}/empleados/${empleadoId}/deducciones/${deduccionId}`,
            { method: "PATCH", body: JSON.stringify({ monto_cuota: montoCuota }) }
         );
         set({
            empleados: get().empleados.map((e) =>
               e.empleado_id === empleadoId ? { ...e, ...row } : e
            ),
            detalles: {
               ...get().detalles,
               [empleadoId]: {
                  tarifas: row.tarifas ?? [],
                  detalle_deducciones: row.detalle_deducciones ?? [],
                  cargadoEn: Date.now(),
               },
            },
         });
         return true;
      } catch (e: any) {
         set({ error: e.message });
         return false;
      }
   },
}));
