import {
   AppointmentProps,
   CreateAppointmentDTO,
   UpdateAppointmentDTO,
   IAppointmentRepository,
   EstadoCita,
   AppointmentUIProps,
} from "../domain/appointments.domain";

export class AppointmentService {
   constructor(private readonly repo: IAppointmentRepository) {}

   async getAll(start?: Date | null, end?: Date | null, state?: EstadoCita | null, mine?: boolean | null, userId?: string | null): Promise<AppointmentUIProps[]> {
      const appointments = await this.repo.findAll(start, end, state, mine, userId);
      return appointments.map((a) => a.toJSON());
   }
   
   async getById(id: string): Promise<AppointmentUIProps | null> {
      const appointment = await this.repo.findById(id);
      return appointment ? appointment.toJSON() : null;
   }

   async getByUserId(userId: string): Promise<AppointmentUIProps[]> {
      const appointments = await this.repo.findAppointmentsByUserId(userId);
      return appointments.map((a) => a.toJSON());
   }
   
   async getByClientId(clientId: string): Promise<AppointmentUIProps[]> {
      const appointments = await this.repo.findAppointmentsByClientId(clientId);
      return appointments.map((a) => a.toJSON());
   }
   
   async getByEmployeeId(userId: string): Promise<AppointmentUIProps[]> {
      const appointments = await this.repo.findAppointmentsByEmployeeId(userId);
      return appointments.map((a) => a.toJSON());
   }

   async create(data: CreateAppointmentDTO): Promise<AppointmentProps> {
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