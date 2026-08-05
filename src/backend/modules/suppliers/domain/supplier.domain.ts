export type TipoProveedor = "SUPLIDOR" | "SUB_CONTRATISTA" | "AMBOS";

export interface SupplierProps {
   id: string;
   referencia: number;
   codigoReferencia: string;
   nombre: string;
   tipo: TipoProveedor;
   rnc: string;
   telefono: string | null;
   email: string | null;
   direccion: string | null;
   created_at: Date;
   updated_at: Date;
}

export class Supplier {
   private constructor(private readonly props: SupplierProps) { }

   static create(props: SupplierProps): Supplier {
      return new Supplier(props);
   }

   get id(): string { return this.props.id; }
   get referencia() { return this.props.referencia; }
   get codigoReferencia() { const ref = String(this.props.referencia).padStart(3, "0");
                            return `PRO-${ref}`; }
   get nombre(): string { return this.props.nombre; }
   get tipo(): TipoProveedor { return this.props.tipo; }
   get rnc(): string { return this.props.rnc; }
   get email(): string | null { return this.props.email; }
   get telefono(): string | null { return this.props.telefono; }
   get direccion(): string | null { return this.props.direccion; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): SupplierProps {
      return { ...this.props };
   }
}

export interface CreateSupplierDTO {
   nombre: string;
   tipo: TipoProveedor;
   rnc: string;
   telefono?: string | null;
   email?: string | null;
   direccion?: string | null;
}

export interface UpdateSupplierDTO {
   nombre?: string;
   tipo?: TipoProveedor;
   rnc?: string;
   telefono?: string | null;
   email?: string | null;
   direccion?: string | null;
}

export interface ISupplierRepository {
   findAll(): Promise<Supplier[]>;
   findById(id: string): Promise<Supplier | null>;
   create(data: CreateSupplierDTO): Promise<Supplier>;
   update(id: string, data: UpdateSupplierDTO): Promise<Supplier | null>;
   delete(id: string): Promise<boolean>;
}
