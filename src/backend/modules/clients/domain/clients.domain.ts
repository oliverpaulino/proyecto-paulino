export type TipoCliente = "FISICA" | "GUBERNAMENTAL" | "JURIDICA";
export type TipoIdentificacion = "CEDULA" | "PASAPORTE" | "RNC";

export interface ClientProps {
   id: string;
   nombre: string;
   identificacion: string;
   tipo_identificacion: TipoIdentificacion;
   tipo_cliente: TipoCliente;
   email: string | null;
   telefono: string | null;
   direccion: string | null;
   created_at: Date;
   updated_at: Date;
}

export class Client {
   private constructor(private readonly props: ClientProps) { }

   static create(props: ClientProps): Client {
      return new Client(props);
   }

   get id() { return this.props.id; }
   get nombre() { return this.props.nombre; }
   get identificacion() { return this.props.identificacion; }
   get tipo_identificacion() { return this.props.tipo_identificacion; }
   get tipo_cliente() { return this.props.tipo_cliente; }
   get email() { return this.props.email; }
   get telefono() { return this.props.telefono; }
   get direccion() { return this.props.direccion; }
   get created_at() { return this.props.created_at; }
   get updated_at() { return this.props.updated_at; }

   toJSON(): ClientProps {
      return { ...this.props };
   }
}

export interface CreateClientDTO {
   nombre: string;
   identificacion: string;
   tipo_identificacion: TipoIdentificacion;
   tipo_cliente: TipoCliente;
   email?: string | null;
   telefono?: string | null;
   direccion?: string | null;
}

export interface UpdateClientDTO {
   nombre?: string;
   identificacion?: string;
   tipo_identificacion?: TipoIdentificacion;
   tipo_cliente?: TipoCliente;
   email?: string | null;
   telefono?: string | null;
   direccion?: string | null;
}

export interface ContactClientProps {
   id: string;
   client_id: string;
   name: string;
   email?: string | null;
   phone?: string | null;
   job_title?: string | null;
   created_at: Date;
   updated_at: Date;
}

export interface IClientRepository {
   findAll(): Promise<Client[]>;
   findById(id: string): Promise<Client | null>;
   create(data: CreateClientDTO): Promise<Client>;
   update(id: string, data: UpdateClientDTO): Promise<Client | null>;
   delete(id: string): Promise<boolean>;
   
   // Relaciones
   getContactsByClientId(clientId: string): Promise<ContactClientProps[]>;
   createContact(data: ContactClientProps): Promise<ContactClientProps>;
   updateContact(id: string, clientId: string, data: Partial<ContactClientProps>): Promise<ContactClientProps>;
   deleteContact(id: string, clientId: string): Promise<boolean>;
}