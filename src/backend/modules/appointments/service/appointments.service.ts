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

   async getAll(): Promise<AppointmentProps[]> {
      const appointments = await this.repo.findAll();
      return appointments.map((a) => a.toJSON());
   }

   async getAllUI(): Promise<AppointmentUIProps[]> {
      const appointments = await this.repo.findAllUI();
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

   async getByEmployeeId(userId: string): Promise<AppointmentProps[]> {
      const appointments = await this.repo.findAppointmentsByEmployeeId(userId);
      return appointments.map((a) => a.toJSON());
   }

   async getByRange(start?: Date | null, end?: Date | null): Promise<AppointmentProps[]> {
      if (start != null && end != null && start > end) {
         throw new Error("La fecha de inicio no puede ser mayor a la fecha de fin");
      }

      const appointments = await this.repo.findAppointmentsByRangeOfTime(start, end);
      return appointments.map((a) => a.toJSON());
   }

   async getByState(state: EstadoCita): Promise<AppointmentProps[]> {
      const appointments = await this.repo.findAppointmentsByState(state);
      return appointments.map((a) => a.toJSON());
   }

   async getByIdUI(id: string): Promise<AppointmentUIProps | null> {
      const appointment = await this.repo.findByIdUI(id);
      return appointment ? appointment.toJSON() : null;
   }

   async getByClientIdUI(clientId: string): Promise<AppointmentUIProps[]> {
      const appointments = await this.repo.findAppointmentsByClientIdUI(clientId);
      return appointments.map((a) => a.toJSON());
   }

   async getByEmployeeIdUI(userId: string): Promise<AppointmentUIProps[]> {
      const appointments = await this.repo.findAppointmentsByEmployeeIdUI(userId);
      return appointments.map((a) => a.toJSON());
   }

   async getByRangeUI(start?: Date | null, end?: Date | null): Promise<AppointmentUIProps[]> {
      if (start != null && end != null && start > end) {
         throw new Error("La fecha de inicio no puede ser mayor a la fecha de fin");
      }

      const appointments = await this.repo.findAppointmentsByRangeOfTimeUI(start, end);
      return appointments.map((a) => a.toJSON());
   }

   async getByStateUI(state: EstadoCita): Promise<AppointmentUIProps[]> {
      const appointments = await this.repo.findAppointmentsByStateUI(state);
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