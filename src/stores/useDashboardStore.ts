import { create } from "zustand";
import type {
   AlertaEquipoDTO,
   CicloNominaAbiertoDTO,
   CitaProximaDTO,
   ConduceSinFirmarDTO,
   DeduccionPendienteDTO,
   FacturacionSemanalDTO,
   FlotaResumenDTO,
   FlujoMesDTO,
   LicenciaPorVencerDTO,
   OrdenCompraPendienteDTO,
   ProyectoActivoDTO,
} from "@/dtos/dashboard.dto";

/**
 * Estado de UNA fuente del panel. Cada widget se carga solo: si falla el de
 * nómina, el de flota igual pinta. Un solo objeto `loading` global apagaría
 * todo el panel por un endpoint caído.
 */
export interface Recurso<T> {
   data: T | null;
   loading: boolean;
   /** 403 = sin permiso. Se distingue del error para no gritar "falló". */
   denegado: boolean;
   error: string | null;
}

const vacio = <T,>(): Recurso<T> => ({
   data: null,
   loading: false,
   denegado: false,
   error: null,
});

type Claves =
   | "facturacion" | "flujo" | "ciclosNomina" | "deducciones"
   | "proyectos" | "flota" | "alertasEquipos" | "conducesSinFirmar"
   | "licencias" | "ordenes" | "citas";

type DashboardStore = {
   facturacion: Recurso<FacturacionSemanalDTO>;
   flujo: Recurso<FlujoMesDTO[]>;
   ciclosNomina: Recurso<CicloNominaAbiertoDTO[]>;
   deducciones: Recurso<DeduccionPendienteDTO[]>;
   proyectos: Recurso<ProyectoActivoDTO[]>;
   flota: Recurso<FlotaResumenDTO>;
   alertasEquipos: Recurso<AlertaEquipoDTO[]>;
   conducesSinFirmar: Recurso<ConduceSinFirmarDTO[]>;
   licencias: Recurso<LicenciaPorVencerDTO[]>;
   ordenes: Recurso<OrdenCompraPendienteDTO[]>;
   citas: Recurso<CitaProximaDTO[]>;

   cargar: (clave: Claves, opts?: { force?: boolean }) => Promise<void>;
   invalidar: () => void;
};

/** Endpoint de cada recurso. */
const RUTAS: Record<Claves, string> = {
   facturacion: "/api/dashboard/facturacion-semanal",
   flujo: "/api/dashboard/flujo-mensual",
   ciclosNomina: "/api/dashboard/nomina/ciclos-abiertos",
   deducciones: "/api/dashboard/nomina/deducciones-pendientes",
   proyectos: "/api/dashboard/proyectos-activos",
   flota: "/api/dashboard/flota",
   alertasEquipos: "/api/dashboard/alertas-equipos",
   conducesSinFirmar: "/api/dashboard/conduces-sin-firmar",
   licencias: "/api/dashboard/licencias-por-vencer",
   ordenes: "/api/dashboard/ordenes-pendientes",
   citas: "/api/dashboard/citas-proximas",
};

/**
 * Peticiones en vuelo, por clave.
 *
 * Varios widgets pueden montarse a la vez pidiendo lo mismo (y React 18 monta
 * dos veces en dev): sin esto se dispararían llamadas duplicadas al montar el
 * panel. Vive fuera del store porque es detalle de transporte, no estado.
 */
const enVuelo = new Map<Claves, Promise<void>>();

export const useDashboardStore = create<DashboardStore>((set, get) => ({
   facturacion: vacio<FacturacionSemanalDTO>(),
   flujo: vacio<FlujoMesDTO[]>(),
   ciclosNomina: vacio<CicloNominaAbiertoDTO[]>(),
   deducciones: vacio<DeduccionPendienteDTO[]>(),
   proyectos: vacio<ProyectoActivoDTO[]>(),
   flota: vacio<FlotaResumenDTO>(),
   alertasEquipos: vacio<AlertaEquipoDTO[]>(),
   conducesSinFirmar: vacio<ConduceSinFirmarDTO[]>(),
   licencias: vacio<LicenciaPorVencerDTO[]>(),
   ordenes: vacio<OrdenCompraPendienteDTO[]>(),
   citas: vacio<CitaProximaDTO[]>(),

   cargar: async (clave, opts) => {
      const actual = get()[clave];
      // Ya cargado y sin `force`: el panel no se re-consulta al reordenar
      // widgets ni al entrar y salir del modo edición.
      if (!opts?.force && (actual.data !== null || actual.denegado)) return;

      const pendiente = enVuelo.get(clave);
      if (pendiente) return pendiente;

      const promesa = (async () => {
         set((s) => ({ [clave]: { ...s[clave], loading: true, error: null } } as never));
         try {
            const res = await fetch(RUTAS[clave], { credentials: "include" });

            // 403 no es un fallo: es un rol que no alcanza. El widget se
            // esconde en vez de pintar una tarjeta roja.
            if (res.status === 403 || res.status === 401) {
               set(() => ({
                  [clave]: { data: null, loading: false, denegado: true, error: null },
               } as never));
               return;
            }

            if (!res.ok) {
               const cuerpo = await res.json().catch(() => null);
               throw new Error(cuerpo?.error ?? `Error ${res.status}`);
            }

            const data = await res.json();
            set(() => ({
               [clave]: { data, loading: false, denegado: false, error: null },
            } as never));
         } catch (err: unknown) {
            set(() => ({
               [clave]: {
                  data: null,
                  loading: false,
                  denegado: false,
                  error: err instanceof Error ? err.message : "Error al cargar",
               },
            } as never));
         } finally {
            enVuelo.delete(clave);
         }
      })();

      enVuelo.set(clave, promesa);
      return promesa;
   },

   invalidar: () => {
      enVuelo.clear();
      set({
         facturacion: vacio<FacturacionSemanalDTO>(),
         flujo: vacio<FlujoMesDTO[]>(),
         ciclosNomina: vacio<CicloNominaAbiertoDTO[]>(),
         deducciones: vacio<DeduccionPendienteDTO[]>(),
         proyectos: vacio<ProyectoActivoDTO[]>(),
         flota: vacio<FlotaResumenDTO>(),
         alertasEquipos: vacio<AlertaEquipoDTO[]>(),
         conducesSinFirmar: vacio<ConduceSinFirmarDTO[]>(),
         licencias: vacio<LicenciaPorVencerDTO[]>(),
         ordenes: vacio<OrdenCompraPendienteDTO[]>(),
         citas: vacio<CitaProximaDTO[]>(),
      });
   },
}));
