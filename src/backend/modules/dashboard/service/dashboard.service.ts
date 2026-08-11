import type { KyselyDashboardRepository } from "../infraestructure/dashboard.infraestructure";
import {
   UMBRALES_ALERTA_EQUIPO_DEFECTO,
   type AlertaEquipo,
   type CicloNominaAbierto,
   type CitaProxima,
   type ConduceSinFirmar,
   type DeduccionPendiente,
   type FacturacionSemanal,
   type FlotaResumen,
   type FlujoMes,
   type LicenciaPorVencer,
   type OrdenCompraPendiente,
   type ProyectoActivo,
   type UmbralesAlertaEquipo,
} from "../domain/dashboard.domain";

export class DashboardService {
   constructor(private readonly repo: KyselyDashboardRepository) { }

   facturacionSemanal(): Promise<FacturacionSemanal> {
      return this.repo.facturacionSemanal();
   }

   flujoMensual(meses = 6): Promise<FlujoMes[]> {
      // Acotado: la serie alimenta un chart, y pedir 500 meses sería una forma
      // barata de castigar la base desde el query string.
      const n = Math.min(Math.max(Math.trunc(meses) || 6, 1), 24);
      return this.repo.flujoMensual(n);
   }

   ciclosNominaAbiertos(): Promise<CicloNominaAbierto[]> {
      return this.repo.ciclosNominaAbiertos();
   }

   deduccionesPendientes(limite = 5): Promise<DeduccionPendiente[]> {
      return this.repo.deduccionesPendientes(acotar(limite, 5));
   }

   /**
    * Proyectos activos.
    *
    * `incluirMontos` es la diferencia entre los dos widgets registrados:
    * `proyectos-activos` (permiso `project`) y `proyectos-rentabilidad`
    * (permiso `finances`). Sin permiso financiero los montos salen en NULL —
    * NO en 0, porque 0 es un valor legítimo y confundirlo con "oculto" haría
    * ver como quebrado un proyecto sano.
    *
    * La decisión se toma en el servidor: si solo la tomara el cliente, la
    * respuesta ya traería los montos y bastaría abrir la pestaña de red.
    */
   async proyectosActivos(
      opts: { limite?: number; incluirMontos: boolean },
   ): Promise<ProyectoActivo[]> {
      const proyectos = await this.repo.proyectosActivos(acotar(opts.limite ?? 6, 6));
      if (opts.incluirMontos) return proyectos;

      return proyectos.map((p) => ({
         ...p,
         total_cobrable: null,
         total_gasto_interno: null,
         rentabilidad: null,
         margen_pct: null,
      }));
   }

   flotaResumen(): Promise<FlotaResumen> {
      return this.repo.flotaResumen();
   }

   alertasEquipos(
      opts: { limite?: number; umbrales?: Partial<UmbralesAlertaEquipo> } = {},
   ): Promise<AlertaEquipo[]> {
      // Los umbrales son política de taller, no verdad del dominio: se pueden
      // sobreescribir por request y el default vive en el dominio.
      const umbrales: UmbralesAlertaEquipo = {
         ...UMBRALES_ALERTA_EQUIPO_DEFECTO,
         ...(opts.umbrales ?? {}),
      };
      return this.repo.alertasEquipos(umbrales, acotar(opts.limite ?? 8, 8));
   }

   conducesSinFirmar(limite = 8): Promise<ConduceSinFirmar[]> {
      return this.repo.conducesSinFirmar(acotar(limite, 8));
   }

   licenciasPorVencer(diasAviso = 30, limite = 5): Promise<LicenciaPorVencer[]> {
      const dias = Math.min(Math.max(Math.trunc(diasAviso) || 30, 1), 365);
      return this.repo.licenciasPorVencer(dias, acotar(limite, 5));
   }

   ordenesCompraPendientes(limite = 5): Promise<OrdenCompraPendiente[]> {
      return this.repo.ordenesCompraPendientes(acotar(limite, 5));
   }

   citasProximas(dias = 7, limite = 5): Promise<CitaProxima[]> {
      const d = Math.min(Math.max(Math.trunc(dias) || 7, 1), 90);
      return this.repo.citasProximas(d, acotar(limite, 5));
   }
}

/** Limita el `?limite=` a un rango sano; un NaN cae al valor por defecto. */
function acotar(valor: number, porDefecto: number): number {
   const n = Math.trunc(Number(valor));
   if (!Number.isFinite(n) || n <= 0) return porDefecto;
   return Math.min(n, 50);
}
