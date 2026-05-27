export type TipoIdentificacion = "CEDULA" | "PASAPORTE";
export type TipoRolEmpleado = "INGENIERO" | "SECRETARIO" | "CAMIONERO";

export interface EmployeeProps {
   id: string;
   user_id: string | null;
   nombre: string;
   identificacion: string;
   tipo_identificacion: TipoIdentificacion;
   rolEmpleado: TipoRolEmpleado;
   email: string | null;
   telefono: string | null;
   salario: number;
   activo: boolean;
   created_at: Date;
   updated_at: Date;
}

export class Employee {
   private constructor(private readonly props: EmployeeProps) { }

   static create(props: EmployeeProps): Employee {
      return new Employee(props);
   }

   get id() { return this.props.id; }
   get user_id() { return this.props.user_id; }
   get nombre() { return this.props.nombre; }
   get identificacion() { return this.props.identificacion; }
   get tipo_identificacion() { return this.props.tipo_identificacion; }
   get email() { return this.props.email; }
   get telefono() { return this.props.telefono; }
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
   rolEmpleado: TipoRolEmpleado;
   email?: string | null;
   telefono?: string | null;
   salario: number;
}

export interface UpdateEmployeeDTO {
   user_id?: string | null;
   nombre?: string;
   identificacion?: string;
   tipo_identificacion?: TipoIdentificacion;
   rolEmpleado?: TipoRolEmpleado;
   email?: string | null;
   telefono?: string | null;
   salario?: number;
}

export interface IEmployeeRepository {
   findAll(): Promise<Employee[]>;
   findById(id: string): Promise<Employee | null>;
   create(data: CreateEmployeeDTO): Promise<Employee>;
   update(id: string, data: UpdateEmployeeDTO): Promise<Employee | null>;
   delete(id: string): Promise<boolean>;
}