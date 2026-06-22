export interface TipoItemProps {
   id: string;
   nombre: string;
   descripcion: string | null;
   created_at: Date;
   updated_at: Date;
}

export class TipoItem {
   private constructor(private readonly props: TipoItemProps) { }

   static create(props: TipoItemProps): TipoItem {
      return new TipoItem(props);
   }

   get id(): string { return this.props.id; }
   get nombre(): string { return this.props.nombre; }
   get descripcion(): string | null { return this.props.descripcion; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): TipoItemProps {
      return { ...this.props };
   }
}

export interface CreateTipoItemDTO {
   nombre: string;
   descripcion?: string | null;
}

export interface UpdateTipoItemDTO {
   nombre?: string;
   descripcion?: string | null;
}

export interface ITipoItemRepository {
   findAll(): Promise<TipoItem[]>;
   findById(id: string): Promise<TipoItem | null>;
   create(data: CreateTipoItemDTO): Promise<TipoItem>;
   update(id: string, data: UpdateTipoItemDTO): Promise<TipoItem | null>;
   delete(id: string): Promise<boolean>;
}
