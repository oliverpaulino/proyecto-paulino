export type TipoServicio =
   | "REGADO"
   | "BOTE"
   | "CORTE_Y_BOTE"
   | "NIVELACION"
   | "COMPACTACION"
   | "OTRO";

export interface ServicioProps {
   id: string;
   nombre: string;
   tipo: TipoServicio;
   descripcion: string | null;
   precio_base: number;
   created_at: Date;
   updated_at: Date;
}

export class Servicio {
   private constructor(private readonly props: ServicioProps) { }

   static create(props: ServicioProps): Servicio {
      return new Servicio(props);
   }

   get id(): string { return this.props.id; }
   get nombre(): string { return this.props.nombre; }
   get tipo(): TipoServicio { return this.props.tipo; }
   get descripcion(): string | null { return this.props.descripcion; }
   get precio_base(): number { return this.props.precio_base; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): ServicioProps {
      return { ...this.props };
   }
}

export interface CreateServicioDTO {
   nombre: string;
   tipo: TipoServicio;
   descripcion?: string | null;
   precio_base?: number;
}

export interface UpdateServicioDTO {
   nombre?: string;
   tipo?: TipoServicio;
   descripcion?: string | null;
   precio_base?: number;
}

export interface IServicioRepository {
   findAll(): Promise<Servicio[]>;
   findById(id: string): Promise<Servicio | null>;
   create(data: CreateServicioDTO): Promise<Servicio>;
   update(id: string, data: UpdateServicioDTO): Promise<Servicio | null>;
   delete(id: string): Promise<boolean>;
}
