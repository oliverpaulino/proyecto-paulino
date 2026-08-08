import { create } from "zustand";

export type EstadoCxc = "PENDIENTE" | "PARCIAL" | "PAGADO";
export type TipoCxc = "PROYECTO" | "CONDUCE";

export interface ConduceDetalleCxc {
   id: string;
   numero_referencia: string;
   tipo_conduce: string;
   fecha: string;
   categoria_equipo_tarifa_nombre: string | null;
   medida_cobro_nombre: string | null;
   monto_total: number;
   pagado: number;
   pendiente: number;
}

/** Un folio cobrable: un proyecto (tarifa + cargos + conduces) o un conduce suelto. */
export interface CuentaPorCobrar {
   id: string;
   tipo: TipoCxc;
   numero_referencia: string;
   nombre: string | null;
   fecha: string;
   proyecto_id: string | null;
   cliente_id: string;
   cliente_nombre: string | null;
   cliente_telefono: string | null;
   cliente_email: string | null;
   tarifa_servicio: number;
   cargos_cobrables: number;
   conduces_cobrables: number;
   conduces_count: number;
   monto_total: number;
   pagado: number;
   pendiente: number;
   pendiente_tarifa_cargos: number;
   estado: EstadoCxc;
   dias_transcurridos: number;
   ultimo_pago_fecha: string | null;
   cantidad_pagos: number;
   conduces: ConduceDetalleCxc[];
}

export interface ClienteCuentaPorCobrar {
   cliente_id: string;
   cliente_nombre: string;
   cliente_telefono: string | null;
   cliente_email: string | null;
   total_facturado: number;
   total_pagado: number;
   saldo_pendiente: number;
   cantidad_documentos: number;
   documentos_pendientes: number;
   ultimo_pago_fecha: string | null;
   dias_transcurridos: number;
   estado: EstadoCxc;
   antiguedad: {
      hasta_30: number;
      de_31_a_60: number;
      de_61_a_90: number;
      mas_de_90: number;
   };
}

export interface ResumenCxc {
   total_clientes: number;
   clientes_con_deuda: number;
   total_documentos: number;
   total_facturado: number;
   total_pagado: number;
   total_pendiente: number;
   pendientes: number;
   parciales: number;
   documentos_pendientes: number;
   antiguedad: {
      hasta_30: number;
      de_31_a_60: number;
      de_61_a_90: number;
      mas_de_90: number;
   };
}

export interface CxcFiltros {
   cliente_id?: string;
   proyecto_id?: string;
   estado?: EstadoCxc;
   incluir_pagadas?: boolean;
   busqueda?: string;
   fecha_desde?: string;
   fecha_hasta?: string;
   page?: number;
   pageSize?: number;
}

export interface PagoCxcInput {
   destino_id: string;
   tipo: TipoCxc;
   monto: number;
}

export interface RegistrarPagoCxc {
   cliente_id: string;
   monto: number;
   metodo_pago: string;
   fecha?: Date;
   concepto?: string;
   conduce_ids?: string[];
   proyecto_ids?: string[];
   pagos?: PagoCxcInput[];
}

export interface PagoCxc {
   id: string;
   referencia: number;
   codigoReferencia: string;
   conduce_id: string | null;
   conduce_numero_referencia: string | null;
   proyecto_id: string | null;
   proyecto_codigo_referencia: string | null;
   monto_pagado: number;
   metodo_pago: string;
   fecha: string;
   concepto: string;
   created_at: string;
   deleted_at: string | null;
}

export interface DetalleClienteCxc {
   cliente: {
      id: string;
      nombre: string;
      telefono: string | null;
      email: string | null;
      identificacion: string;
   };
   resumen: {
      facturado: number;
      pagado: number;
      pendiente: number;
      cantidad_documentos: number;
      documentos_pendientes: number;
      antiguedad: {
         hasta_30: number;
         de_31_a_60: number;
         de_61_a_90: number;
         mas_de_90: number;
      };
   };
   cuentas: CuentaPorCobrar[];
   historial_pagos: PagoCxc[];
   total: number;
   page: number;
   pageSize: number;
}

const RESUMEN_VACIO: ResumenCxc = {
   total_clientes: 0,
   clientes_con_deuda: 0,
   total_documentos: 0,
   total_facturado: 0,
   total_pagado: 0,
   total_pendiente: 0,
   pendientes: 0,
   parciales: 0,
   documentos_pendientes: 0,
   antiguedad: { hasta_30: 0, de_31_a_60: 0, de_61_a_90: 0, mas_de_90: 0 },
};

interface State {
   cuentas: ClienteCuentaPorCobrar[];
   resumen: ResumenCxc;
   total: number;
   page: number;
   pageSize: number;
   filtros: CxcFiltros;
   loading: boolean;
   error: string | null;

   GetCuentas: (filtros?: CxcFiltros) => Promise<void>;
   SetFiltros: (filtros: CxcFiltros) => void;
   NextPage: () => void;
   PrevPage: () => void;
   RegistrarPago: (pago: RegistrarPagoCxc) => Promise<PagoCxc[]>;
   GetDetalleCliente: (clienteId: string) => Promise<DetalleClienteCxc>;
   GetPendientesCliente: (clienteId: string) => Promise<CuentaPorCobrar[]>;
}

export const useCuentasPorCobrarStore = create<State>((set, get) => ({
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
      if (f.cliente_id) qs.set("cliente_id", f.cliente_id);
      if (f.proyecto_id) qs.set("proyecto_id", f.proyecto_id);
      if (f.estado) qs.set("estado", f.estado);
      if (f.incluir_pagadas) qs.set("incluir_pagadas", "true");
      if (f.busqueda) qs.set("busqueda", f.busqueda);
      if (f.fecha_desde) qs.set("fecha_desde", f.fecha_desde);
      if (f.fecha_hasta) qs.set("fecha_hasta", f.fecha_hasta);
      qs.set("page", String(f.page ?? 1));
      qs.set("pageSize", String(f.pageSize ?? 25));

      try {
         const res = await fetch(`/api/cuentas-por-cobrar?${qs}`);
         const data = await res.json();
         if (!res.ok) throw new Error(data?.error ?? "Error al cargar las cuentas por cobrar");
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

   RegistrarPago: async (pago) => {
      const body: Record<string, unknown> = {
         cliente_id: pago.cliente_id,
         monto: pago.monto,
         metodo_pago: pago.metodo_pago,
      };
      if (pago.fecha) body.fecha = pago.fecha.toISOString();
      if (pago.concepto) body.concepto = pago.concepto;
      if (pago.conduce_ids && pago.conduce_ids.length > 0) body.conduce_ids = pago.conduce_ids;
      if (pago.proyecto_ids && pago.proyecto_ids.length > 0) body.proyecto_ids = pago.proyecto_ids;
      if (pago.pagos && pago.pagos.length > 0) body.pagos = pago.pagos;

      const res = await fetch("/api/cuentas-por-cobrar/pagos", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error al registrar el pago");

      // Refresca el listado para reflejar los nuevos saldos.
      get().GetCuentas();
      return data.pagos as PagoCxc[];
   },

   GetDetalleCliente: async (clienteId) => {
      const res = await fetch(`/api/cuentas-por-cobrar/cliente/${clienteId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar el detalle");
      return data as DetalleClienteCxc;
   },

   GetPendientesCliente: async (clienteId) => {
      const res = await fetch(`/api/cuentas-por-cobrar/cliente/${clienteId}?pageSize=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar los folios pendientes");
      return (data.cuentas ?? []) as CuentaPorCobrar[];
   },
}));
