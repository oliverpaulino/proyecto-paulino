export interface MedidaCobroProps {
   id: string;
   nombre: string;
   descripcion: string | null;
   permite_decimales: boolean;
   is_active: boolean;
   created_at: Date;
   updated_at: Date;
}

export class MedidaCobro {
   private constructor(private readonly props: MedidaCobroProps) { }

   static create(props: MedidaCobroProps): MedidaCobro {
      return new MedidaCobro(props);
   }

   get id(): string { return this.props.id; }
   get nombre(): string { return this.props.nombre; }
   get descripcion(): string | null { return this.props.descripcion; }
   get permite_decimales(): boolean { return this.props.permite_decimales; }
   get is_active(): boolean { return this.props.is_active; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): MedidaCobroProps {
      return { ...this.props };
   }
}

export interface CreateMedidaCobroDTO {
   nombre: string;
   descripcion?: string | null;
   permite_decimales: boolean;
   is_active: boolean;
}

export interface UpdateMedidaCobroDTO {
   nombre?: string;
   descripcion?: string;
   permite_decimales?: boolean;
   is_active?: boolean;
}

export interface IMedidaCobroRepository {
   findAll(): Promise<MedidaCobro[]>;
   findById(id: string): Promise<MedidaCobro | null>;
   create(data: CreateMedidaCobroDTO): Promise<MedidaCobro>;
   update(id: string, data: UpdateMedidaCobroDTO): Promise<MedidaCobro | null>;
   delete(id: string): Promise<boolean>;
}
