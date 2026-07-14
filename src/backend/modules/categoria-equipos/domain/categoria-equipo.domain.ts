export interface CategoriaEquipoProps {
   id: string;
   nombre: string;
   cobra_en: string;
   cobra_minimo: number | null;
   precio_unitario: number | null;
   medida_cobro_id: string;
   created_at: Date;
   updated_at: Date;
}

export class CategoriaEquipo {
   private constructor(private readonly props: CategoriaEquipoProps) { }

   static create(props: CategoriaEquipoProps): CategoriaEquipo {
      return new CategoriaEquipo(props);
   }

   get id(): string { return this.props.id; }
   get nombre(): string { return this.props.nombre; }
   get cobra_en(): string { return this.props.cobra_en; }
   get cobra_minimo(): number | null { return this.props.cobra_minimo; }
   get precio_unitario(): number | null { return this.props.precio_unitario; }
   get medida_cobro_id(): string { return this.props.medida_cobro_id; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): CategoriaEquipoProps {
      return { ...this.props };
   }
}

export interface CreateCategoriaEquipoDTO {
   nombre: string;
   cobra_en: string;
   cobra_minimo?: number | null;
   medida_cobro_id: string;
   precio_unitario?: number | null;
}

export interface UpdateCategoriaEquipoDTO {
   nombre?: string;
   cobra_en?: string;
   cobra_minimo?: number | null;
   medida_cobro_id?: string;
   precio_unitario?: number | null;
}

export interface ICategoriaEquipoRepository {
   findAll(): Promise<CategoriaEquipo[]>;
   findById(id: string): Promise<CategoriaEquipo | null>;
   create(data: CreateCategoriaEquipoDTO): Promise<CategoriaEquipo>;
   update(id: string, data: UpdateCategoriaEquipoDTO): Promise<CategoriaEquipo | null>;
   delete(id: string): Promise<boolean>;
}
