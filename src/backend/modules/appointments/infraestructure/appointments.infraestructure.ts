import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   IAppointmentRepository,
   CreateAppointmentDTO,
   UpdateAppointmentDTO,
   Appointment,
   EstadoCita,
} from "../domain/appointments.domain";

export class KyselyAppointmentRepository implements IAppointmentRepository {
   constructor(private readonly db: Kysely<DB>) {}

   private mapToEntity(row: any): Appointment {
      return Appointment.create({
         ...row,
         estado: row.estado as EstadoCita,
         fecha: new Date(row.fecha),
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async findAll(): Promise<Appointment[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll()
         .orderBy("fecha", "asc")
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<Appointment | null> {
      const row = await this.db
         .selectFrom("cita")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async create(data: CreateAppointmentDTO): Promise<Appointment> {
      const row = await this.db
         .insertInto("cita")
         .values({
            cliente_id: data.cliente_id,
            user_id: data.user_id ?? null,
            fecha: data.fecha,
            motivo: data.motivo ?? null,
            estado: data.estado,
            notas: data.notas ?? null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.mapToEntity(row);
   }

   async update(id: string, data: UpdateAppointmentDTO): Promise<Appointment | null> {
      const row = await this.db
         .updateTable("cita")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("cita")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }

   async findAppointmentsByClientId(clientId: string): Promise<Appointment[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll()
         .where("cliente_id", "=", clientId)
         .orderBy("fecha", "desc")
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAppointmentsByUserId(userId: string): Promise<Appointment[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll()
         .where("user_id", "=", userId)
         .orderBy("fecha", "asc")
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAppointmentsByRangeOfTime(start: Date, end: Date): Promise<Appointment[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll()
         .where("fecha", ">=", start)
         .where("fecha", "<=", end)
         .orderBy("fecha", "asc")
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAppointmentsByState(state: EstadoCita): Promise<Appointment[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll()
         .where("estado", "=", state)
         .orderBy("fecha", "asc")
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }
}