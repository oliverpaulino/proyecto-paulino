import { Operator } from "kysely";

export type TipoIdentificacion = "CEDULA" | "RNC" | "PASAPORTE";
export type TipoRolEmpleado = "OPERADOR" | "INGENIERO" | "MECANICO" | "CONTABLE" | "MENSAJERO";
export interface EmployeeProps {
   id: string;
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
   private constructor(private readonly props: EmployeeProps) { }

   static create(props: EmployeeProps): Employee {
      return new Employee(props);
   }

   get id() { return this.props.id; }
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
   nombre: string;
   identificacion: string;
   tipo_identificacion: TipoIdentificacion;
   rol: TipoRolEmpleado;
   salario: number;
   activo?: boolean;
}

export interface UpdateEmployeeDTO {
   nombre?: string;
   identificacion?: string;
   tipo_identificacion?: TipoIdentificacion;
   rol?: TipoRolEmpleado;
   salario?: number;
   activo?: boolean;
}

// Contacto Empleado
export interface ContactEmpleadoProps {
   id: string;
   empleado_id: string;
   name: string;
   email: string | null;
   phone: string | null;
   job_title: string | null;
   created_at: Date;
   updated_at: Date;
}

export interface CreateContactEmpleadoDTO {
   empleado_id: string;
   name: string;
   email?: string | null;
   phone?: string | null;
   job_title?: string | null;
}

export interface UpdateContactEmpleadoDTO {
   name?: string;
   email?: string | null;
   phone?: string | null;
   job_title?: string | null;
}

// Operador
export interface OperadorProps {
   toJSON(): any;
   id: string;
   empleado_id: string;
   licencia: string | null;
   nombre: string;
   identificacion: string;
   fecha_vencimiento?: Date | null;
   created_at: Date;
   updated_at: Date;

}

export interface CreateOperadorDTO {
   empleado_id: string;
   licencia?: string | null;
   licencia_vencimiento?: Date | null;
}

export interface UpdateOperadorDTO {
   licencia?: string | null;
   licencia_vencimiento?: Date | null;
}

export interface IEmployeeRepository {
   findAll(params?: { page?: number; limit?: number; search?: string }): Promise<Employee[]>;
   findAllOperators(params?: { page?: number; limit?: number; search?: string }): Promise<OperadorProps[]>;
   findById(id: string): Promise<Employee | null>;
   findOperatorById(id: string): Promise<OperadorProps | null>;
   create(data: CreateEmployeeDTO): Promise<Employee>;
   update(id: string, data: UpdateEmployeeDTO): Promise<Employee | null>;
   delete(id: string): Promise<boolean>;
   existsByIdentificacion(identificacion: string, excludeId?: string): Promise<boolean>;

   // Relaciones
   getContactsByEmployeeId(empleadoId: string): Promise<ContactEmpleadoProps[]>;
   getOperatorByEmployeeId(empleadoId: string): Promise<OperadorProps | null>;
   createContact(data: ContactEmpleadoProps): Promise<ContactEmpleadoProps>;
   updateContact(id: string, data: Partial<ContactEmpleadoProps>): Promise<ContactEmpleadoProps>;
   deleteContact(id: string): Promise<boolean>;
   createOperator(data: OperadorProps): Promise<OperadorProps>;
   updateOperator(id: string, data: Partial<OperadorProps>): Promise<OperadorProps>;
}