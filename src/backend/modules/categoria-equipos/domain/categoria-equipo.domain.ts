export interface TarifaCategoriaProps {
   id?: string;
   nombre: string;
   medida_cobro_id: string;
   precio_unitario: number;
   cobra_minimo: number | null;
}

export interface CategoriaEquipoProps {
   id: string;
   nombre: string;
   tarifas: TarifaCategoriaProps[]; // Relación uno a muchos
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
   get tarifas(): TarifaCategoriaProps[] { return this.props.tarifas; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): CategoriaEquipoProps {
      return { ...this.props };
   }
}

export interface CreateCategoriaEquipoDTO {
   nombre: string;
   tarifas: TarifaCategoriaProps[]; // Se envían las tarifas al crear
}

export interface UpdateCategoriaEquipoDTO {
   nombre?: string;
   tarifas?: TarifaCategoriaProps[];
}

export interface ICategoriaEquipoRepository {
   findAll(): Promise<CategoriaEquipo[]>;
   findById(id: string): Promise<CategoriaEquipo | null>;
   create(data: CreateCategoriaEquipoDTO): Promise<CategoriaEquipo>;
   update(id: string, data: UpdateCategoriaEquipoDTO): Promise<CategoriaEquipo | null>;
   delete(id: string): Promise<boolean>;
}