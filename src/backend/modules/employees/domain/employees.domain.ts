export type TipoIdentificacion = "CEDULA" | "RNC" | "PASAPORTE";
export type TipoRolEmpleado = "OPERADOR" | "INGENIERO" | "MECANICO" | "CONTABLE" | "MENSAJERO";
export type TipoContactoEmpleado = "TELEFONO" | "EMAIL";

export interface EmployeeProps {
   id: string;
   user_id: string | null;
   nombre: string;
   identificacion: string;
   tipo_identificacion: TipoIdentificacion;
   rol: TipoRolEmpleado;
   salario: number;
   activo: boolean;
   created_at: Date;
   updated_at: Date;
}

export class Employee {
   private constructor(private readonly props: EmployeeProps) {}

   static create(props: EmployeeProps): Employee {
      return new Employee(props);
   }

   get id() { return this.props.id; }
   get user_id() { return this.props.user_id; }
   get nombre() { return this.props.nombre; }
   get identificacion() { return this.props.identificacion; }
   get tipo_identificacion() { return this.props.tipo_identificacion; }
   get rol() { return this.props.rol; }
   get salario() { return this.props.salario; }
   get activo() { return this.props.activo; }
   get created_at() { return this.props.created_at; }
   get updated_at() { return this.props.updated_at; }

   toJSON(): EmployeeProps {
      return { ...this.props };
   }
}

export interface CreateEmployeeDTO {
   user_id?: string | null;
   nombre: string;
   identificacion: string;
   tipo_identificacion: TipoIdentificacion;
   rol: TipoRolEmpleado;
   salario: number;
   activo?: boolean;
}

export interface UpdateEmployeeDTO {
   user_id?: string | null;
   nombre?: string;
   identificacion?: string;
   tipo_identificacion?: TipoIdentificacion;
   rol?: TipoRolEmpleado;
   salario?: number;
   activo?: boolean;
}

export interface ContactEmpleadoProps {
   id: string;
   empleado_id: string;
   tipo_contacto: TipoContactoEmpleado;
   contacto: string;
   created_at: Date;
   updated_at: Date;
}

export interface CreateContactEmpleadoDTO {
   empleado_id: string;
   tipo_contacto: TipoContactoEmpleado;
   contacto: string;
}

export interface UpdateContactEmpleadoDTO {
   tipo_contacto?: TipoContactoEmpleado;
   contacto?: string;
}

// Amonestación
export interface AmonestacionProps {
   id: string;
   empleado_id: string;
   fecha: Date;
   descripcion: string;
   monto_descuento: number;
   created_at: Date;
   updated_at: Date;
}

export interface CreateAmonestacionDTO {
   empleado_id: string;
   fecha: Date;
   descripcion: string;
   monto_descuento: number;
}

export interface UpdateAmonestacionDTO {
   fecha?: Date;
   descripcion?: string;
   monto_descuento?: number;
}

// Operador
export interface OperadorProps {
   id: string;
   empleado_id: string;
   licencia: string | null;
   created_at: Date;
   updated_at: Date;
}

export interface CreateOperadorDTO {
   empleado_id: string;
   licencia?: string | null;
}

export interface UpdateOperadorDTO {
   licencia?: string | null;
}

export interface IEmployeeRepository {
   findAll(): Promise<Employee[]>;
   findById(id: string): Promise<Employee | null>;
   create(data: CreateEmployeeDTO): Promise<Employee>;
   update(id: string, data: UpdateEmployeeDTO): Promise<Employee | null>;
   delete(id: string): Promise<boolean>;
   existsByIdentificacion(identificacion: string, excludeId?: string): Promise<boolean>;
}
