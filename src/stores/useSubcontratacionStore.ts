import { create } from "zustand";
import type {
   Subcontratacion,
   CreateSubcontratacionForm,
   UpdateSubcontratacionForm,
   EstadoTrabajo,
} from "@/dtos/subcontratacion.dto";

export interface SubcontratacionesFiltros {
   proveedor_id?: string;
   proyecto_id?: string;
   estado_trabajo?: EstadoTrabajo;
   estado_pago?: string;
   incluir_pagadas?: boolean;
   busqueda?: string;
   fecha_desde?: string;
   fecha_hasta?: string;
   page?: number;
   pageSize?: number;
}

export interface ResumenSubcontrataciones {
   total_documentos: number;
   total_deuda: number;
   total_pagado: number;
   total_pendiente: number;
   pendientes_trabajo: number;
   en_progreso_trabajo: number;
   terminadas_trabajo: number;
   canceladas_trabajo: number;
}

const RESUMEN_VACIO: ResumenSubcontrataciones = {
   total_documentos: 0,
   total_deuda: 0,
   total_pagado: 0,
   total_pendiente: 0,
   pendientes_trabajo: 0,
   en_progreso_trabajo: 0,
   terminadas_trabajo: 0,
   canceladas_trabajo: 0,
};

export interface PagoSubcontratacion {
   id: string;
   referencia: number;
   codigoReferencia: string;
   metodo_pago: string;
   monto_pagado: number;
   concepto: string | null;
   fecha: string;
   created_at: string;
}

interface State {
   subcontrataciones: Subcontratacion[];
   resumen: ResumenSubcontrataciones;
   total: number;
   page: number;
   pageSize: number;
   filtros: SubcontratacionesFiltros;
   loading: boolean;
   error: string | null;

   GetSubcontrataciones: (filtros?: SubcontratacionesFiltros) => Promise<void>;
   SetFiltros: (filtros: SubcontratacionesFiltros) => void;
   NextPage: () => void;
   PrevPage: () => void;
   invalidateCache: () => void;

   CreateSubcontratacion: (form: CreateSubcontratacionForm) => Promise<Subcontratacion | Error>;
   UpdateSubcontratacion: (id: string, data: Partial<UpdateSubcontratacionForm>) => Promise<void | Error>;
   CambiarEstado: (id: string, estado: EstadoTrabajo) => Promise<void | Error>;
   Pagar: (id: string, data: { monto_pagado: number; metodo_pago: string; fecha: string; concepto?: string | null }) => Promise<void | Error>;
   GetSubcontratacionById: (id: string) => Promise<Subcontratacion | null>;
   GetPagos: (id: string) => Promise<PagoSubcontratacion[]>;
   GetApuntes: (id: string) => Promise<Apunte[]>;
   CrearApunte: (id: string, texto: string) => Promise<Apunte | Error>;
   DeleteSubcontratacion: (id: string, deleted_reason: string) => Promise<void | Error>;
}

export interface Apunte {
   id: string;
   subcontratacion_id: string;
   texto: string;
   created_by_name: string | null;
   created_at: string;
}

export const useSubcontratacionStore = create<State>((set, get) => ({
   subcontrataciones: [],
   resumen: RESUMEN_VACIO,
   total: 0,
   page: 1,
   pageSize: 25,
   filtros: {},
   loading: false,
   error: null,

   GetSubcontrataciones: async (filtros) => {
      const f = { ...get().filtros, ...filtros };
      set({ loading: true, error: null, filtros: f });

      const qs = new URLSearchParams();
      if (f.proveedor_id) qs.set("proveedor_id", f.proveedor_id);
      if (f.proyecto_id) qs.set("proyecto_id", f.proyecto_id);
      if (f.estado_trabajo) qs.set("estado_trabajo", f.estado_trabajo);
      if (f.estado_pago) qs.set("estado_pago", f.estado_pago);
      if (f.incluir_pagadas) qs.set("incluir_pagadas", "true");
      if (f.busqueda) qs.set("busqueda", f.busqueda);
      if (f.fecha_desde) qs.set("fecha_desde", f.fecha_desde);
      if (f.fecha_hasta) qs.set("fecha_hasta", f.fecha_hasta);
      qs.set("page", String(f.page ?? 1));
      qs.set("pageSize", String(f.pageSize ?? 25));

      try {
         const res = await fetch(`/api/subcontrataciones?${qs}`);
         const data = await res.json();
         if (!res.ok) throw new Error(data?.error ?? "Error al cargar las subcontrataciones");
         set({
            subcontrataciones: data.data,
            resumen: data.resumen,
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
         });
      } catch (e: any) {
         set({ error: e.message, subcontrataciones: [], resumen: RESUMEN_VACIO, total: 0 });
      } finally {
         set({ loading: false });
      }
   },

   SetFiltros: (filtros) => {
      set({ filtros: { ...get().filtros, ...filtros, page: 1 } });
      get().GetSubcontrataciones({ ...filtros, page: 1 });
   },

   NextPage: () => {
      const { page, pageSize, total } = get();
      if (page * pageSize >= total) return;
      get().GetSubcontrataciones({ page: page + 1 });
   },

   PrevPage: () => {
      const { page } = get();
      if (page <= 1) return;
      get().GetSubcontrataciones({ page: page - 1 });
   },

   invalidateCache: () => {
      get().GetSubcontrataciones({});
   },

   CreateSubcontratacion: async (form) => {
      try {
         const res = await fetch("/api/subcontrataciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data?.error ?? "Error al crear la subcontratación");
         await get().GetSubcontrataciones({});
         return data as Subcontratacion;
      } catch (e: any) {
         return e instanceof Error ? e : new Error(e.message ?? "Error desconocido");
      }
   },

   UpdateSubcontratacion: async (id, data) => {
      try {
         const res = await fetch(`/api/subcontrataciones/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         const responseData = await res.json();
         if (!res.ok)
            throw new Error(responseData?.error ?? responseData?.message ?? "Error al actualizar");
         await get().GetSubcontrataciones({});
      } catch (e: any) {
         return e instanceof Error ? e : new Error(e.message ?? "Error desconocido");
      }
   },

   CambiarEstado: async (id, estado) => {
      try {
         const res = await fetch(`/api/subcontrataciones/${id}/estado`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado }),
         });
         const responseData = await res.json();
         if (!res.ok)
            throw new Error(responseData?.error ?? responseData?.message ?? "Error al cambiar estado");
         await get().GetSubcontrataciones({});
      } catch (e: any) {
         return e instanceof Error ? e : new Error(e.message ?? "Error desconocido");
      }
   },

   Pagar: async (id, data) => {
      try {
         const res = await fetch(`/api/subcontrataciones/${id}/pagar`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         const responseData = await res.json();
         if (!res.ok)
            throw new Error(responseData?.error ?? responseData?.message ?? "Error al registrar pago");
         await get().GetSubcontrataciones({});
      } catch (e: any) {
         return e instanceof Error ? e : new Error(e.message ?? "Error desconocido");
      }
   },

   GetSubcontratacionById: async (id) => {
      try {
         const res = await fetch(`/api/subcontrataciones/${id}`);
         if (!res.ok) return null;
         return (await res.json()) as Subcontratacion;
      } catch {
         return null;
      }
   },

   GetPagos: async (id) => {
      try {
         const res = await fetch(`/api/subcontrataciones/${id}/pagos`);
         if (!res.ok) return [];
         return (await res.json()) as PagoSubcontratacion[];
      } catch {
         return [];
      }
   },

   GetApuntes: async (id) => {
      try {
         const res = await fetch(`/api/subcontrataciones/${id}/apuntes`);
         if (!res.ok) return [];
         return (await res.json()) as Apunte[];
      } catch {
         return [];
      }
   },

   CrearApunte: async (id, texto) => {
      try {
         const res = await fetch(`/api/subcontrataciones/${id}/apuntes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texto }),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data?.error ?? "Error al guardar el apunte");
         return data as Apunte;
      } catch (e: any) {
         return e instanceof Error ? e : new Error(e.message ?? "Error desconocido");
      }
   },

   DeleteSubcontratacion: async (id, deleted_reason) => {
      try {
         const res = await fetch(`/api/subcontrataciones/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleted_reason }),
         });
         const responseData = await res.json();
         if (!res.ok)
            throw new Error(responseData?.error ?? responseData?.message ?? "Error al eliminar");
         await get().GetSubcontrataciones({});
      } catch (e: any) {
         return e instanceof Error ? e : new Error(e.message ?? "Error desconocido");
      }
   },
}));
