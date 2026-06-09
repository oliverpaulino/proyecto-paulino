export interface ItemProps {
   id: string;
   nombre: string;
   tipo_id: string;
   descripcion: string | null;
   unidad: string | null;
   stock: number;
   created_at: Date;
   updated_at: Date;
   // joined from tipo_item, present on reads only
   tipo_nombre?: string | null;
}

export class Item {
   private constructor(private readonly props: ItemProps) { }

   static create(props: ItemProps): Item {
      return new Item(props);
   }

   get id(): string { return this.props.id; }
   get nombre(): string { return this.props.nombre; }
   get tipo_id(): string { return this.props.tipo_id; }
   get descripcion(): string | null { return this.props.descripcion; }
   get unidad(): string | null { return this.props.unidad; }
   get stock(): number { return this.props.stock; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): ItemProps {
      return { ...this.props };
   }
}

export interface CreateItemDTO {
   nombre: string;
   tipo_id: string;
   descripcion?: string | null;
   unidad?: string | null;
   stock?: number;
}

export interface UpdateItemDTO {
   nombre?: string;
   tipo_id?: string;
   descripcion?: string | null;
   unidad?: string | null;
   stock?: number;
}

export interface IItemRepository {
   findAll(): Promise<Item[]>;
   findById(id: string): Promise<Item | null>;
   create(data: CreateItemDTO): Promise<Item>;
   update(id: string, data: UpdateItemDTO): Promise<Item | null>;
   delete(id: string): Promise<boolean>;
}
