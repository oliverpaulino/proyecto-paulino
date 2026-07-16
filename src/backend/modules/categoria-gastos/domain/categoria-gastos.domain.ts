export type GrupoGasto = "OPERATIVO" | "ADMINISTRATIVO" | "FINANCIERO" | "OTRO";

export interface CategoriaGastoProps {
   id: string;
   nombre: string;
   grupo: GrupoGasto;
   created_at: Date;
   updated_at: Date;
}

export class CategoriaGasto {
   private constructor(private readonly props: CategoriaGastoProps) { }

   static create(props: CategoriaGastoProps): CategoriaGasto {
      return new CategoriaGasto(props);
   }

   get id() { return this.props.id; }
   get nombre() { return this.props.nombre; }
   get grupo() { return this.props.grupo; }
   get created_at() { return this.props.created_at; }
   get updated_at() { return this.props.updated_at; }

   toJSON(): CategoriaGastoProps {
      return { ...this.props };
   }
}

export interface CreateCategoriaGastoDTO {
   nombre: string;
   grupo: GrupoGasto;
}

export interface UpdateCategoriaGastoDTO {
   nombre?: string;
   grupo?: GrupoGasto;
}

export interface ICategoriaGastoRepository {
   findAll(params: { page?: number; 
                     limit?: number; 
                     search?: string; 
                     grupo?: GrupoGasto; }): Promise<CategoriaGasto[]>;
   findById(id: string): Promise<CategoriaGasto | null>;
   create(data: CreateCategoriaGastoDTO): Promise<CategoriaGasto>;
   update(id: string, data: UpdateCategoriaGastoDTO): Promise<CategoriaGasto | null>;
   delete(id: string): Promise<boolean>;
}
