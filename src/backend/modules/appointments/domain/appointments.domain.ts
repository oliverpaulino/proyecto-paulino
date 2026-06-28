export type EstadoCita = "EN_REVISION" | "PENDIENTE" | "REALIZADA" | "CANCELADA";

export interface AppointmentProps {
    id: string;
    cliente_id: string;
    user_id: string | null;
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
    get user_id() { return this.props.user_id; }
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
    cliente_id: string;
    user_id?: string | null;
    fecha: Date;
    motivo?: string | null;
    estado: EstadoCita;
    notas?: string | null;
}

export type UpdateAppointmentDTO = Partial<CreateAppointmentDTO>;

export interface IAppointmentRepository {
   findAll(): Promise<Appointment[]>;
   findById(id: string): Promise<Appointment | null>;
   create(data: CreateAppointmentDTO): Promise<Appointment>;
   update(id: string, data: UpdateAppointmentDTO): Promise<Appointment | null>;
   delete(id: string): Promise<boolean>;
   findAppointmentsByClientId(clientId: string): Promise<Appointment[]>;
   findAppointmentsByUserId(userId: string): Promise<Appointment[]>;
   findAppointmentsByRangeOfTime(start: Date, end: Date): Promise<Appointment[]>;
   findAppointmentsByState(state: EstadoCita): Promise<Appointment[]>;
}