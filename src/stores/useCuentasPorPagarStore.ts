import { create } from "zustand";

export type TipoCuenta = "GASTO" | "COSTO";
export type EstadoCuenta = "PENDIENTE" | "PARCIAL" | "PAGADO";

export interface CuentaPorPagar {
   id: string;
   tipo: TipoCuenta;
   referencia: number;
   codigoReferencia: string;
   concepto: string;
   ncf: string | null;
   fecha: string;
   monto_total: number;
   pagado: number;
   pendiente: number;
   estado: EstadoCuenta;
   dias_transcurridos: number;
   categoria_gasto_nombre: string | null;
   proyecto_id: string | null;
   proyecto_nombre: string | null;
   orden_compra_id: string | null;
   orden_compra_codigo_referencia: string | null;
   ultimo_pago_fecha: string | null;
   cantidad_pagos: number;
}

export interface ResumenCuentasPorPagar {
   total_documentos: number;
   total_monto: number;
   total_pagado: number;
   total_pendiente: number;
   pendientes: number;
   parciales: number;
   gastos_pendiente: number;
   costos_pendiente: number;
   antiguedad: {
      hasta_30: number;
      de_31_a_60: number;
      de_61_a_90: number;
      mas_de_90: number;
   };
}

export interface CuentasFiltros {
   tipo?: TipoCuenta;
   estado?: EstadoCuenta;
   incluir_pagadas?: boolean;
   busqueda?: string;
   fecha_desde?: string;
   fecha_hasta?: string;
   page?: number;
   pageSize?: number;
}

const RESUMEN_VACIO: ResumenCuentasPorPagar = {
   total_documentos: 0,
   total_monto: 0,
   total_pagado: 0,
   total_pendiente: 0,
   pendientes: 0,
   parciales: 0,
   gastos_pendiente: 0,
   costos_pendiente: 0,
   antiguedad: { hasta_30: 0, de_31_a_60: 0, de_61_a_90: 0, mas_de_90: 0 },
};

interface State {
   cuentas: CuentaPorPagar[];
   resumen: ResumenCuentasPorPagar;
   total: number;
   page: number;
   pageSize: number;
   filtros: CuentasFiltros;
   loading: boolean;
   error: string | null;

   GetCuentas: (filtros?: CuentasFiltros) => Promise<void>;
   SetFiltros: (filtros: CuentasFiltros) => void;
   NextPage: () => void;
   PrevPage: () => void;
}

export const useCuentasPorPagarStore = create<State>((set, get) => ({
   cuentas: [],
   resumen: RESUMEN_VACIO,
   total: 0,
   page: 1,
   pageSize: 25,
   filtros: {},
   loading: false,
   error: null,

   GetCuentas: async (filtros) => {
      const f = { ...get().filtros, ...filtros };
      set({ loading: true, error: null, filtros: f });

      const qs = new URLSearchParams();
      if (f.tipo) qs.set("tipo", f.tipo);
      if (f.estado) qs.set("estado", f.estado);
      if (f.incluir_pagadas) qs.set("incluir_pagadas", "true");
      if (f.busqueda) qs.set("busqueda", f.busqueda);
      if (f.fecha_desde) qs.set("fecha_desde", f.fecha_desde);
      if (f.fecha_hasta) qs.set("fecha_hasta", f.fecha_hasta);
      qs.set("page", String(f.page ?? 1));
      qs.set("pageSize", String(f.pageSize ?? 25));

      try {
         const res = await fetch(`/api/cuentas-por-pagar?${qs}`);
         const data = await res.json();
         if (!res.ok) throw new Error(data?.error ?? "Error al cargar las cuentas");
         set({
            cuentas: data.data,
            resumen: data.resumen,
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
         });
      } catch (e: any) {
         set({ error: e.message, cuentas: [], resumen: RESUMEN_VACIO, total: 0 });
      } finally {
         set({ loading: false });
      }
   },

   SetFiltros: (filtros) => {
      // Cualquier cambio de filtro vuelve a la página 1: si no, se podría
      // quedar en una página que ya no existe.
      set({ filtros: { ...get().filtros, ...filtros, page: 1 } });
      get().GetCuentas({ ...filtros, page: 1 });
   },

   NextPage: () => {
      const { page, pageSize, total } = get();
      if (page * pageSize >= total) return;
      get().GetCuentas({ page: page + 1 });
   },

   PrevPage: () => {
      const { page } = get();
      if (page <= 1) return;
      get().GetCuentas({ page: page - 1 });
   },
}));
