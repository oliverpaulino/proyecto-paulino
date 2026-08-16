import { PaginatedResult } from "@/backend/shared/pagination";

export interface GastoProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   monto_total: number;
   concepto: string;
   ncf: string | null;
   
   categoria_gasto_id: string;
   //join categoria
   categoria_gasto_nombre: string;
   categoria_gasto_grupo: string;
   
   orden_compra_id: string | null;
   //join oc
   orden_compra_codigo_referencia: string | null;

   proyecto_id: string | null;
   //join proyecto
   proyecto_codigo_referencia: string | null;

   equipo_id: string | null;
   //join equipo
   equipo_codigo_referencia: string | null;

   cobrable_proyecto: boolean;
   cobrable_monto: number | null;

   // Ítem facturable: cantidad (default 1) y precio unitario (null = se cae al
   // monto a cobrar en la factura). Si cantidad > 1, monto_total = cantidad × monto_unitario.
   cantidad: number;
   monto_unitario: number | null;

   fecha: Date;
   created_at: Date;
   updated_at: Date;
   deleted_by: string | null;
   deleted_at: Date | null;
   deleted_reason: string | null;
}

export class Gasto {
   private constructor(private readonly props: GastoProps) { }

   static create(props: GastoProps): Gasto {
      return new Gasto(props);
   }

   get id() { return this.props.id; }
   get referencia() { return this.props.referencia; }
   get codigoReferencia() { const ref = String(this.props.referencia).padStart(3, "0");
                            return `GAS-${ref}`; }
   get monto_total() { return this.props.monto_total; }
   get concepto() { return this.props.concepto; }
   get ncf() { return this.props.ncf; }
   get categoria_gasto_id() { return this.props.categoria_gasto_id; }
   get categoria_gasto_nombre() { return this.props.categoria_gasto_nombre; }
   get categoria_gasto_grupo() { return this.props.categoria_gasto_grupo; }
   get orden_compra_id() { return this.props.orden_compra_id; }
   get orden_compra_codigo_referencia() { return this.props.orden_compra_codigo_referencia; }
   get proyecto_id() { return this.props.proyecto_id; }
   get proyecto_codigo_referencia() { return this.props.proyecto_codigo_referencia; }
   get equipo_id() { return this.props.equipo_id; }
   get equipo_codigo_referencia() { return this.props.equipo_codigo_referencia; }
    get cobrable_proyecto() { return this.props.cobrable_proyecto; }
    get cobrable_monto() { return this.props.cobrable_monto; }
    get cantidad() { return this.props.cantidad; }
    get monto_unitario() { return this.props.monto_unitario; }
    get fecha() { return this.props.fecha }
   get created_at() { return this.props.created_at; }
   get updated_at() { return this.props.updated_at; }
   get deleted_by() { return this.props.deleted_by; }
   get deleted_at() { return this.props.deleted_at; }
   get deleted_reason() { return this.props.deleted_reason; }
   

   toJSON(): GastoProps {
      return { ...this.props };
   }
}

export interface CreateGastoDTO {
   monto_total: number;
   concepto: string;
   ncf?: string | null;
   fecha: Date;
   categoria_gasto_id: string;
   orden_compra_id?: string | null;
   proyecto_id?: string | null;
   equipo_id?: string | null;
   cobrable_proyecto?: boolean;
   cobrable_monto?: number | null;
   /** Cantidad de ítems facturables (default 1). Si > 1, monto_total se deriva como cantidad × monto_unitario. */
   cantidad?: number;
   monto_unitario?: number | null;
   deduccion?: CreateGastoDeduccionDTO;
}

export interface CreateGastoDeduccionDTO {
   empleado_id: string;
   equipo_id?: string | null;
   monto_total: number;
   balance_pendiente?: number | null;
   cuotas_sugeridas?: number;
   /** Monto descontado por nómina. Default: monto_total ÷ cuotas_sugeridas. */
   monto_cuota?: number;
   concepto: string;
   fecha: Date;
}

export interface MoveCobrableDTO {
   cobrable_proyecto: boolean;
   cobrable_monto?: number | null;
}

export type UpdateGastoDTO = Omit<Partial<CreateGastoDTO>, "deduccion">;

export interface DeleteGastoDTO {
   deleted_by?: string;
   deleted_reason?: string;
};


export type GastosParams = {
   page?: number;
   limit?: number;
   search?: string;
   start?: Date;
   end?: Date;
   categoria?: string;
   grupo?: string;
   orden_compra_id?: string | null;
   proyecto_id?: string | null;
   equipo_id?: string | null;
   cobrable_proyecto?: boolean;
};

export interface IGastoRepository {
   findAll(params?: GastosParams): Promise<PaginatedResult<Gasto>>;
   findAllDeleted(params?: GastosParams): Promise<PaginatedResult<Gasto>>;

   findById(id: string): Promise<Gasto | null>;
   findDeletedById(id: string): Promise<Gasto | null>;
   create(data: CreateGastoDTO): Promise<Gasto>;
   createWithDeduccion(data: CreateGastoDTO): Promise<Gasto>;
   update(id: string, data: UpdateGastoDTO): Promise<Gasto | null>;
   delete(id: string, data: DeleteGastoDTO): Promise<boolean>;
   restore(id: string): Promise<Gasto | null>;
}
