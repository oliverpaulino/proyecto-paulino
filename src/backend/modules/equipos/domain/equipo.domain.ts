import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";

export const ESTADOS_EQUIPO = [
   "ACTIVO",
   "INACTIVO",
   "EN_MANTENIMIENTO",
] as const;

export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];

export interface EquipoProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   nombre: string;
   categoria_id: string;
   operador_id: string | null;
   operador_nombre: string | null;
   categoria_nombre: string;
   estado: EstadoEquipo;
   costo_por_hora: number;
   placa: string | null;
   modelo: string | null;
   ano: number | null;
   created_at: Date;
   updated_at: Date;
}

export class Equipo {
   private constructor(private readonly props: EquipoProps) { }

   static create(props: EquipoProps): Equipo {
      return new Equipo(props);
   }

   get id(): string { return this.props.id; }
   get referencia() { return this.props.referencia; }
   get codigoReferencia() {
      const ref = String(this.props.referencia).padStart(3, "0");
      return `EQU-${ref}`;
   }
   get nombre(): string { return this.props.nombre; }
   get categoria_id(): string { return this.props.categoria_id; }
   get operador_id(): string | null { return this.props.operador_id; }
   get operador_nombre(): string | null { return this.props.operador_nombre; }
   get categoria_nombre(): string { return this.props.categoria_nombre; }
   get estado(): EstadoEquipo { return this.props.estado; }
   get costo_por_hora(): number { return this.props.costo_por_hora; }
   get placa(): string | null { return this.props.placa; }
   get modelo(): string | null { return this.props.modelo; }
   get ano(): number | null { return this.props.ano; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): EquipoProps {
      return { ...this.props };
   }
}

export interface EstadoHistorialProps {
   id: string;
   equipo_id: string;
   estado_anterior: EstadoEquipo | null;
   estado_nuevo: EstadoEquipo;
   changed_by: string | null;
   changed_by_name: string | null;
   nota: string | null;
   created_at: Date;
}

export interface EquipoCompraItemProps {
   id: string;
   orden_compra_id: string;
   orden_codigo: string;
   orden_fecha: Date;
   orden_estado: string;
   descripcion: string;
   cantidad: number;
   precio_unitario: number;
   subtotal: number;
}

export interface CreateEquipoDTO {
   operador_id: string | null;
   nombre: string;
   categoria_id: string;
   estado?: EstadoEquipo;
   placa?: string | null;
   modelo?: string | null;
   ano?: number | null;
}

export interface UpdateEquipoDTO {
   nombre?: string;
   operador_id?: string | null;
   categoria_id?: string;
   estado?: EstadoEquipo;
   placa?: string | null;
   modelo?: string | null;
   ano?: number | null;
}

export interface IEquipoRepository {
   findAll(params?: { page?: number; limit?: number; search?: string }): Promise<Equipo[]>;
   findById(id: string): Promise<Equipo | null>;
   /** true si otro equipo ya usa esa placa (comparación sin mayúsculas). */
   existsPlaca(placa: string, excludeId?: string): Promise<boolean>;
   create(data: CreateEquipoDTO): Promise<Equipo>;
   update(id: string, data: UpdateEquipoDTO): Promise<Equipo | null>;
   delete(id: string): Promise<boolean>;
   findCategoriaByEquipoId(equipoId: string): Promise<CategoriaEquipo | null>;
   changeEstado(
      id: string,
      nuevoEstado: EstadoEquipo,
      changedBy?: string | null,
      changedByName?: string | null,
      nota?: string | null
   ): Promise<Equipo | null>;
   findHistorial(id: string): Promise<EstadoHistorialProps[]>;
   findComprasItems(id: string, filtros?: { desde?: string; hasta?: string }): Promise<EquipoCompraItemProps[]>;
}