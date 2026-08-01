// ─── Subcontrataciones ────────────────────────────────────────────────────────
//
// Registro operativo del trabajo de un subcontratista (ej. Juan el soldador).
// Es la fuente de la deuda: al crearla, el backend inserta (en la misma
// transacción) un `gasto` vinculado (gasto.proveedor_id +
// gasto.subcontratacion_id), y los pagos entran por la tabla `pago` existente
// apuntando a ese gasto.
//
//   deuda      = subcontratacion.monto_total  (== gasto.monto_total)
//   pagado     = Σ pago.monto_pagado  (pago.gasto_empresa_id == gasto.id)
//   pendiente  = monto_total − pagado
//
// Derivarlo en vez de almacenarlo evita el problema de `deduccion.balance_pendiente`:
// un campo escrito una vez que queda desincronizado en cuanto entra un pago.

export type EstadoTrabajo = "PENDIENTE" | "EN_PROGRESO" | "TERMINADA" | "CANCELADA";
export type EstadoPago = "PENDIENTE" | "PARCIAL" | "PAGADO";

/** Tolerancia de un centavo: las sumas de pagos parciales pueden dejar residuo. */
export function estadoDePago(montoTotal: number, pagado: number): EstadoPago {
   if (pagado >= montoTotal - 0.01) return "PAGADO";
   if (pagado > 0.01) return "PARCIAL";
   return "PENDIENTE";
}

export interface SubcontratacionProps {
   id: string;
   referencia: number;
   codigoReferencia: string;

   proveedor_id: string;
   proveedor_nombre: string | null;
   proveedor_tipo: string | null;
   proveedor_rnc: string | null;

   proyecto_id: string | null;
   proyecto_nombre: string | null;

   trabajo_descripcion: string | null;
   monto_total: number;
   estado_trabajo: EstadoTrabajo;
   fecha_deuda: Date;
   fecha_inicio: Date | null;
   fecha_fin: Date | null;
   observaciones: string | null;

   gasto_id: string | null;
   gasto_codigo_referencia: string | null;

   // Estado de pago derivado
   pagado: number;
   pendiente: number;
   estado_pago: EstadoPago;
   ultimo_pago_fecha: Date | null;
   cantidad_pagos: number;

   created_by: string | null;
   created_by_name: string | null;
   created_at: Date;
   updated_at: Date;
   deleted_by: string | null;
   deleted_at: Date | null;
   deleted_reason: string | null;
}

export class Subcontratacion {
   private constructor(private readonly props: SubcontratacionProps) {}

   static create(props: SubcontratacionProps): Subcontratacion {
      return new Subcontratacion(props);
   }

   get id() { return this.props.id; }
   get referencia() { return this.props.referencia; }
   get codigoReferencia() {
      const ref = String(this.props.referencia).padStart(3, "0");
      return `SUB-${ref}`;
   }
   get proveedor_id() { return this.props.proveedor_id; }
   get monto_total() { return this.props.monto_total; }
   get estado_trabajo() { return this.props.estado_trabajo; }
   get fecha_deuda() { return this.props.fecha_deuda; }
   get gasto_id() { return this.props.gasto_id; }

   toJSON(): SubcontratacionProps {
      return { ...this.props, codigoReferencia: this.codigoReferencia };
   }
}

export interface CreateSubcontratacionDTO {
   proveedor_id: string;
   proyecto_id?: string | null;
   trabajo_descripcion?: string | null;
   monto_total: number;
   estado?: EstadoTrabajo;
   fecha_deuda: Date;
   fecha_inicio?: Date | null;
   fecha_fin?: Date | null;
   observaciones?: string | null;
   /** Categoría del gasto que se genera automáticamente (obligatoria). */
   categoria_gasto_id: string;
}

export type UpdateSubcontratacionDTO = Partial<Omit<CreateSubcontratacionDTO, "categoria_gasto_id">>;

export interface CambiarEstadoDTO {
   estado: EstadoTrabajo;
}

export interface CrearPagoDTO {
   monto_pagado: number;
   metodo_pago: string;
   fecha: Date;
   concepto?: string | null;
}

export interface CrearApunteDTO {
   texto: string;
}

export interface SubcontratacionApunte {
   id: string;
   subcontratacion_id: string;
   texto: string;
   created_by_name: string | null;
   created_at: Date;
}

export interface SubcontratacionesFiltros {
   proveedor_id?: string;
   proyecto_id?: string;
   estado_trabajo?: EstadoTrabajo;
   estado_pago?: EstadoPago;
   incluir_pagadas?: boolean;
   fecha_desde?: Date;
   fecha_hasta?: Date;
   busqueda?: string;
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

export interface SubcontratacionesResult {
   data: SubcontratacionProps[];
   resumen: ResumenSubcontrataciones;
   total: number;
   page: number;
   pageSize: number;
}

export interface ISubcontratacionRepository {
   listar(filtros: SubcontratacionesFiltros): Promise<SubcontratacionesResult>;
   findById(id: string): Promise<SubcontratacionProps | null>;
   create(data: CreateSubcontratacionDTO, ctx?: { created_by?: string | null; created_by_name?: string | null }): Promise<SubcontratacionProps>;
   update(id: string, data: UpdateSubcontratacionDTO): Promise<SubcontratacionProps | null>;
   cambiarEstado(id: string, estado: EstadoTrabajo): Promise<SubcontratacionProps | null>;
   pagar(id: string, data: CrearPagoDTO): Promise<SubcontratacionProps | null>;
   listarPagos(id: string): Promise<any[]>;
   listarApuntes(id: string): Promise<SubcontratacionApunte[]>;
   crearApunte(id: string, data: CrearApunteDTO, ctx?: { created_by_name?: string | null }): Promise<SubcontratacionApunte>;
   delete(id: string, data?: { deleted_by?: string | null; deleted_reason?: string | null }): Promise<boolean>;
   restore(id: string): Promise<SubcontratacionProps | null>;
}
