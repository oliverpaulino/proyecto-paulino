import {
   AppointmentProps,
   CreateAppointmentDTO,
   UpdateAppointmentDTO,
   IAppointmentRepository,
   EstadoCita,
} from "../domain/appointments.domain";

export class AppointmentService {
   constructor(private readonly repo: IAppointmentRepository) {}

   async getAll(): Promise<AppointmentProps[]> {
      const appointments = await this.repo.findAll();
      return appointments.map((a) => a.toJSON());
   }

   async getById(id: string): Promise<AppointmentProps | null> {
      const appointment = await this.repo.findById(id);
      return appointment ? appointment.toJSON() : null;
   }

   async getByClientId(clientId: string): Promise<AppointmentProps[]> {
      const appointments = await this.repo.findAppointmentsByClientId(clientId);
      return appointments.map((a) => a.toJSON());
   }

   async getByUserId(userId: string): Promise<AppointmentProps[]> {
      const appointments = await this.repo.findAppointmentsByUserId(userId);
      return appointments.map((a) => a.toJSON());
   }

   async getByRange(start: Date, end: Date): Promise<AppointmentProps[]> {
      if (start > end) throw new Error("La fecha de inicio no puede ser mayor a la fecha de fin");
      const appointments = await this.repo.findAppointmentsByRangeOfTime(start, end);
      return appointments.map((a) => a.toJSON());
   }

   async getByState(state: EstadoCita): Promise<AppointmentProps[]> {
      const appointments = await this.repo.findAppointmentsByState(state);
      return appointments.map((a) => a.toJSON());
   }

   async create(data: CreateAppointmentDTO): Promise<AppointmentProps> {
      if (!data.cliente_id) throw new Error("El cliente es requerido");
      if (!data.fecha) throw new Error("La fecha es requerida");

      const appointment = await this.repo.create(data);
      return appointment.toJSON();
   }

   async update(id: string, data: UpdateAppointmentDTO): Promise<AppointmentProps | null> {
      const appointment = await this.repo.update(id, data);
      return appointment ? appointment.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}