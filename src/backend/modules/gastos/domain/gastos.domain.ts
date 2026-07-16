export type EntidadResponsable = "CLIENTE" | "EMPLEADO" | "EMPRESA";

export interface GastoProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   monto_total: number;
   concepto: string;
   ncf: string;
   entidad_responsable: EntidadResponsable;
   categoria_gasto_id: string;
   
   //join categoria
   categoria_gasto_nombre: string;
   categoria_gasto_grupo: string;
   
   orden_compra_id: string | null;
   proyecto_id: string | null;
   equipo_id: string | null;
   empleado_id: string | null;
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
   get entidadResponsable() { return this.props.entidad_responsable; }
   get categoria_gasto_id() { return this.props.categoria_gasto_id; }
   get categoria_gasto_nombre() { return this.props.categoria_gasto_nombre; }
   get categoria_gasto_grupo() { return this.props.categoria_gasto_grupo; }
   get orden_compra_id() { return this.props.orden_compra_id; }
   get proyecto_id() { return this.props.proyecto_id; }
   get equipo_id() { return this.props.equipo_id; }
   get empleado_id() { return this.props.empleado_id; }
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
   ncf: string;
   fecha: Date;
   entidad_responsable: EntidadResponsable;
   categoria_gasto_id: string;
   orden_compra_id?: string | null;
   proyecto_id?: string | null;
   equipo_id?: string | null;
   empleado_id?: string | null;
}

export type UpdateGastoDTO = Partial<CreateGastoDTO>;

export interface DeleteGastoDTO {
   deleted_by?: string;
   deleted_reason?: string;
};


export interface IGastoRepository {
   findAll( params?: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     start?: Date; 
                     end?: Date; 
                     categoria?: string; 
                     grupo?: string;
                     responsable?: EntidadResponsable; 
                     orden_compra_id?: string | null;
                     proyecto_id?: string | null;
                     equipo_id?: string | null;
                     empleado_id?: string | null; }): Promise<Gasto[]>;

   findAllDeleted( params?: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     start?: Date; 
                     end?: Date; 
                     categoria?: string; 
                     grupo?: string;
                     responsable?: EntidadResponsable; 
                     orden_compra_id?: string | null;
                     proyecto_id?: string | null;
                     equipo_id?: string | null;
                     empleado_id?: string | null; }): Promise<Gasto[]>;

   findById(id: string): Promise<Gasto | null>;
   create(data: CreateGastoDTO): Promise<Gasto>;
   update(id: string, data: UpdateGastoDTO): Promise<Gasto | null>;
   delete(id: string, data: DeleteGastoDTO): Promise<boolean>;
}
