export type MetodoPago = 'CHEQUE' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'DESCUENTO_NOMINA';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA';

export interface PagoProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   metodo_pago: MetodoPago | string;
   monto_pagado: number;
   concepto: string;
   tipo_movimiento: TipoMovimiento | string;
   
   gasto_empresa_id: string | null;
   // join
   gasto_codigo_referencia: string | null;

   deduccion_empleado_id: string | null;
   // join
   deduccion_codigo_referencia: string | null;

   // ENTRADA de cuentas por cobrar: pago de un cliente contra un conduce
   // cobrable. Mutuamente excluyente con los orígenes de salida.
   conduce_id: string | null;
   // join — `conduce` no tiene `referencia` numérica: se muestra el folio.
   conduce_numero_referencia: string | null;

   proyecto_id: string | null;
   // join
   proyecto_codigo_referencia: string | null;

   orden_compra_id: string | null;
   // join
   orden_compra_codigo_referencia: string | null;

   fecha: Date;
   created_at: Date;
   updated_at: Date;
   deleted_by: string | null;
   deleted_at: Date | null;
   deleted_reason: string | null;
}

export class Pago {
   private constructor(private readonly props: PagoProps) { }

   static create(props: PagoProps): Pago {
      return new Pago(props);
   }

   get id() { return this.props.id; }
   get referencia() { return this.props.referencia; }
   get codigoReferencia() { 
      const ref = String(this.props.referencia).padStart(3, "0");
      return `PAG-${ref}`; 
   }
   get metodo_pago() { return this.props.metodo_pago; }
   get monto_pagado() { return this.props.monto_pagado; }
   get concepto() { return this.props.concepto; }
   get tipo_movimiento() { return this.props.tipo_movimiento; }
   get gasto_empresa_id() { return this.props.gasto_empresa_id; }
   get gasto_codigo_referencia() { return this.props.gasto_codigo_referencia; }
   get deduccion_empleado_id() { return this.props.deduccion_empleado_id; }
   get deduccion_codigo_referencia() { return this.props.deduccion_codigo_referencia; }
   get conduce_id() { return this.props.conduce_id; }
   get conduce_numero_referencia() { return this.props.conduce_numero_referencia; }
   get proyecto_id() { return this.props.proyecto_id; }
   get proyecto_codigo_referencia() { return this.props.proyecto_codigo_referencia; }
   get orden_compra_id() { return this.props.orden_compra_id; }
   get orden_compra_codigo_referencia() { return this.props.orden_compra_codigo_referencia; }
   get fecha() { return this.props.fecha }
   get created_at() { return this.props.created_at; }
   get updated_at() { return this.props.updated_at; }
   get deleted_by() { return this.props.deleted_by; }
   get deleted_at() { return this.props.deleted_at; }
   get deleted_reason() { return this.props.deleted_reason; }
   
   toJSON(): PagoProps {
      return { ...this.props, codigoReferencia: this.codigoReferencia };
   }
}

export interface CreatePagoDTO {
   metodo_pago: MetodoPago | string;
   monto_pagado: number;
   concepto: string;
   tipo_movimiento: TipoMovimiento | string;
   fecha: Date;
   gasto_empresa_id?: string | null;
   deduccion_empleado_id?: string | null;
   conduce_id?: string | null;
   proyecto_id?: string | null;
   orden_compra_id?: string | null;
}

export type UpdatePagoDTO = Partial<CreatePagoDTO>;

export interface DeletePagoDTO {
   deleted_by?: string;
   deleted_reason?: string;
};

export interface SaldoPendienteOrdenCompra {
   total: number;
   pagado: number;
   estado: string;
}

export interface SaldoPendienteConduce {
   conduce_id: string;
   monto_total: number;
   pagado: number;
   cliente_id: string;
}

export interface IPagoRepository {
   findAll( params?: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     start?: Date; 
                     end?: Date; 
                     gasto_empresa_id?: string | null;
                     deduccion_empleado_id?: string | null;
                     conduce_id?: string | null;
                     proyecto_id?: string | null;
                     orden_compra_id?: string | null; }): Promise<Pago[]>;

   findAllDeleted( params?: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     start?: Date; 
                     end?: Date; 
                     gasto_empresa_id?: string | null;
                     deduccion_empleado_id?: string | null;
                     conduce_id?: string | null;
                     proyecto_id?: string | null;
                     orden_compra_id?: string | null; }): Promise<Pago[]>;

   findById(id: string): Promise<Pago | null>;
   findDeletedById(id: string): Promise<Pago | null>;
   create(data: CreatePagoDTO): Promise<Pago>;
   update(id: string, data: UpdatePagoDTO): Promise<Pago | null>;
   delete(id: string, data: DeletePagoDTO): Promise<boolean>;
   restore(id: string): Promise<Pago | null>;

   /** Total y pagado directo de una OC. `null` si la orden no existe. */
   getSaldoPendienteOrdenCompra(ordenCompraId: string): Promise<SaldoPendienteOrdenCompra | null>;

   /** Total y pagado directo de un conduce. `null` si el conduce no existe. */
   getSaldoPendienteConduce(conduceId: string): Promise<SaldoPendienteConduce | null>;
}