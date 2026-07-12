export type EstadoCita = "PENDIENTE" | "ASIGNADA" | "REALIZADA" | "CANCELADA";

export interface AppointmentProps {
    id: string;
    cliente_id: string | null;
    employee_id: string | null;
    fecha: Date;
    motivo: string | null;
    estado: EstadoCita;
    notas: string | null;
    created_at: Date;
    updated_at: Date;
}

export class Appointment {
    private constructor(private readonly props: AppointmentProps) {}
    
    static create(props: AppointmentProps): Appointment {
         return new Appointment(props);
    }

    get id() { return this.props.id; }
    get cliente_id() { return this.props.cliente_id; }
    get employee_id() { return this.props.employee_id; }
    get fecha() { return this.props.fecha; }
    get motivo() { return this.props.motivo; }
    get estado() { return this.props.estado; }
    get notas() { return this.props.notas; }
    get created_at() { return this.props.created_at; }
    get updated_at() { return this.props.updated_at; }

    toJSON(): AppointmentProps {
        return { ...this.props };
    }
}

export interface CreateAppointmentDTO {
    cliente_id?: string | null;
    employee_id?: string | null;
    fecha: Date;
    motivo?: string | null;
    estado: EstadoCita;
    notas?: string | null;
}

export type UpdateAppointmentDTO = Partial<CreateAppointmentDTO>;

export interface AppointmentUIProps extends AppointmentProps {
    cliente_nombre: string | null;
    employee_nombre: string | null;
}

export class AppointmentUI {
    private constructor(private readonly props: AppointmentUIProps) {}

    static create(props: AppointmentUIProps): AppointmentUI {
        return new AppointmentUI(props);
    }

    get id() { return this.props.id; }
    get cliente_id() { return this.props.cliente_id; }
    get employee_id() { return this.props.employee_id; }
    get fecha() { return this.props.fecha; }
    get motivo() { return this.props.motivo; }
    get estado() { return this.props.estado; }
    get notas() { return this.props.notas; }
    get created_at() { return this.props.created_at; }
    get updated_at() { return this.props.updated_at; }
    get cliente_nombre() { return this.props.cliente_nombre; }
    get employee_nombre() { return this.props.employee_nombre; }

    toJSON(): AppointmentUIProps {
        return { ...this.props };
    }
}

export interface IAppointmentRepository {
   findAll(start?: Date | null, end?: Date | null, state?: EstadoCita | null, mine?: boolean | null, userId?: string | null): Promise<AppointmentUI[]>;
   findById(id: string): Promise<AppointmentUI | null>;
   create(data: CreateAppointmentDTO): Promise<Appointment>;
   update(id: string, data: UpdateAppointmentDTO): Promise<Appointment | null>;
   delete(id: string): Promise<boolean>;

   findAppointmentsByClientId(clientId: string): Promise<AppointmentUI[]>;
   findAppointmentsByUserId(user: string): Promise<AppointmentUI[]>;
   findAppointmentsByEmployeeId(employeeId: string): Promise<AppointmentUI[]>;
}