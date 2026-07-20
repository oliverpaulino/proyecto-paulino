export interface CostoProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   monto_total: number;
   concepto: string;
   ncf: string;
   
   proyecto_id: string;
   //join proyecto
   proyecto_codigo_referencia: string | null;

   orden_compra_id: string | null;
   //join oc
   orden_compra_codigo_referencia: string | null;

   fecha: Date;
   created_at: Date;
   updated_at: Date;
   deleted_by: string | null;
   deleted_at: Date | null;
   deleted_reason: string | null;
}

export class Costo {
   private constructor(private readonly props: CostoProps) { }

   static create(props: CostoProps): Costo {
      return new Costo(props);
   }

   get id() { return this.props.id; }
   get referencia() { return this.props.referencia; }
   get codigoReferencia() { 
      const ref = String(this.props.referencia).padStart(3, "0");
      return `COS-${ref}`; 
   }
   get monto_total() { return this.props.monto_total; }
   get concepto() { return this.props.concepto; }
   get ncf() { return this.props.ncf; }
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
   
   toJSON(): CostoProps {
      return { ...this.props };
   }
}

export interface CreateCostoDTO {
   proyecto_id: string;
   monto_total: number;
   concepto: string;
   ncf: string;
   fecha: Date;
   orden_compra_id?: string | null;
}

export type UpdateCostoDTO = Partial<CreateCostoDTO>;

export interface DeleteCostoDTO {
   deleted_by?: string;
   deleted_reason?: string;
};

export interface ICostoRepository {
   findAll( params?: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     start?: Date; 
                     end?: Date; 
                     proyecto_id?: string;
                     orden_compra_id?: string | null; }): Promise<Costo[]>;

   findAllDeleted( params?: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     start?: Date; 
                     end?: Date; 
                     proyecto_id?: string;
                     orden_compra_id?: string | null; }): Promise<Costo[]>;

   findById(id: string): Promise<Costo | null>;
   findDeletedById(id: string): Promise<Costo | null>;
   create(data: CreateCostoDTO): Promise<Costo>;
   update(id: string, data: UpdateCostoDTO): Promise<Costo | null>;
   delete(id: string, data: DeleteCostoDTO): Promise<boolean>;
   restore(id: string): Promise<Costo | null>;
}