export const TIPOS_MANTENIMIENTO = ["PREVENTIVO", "CORRECTIVO"] as const;
export type TipoMantenimiento = (typeof TIPOS_MANTENIMIENTO)[number];

export const ESTADOS_MANTENIMIENTO = ["EN_PROCESO", "COMPLETADO"] as const;
export type EstadoMantenimiento = (typeof ESTADOS_MANTENIMIENTO)[number];

/** Un gasto enlazado a un mantenimiento, con lo necesario para mostrarlo. */
export interface MantenimientoGastoProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   concepto: string;
   monto_total: number;
   fecha: Date;
   categoria_gasto_nombre: string | null;
}

export interface MantenimientoProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   equipo_id: string;
   // join equipo
   equipo_nombre: string;
   equipo_referencia: number;
   equipo_placa: string | null;
   tipo: TipoMantenimiento;
   estado: EstadoMantenimiento;
   descripcion: string;
   taller: string | null;
   trabajo_realizado: string | null;
   /** Igual a la suma de `gastos` cuando hay enlazados; si no, capturado a mano. */
   costo: number | null;
   gastos: MantenimientoGastoProps[];
   fecha_inicio: Date;
   fecha_fin: Date | null;
   created_by: string | null;
   created_by_name: string | null;
   closed_by: string | null;
   closed_by_name: string | null;
   created_at: Date;
   updated_at: Date;
}

export class Mantenimiento {
   private constructor(private readonly props: MantenimientoProps) { }

   static create(props: MantenimientoProps): Mantenimiento {
      return new Mantenimiento(props);
   }

   get id() { return this.props.id; }
   get referencia() { return this.props.referencia; }
   get codigoReferencia() {
      const ref = String(this.props.referencia).padStart(3, "0");
      return `MNT-${ref}`;
   }
   get equipo_id() { return this.props.equipo_id; }
   get tipo() { return this.props.tipo; }
   get estado() { return this.props.estado; }
   get descripcion() { return this.props.descripcion; }
   get taller() { return this.props.taller; }
   get trabajo_realizado() { return this.props.trabajo_realizado; }
   get costo() { return this.props.costo; }
   get gastos() { return this.props.gastos; }
   get fecha_inicio() { return this.props.fecha_inicio; }
   get fecha_fin() { return this.props.fecha_fin; }
   get abierto() { return this.props.fecha_fin === null; }
   get created_at() { return this.props.created_at; }
   get updated_at() { return this.props.updated_at; }

   toJSON(): MantenimientoProps {
      return { ...this.props };
   }
}

export interface CreateMantenimientoDTO {
   equipo_id: string;
   tipo?: TipoMantenimiento;
   descripcion: string;
   taller?: string | null;
   fecha_inicio?: Date | string;
   // Un mantenimiento puede registrarse ya cerrado (registro retroactivo desde
   // /dashboard/mantenimientos), en cuyo caso trae fecha_fin y costo de una vez.
   fecha_fin?: Date | string | null;
   trabajo_realizado?: string | null;
   costo?: number | null;
   gasto_ids?: string[];
   crear_gasto?: boolean;
   categoria_gasto_id?: string | null;
   created_by?: string | null;
   created_by_name?: string | null;
}

export interface UpdateMantenimientoDTO {
   tipo?: TipoMantenimiento;
   descripcion?: string;
   taller?: string | null;
   trabajo_realizado?: string | null;
   costo?: number | null;
   /** Reemplaza el conjunto completo de gastos enlazados. */
   gasto_ids?: string[];
   fecha_inicio?: Date | string;
   fecha_fin?: Date | string | null;
}

/**
 * Cierre de un mantenimiento. Las dos vías de registrar el costo no son
 * excluyentes: se pueden enlazar varios gastos ya registrados (`gasto_ids`) y
 * además crear uno nuevo (`crear_gasto` + `categoria_gasto_id`) para lo que
 * todavía no estuviera capturado.
 */
export interface CloseMantenimientoDTO {
   trabajo_realizado: string;
   fecha_fin?: Date | string;
   costo?: number | null;
   crear_gasto?: boolean;
   categoria_gasto_id?: string | null;
   /** Monto del gasto nuevo; si se omite se usa `costo`. */
   monto_gasto_nuevo?: number | null;
   gasto_ids?: string[];
   closed_by?: string | null;
   closed_by_name?: string | null;
}

export interface MantenimientoFilters {
   page?: number;
   limit?: number;
   search?: string;
   equipo_id?: string;
   estado?: EstadoMantenimiento;
   tipo?: TipoMantenimiento;
   start?: Date;
   end?: Date;
}

export interface IMantenimientoRepository {
   findAll(params?: MantenimientoFilters): Promise<Mantenimiento[]>;
   findById(id: string): Promise<Mantenimiento | null>;
   findByEquipoId(equipoId: string): Promise<Mantenimiento[]>;
   findAbiertoByEquipoId(equipoId: string): Promise<Mantenimiento | null>;
   create(data: CreateMantenimientoDTO): Promise<Mantenimiento>;
   update(id: string, data: UpdateMantenimientoDTO): Promise<Mantenimiento | null>;
   close(id: string, data: CloseMantenimientoDTO): Promise<Mantenimiento | null>;
   delete(id: string): Promise<boolean>;
}
