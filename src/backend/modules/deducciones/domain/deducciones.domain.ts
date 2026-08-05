export interface DeduccionProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   monto_total: number;
   balance_pendiente: number | null;
   cuotas_sugeridas: number;
   monto_sugerido: number;
   concepto: string;
   
   empleado_id: string;
   //join empleado
   empleado_codigo_referencia: string | null;
   empleado_nombre: string | null;

   equipo_id: string | null;
   //join equipo
   equipo_codigo_referencia: string | null;

   gasto_id: string | null;
   //join gasto
   gasto_codigo_referencia: string | null;

   fecha: Date;
   created_at: Date;
   updated_at: Date;
   deleted_by: string | null;
   deleted_at: Date | null;
   deleted_reason: string | null;
}

export class Deduccion {
   private constructor(private readonly props: DeduccionProps) { }

   static create(props: DeduccionProps): Deduccion {
      return new Deduccion(props);
   }

   get id() { return this.props.id; }
   get referencia() { return this.props.referencia; }
   get codigoReferencia() { 
      const ref = String(this.props.referencia).padStart(3, "0");
      return `DED-${ref}`; 
   }
   get monto_total() { return this.props.monto_total; }
   get balance_pendiente() { return this.props.balance_pendiente; }
   get cuotas_sugeridas() { return this.props.cuotas_sugeridas; }
   get monto_sugerido() {
      if (!this.props.cuotas_sugeridas || this.props.cuotas_sugeridas <= 0) return 0;
      return this.props.monto_total / this.props.cuotas_sugeridas;
   }
   get concepto() { return this.props.concepto; }
   get empleado_id() { return this.props.empleado_id; }
   get empleado_codigo_referencia() { return this.props.empleado_codigo_referencia; }
   get empleado_nombre() { return this.props.empleado_nombre; }
   get equipo_id() { return this.props.equipo_id; }
   get equipo_codigo_referencia() { return this.props.equipo_codigo_referencia; }
   get gasto_id() { return this.props.gasto_id; }
   get gasto_codigo_referencia() { return this.props.gasto_codigo_referencia; }
   get fecha() { return this.props.fecha; }
   get created_at() { return this.props.created_at; }
   get updated_at() { return this.props.updated_at; }
   get deleted_by() { return this.props.deleted_by; }
   get deleted_at() { return this.props.deleted_at; }
   get deleted_reason() { return this.props.deleted_reason; }
   
   toJSON(): DeduccionProps {
      return { ...this.props, monto_sugerido: this.monto_sugerido };
   }
}

export interface CreateDeduccionDTO {
   empleado_id: string;
   equipo_id?: string | null;
   gasto_id?: string | null;
   monto_total: number;
   balance_pendiente?: number | null;
   cuotas_sugeridas?: number;
   concepto: string;
   fecha: Date;
}

export type UpdateDeduccionDTO = Partial<CreateDeduccionDTO>;

export interface DeleteDeduccionDTO {
   deleted_by?: string;
   deleted_reason?: string;
};

export interface IDeduccionRepository {
   findAll( params?: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     start?: Date; 
                     end?: Date; 
                     empleado_id?: string;
                     equipo_id?: string | null; }): Promise<Deduccion[]>;

   findAllDeleted( params?: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     start?: Date; 
                     end?: Date; 
                     empleado_id?: string;
                     equipo_id?: string | null; }): Promise<Deduccion[]>;

   findById(id: string): Promise<Deduccion | null>;
   findDeletedById(id: string): Promise<Deduccion | null>;
   create(data: CreateDeduccionDTO): Promise<Deduccion>;
   update(id: string, data: UpdateDeduccionDTO): Promise<Deduccion | null>;
   delete(id: string, data: DeleteDeduccionDTO): Promise<boolean>;
   restore(id: string): Promise<Deduccion | null>;
}