import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   IAppointmentRepository,
   CreateAppointmentDTO,
   UpdateAppointmentDTO,
   Appointment,
   AppointmentUI,
   EstadoCita,
} from "../domain/appointments.domain";

export class KyselyAppointmentRepository implements IAppointmentRepository {
   constructor(private readonly db: Kysely<DB>) {}

   private buildCodigoReferencia(referencia: number): string {
      const ref = String(referencia).padStart(3, "0");
      return `CIT-${ref}`;
   }

   private mapToEntity(row: any): Appointment {
      return Appointment.create({
         ...row,
         codigoReferencia: this.buildCodigoReferencia(row.referencia),
         estado: row.estado as EstadoCita,
         fecha: new Date(row.fecha),
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   private mapToEntityUI(row: any): AppointmentUI {
      return AppointmentUI.create({
         ...row,
         cliente_nombre: row.cliente_nombre || "Sin cliente",
         employee_nombre: row.employee_nombre || "Sin asignar",
         codigoReferencia: this.buildCodigoReferencia(row.referencia),
         estado: row.estado as EstadoCita,
         fecha: new Date(row.fecha),
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async findAll(start?: Date | null, end?: Date | null, state?: EstadoCita | null, mine?: boolean | null, userId?: string | null): Promise<AppointmentUI[]> {
      let query = this.db
         .selectFrom("cita")
         .selectAll("cita")
         .leftJoin("cliente", "cliente.id", "cita.cliente_id")
         .leftJoin("empleado", "empleado.id", "cita.employee_id");

         if (mine && userId) {
            query = query.innerJoin("user_employee_link", "user_employee_link.empleado_id", "empleado.id")
            .where("user_employee_link.user_id", "=", userId);
         }
         
         if (start) {
            query = query.where("fecha", ">=", start);
         }
         
         if (end) {
            query = query.where("fecha", "<=", end);
         }
         
         if (state) {
            query = query.where("estado", "=", state);
         }

         query = query.select([
            "cliente.nombre as cliente_nombre",
            "empleado.nombre as employee_nombre"
         ]);

         const rows = await query
         .orderBy("cita.fecha", "asc")
         .execute();

      return rows.map((row) => this.mapToEntityUI(row));
   }

   async findById(id: string): Promise<AppointmentUI | null> {
      const row = await this.db
         .selectFrom("cita")
         .selectAll("cita")
         .leftJoin("cliente", "cliente.id", "cita.cliente_id")
         .leftJoin("empleado", "empleado.id", "cita.employee_id")
         .select([
            "cliente.nombre as cliente_nombre",
            "empleado.nombre as employee_nombre"
         ])
         .where("cita.id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return this.mapToEntityUI(row);
   }

   async create(data: CreateAppointmentDTO): Promise<Appointment> {
      const row = await this.db
         .insertInto("cita")
         .values({
            cliente_id: data.cliente_id ?? null,
            employee_id: data.employee_id ?? null,
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

   async findAppointmentsByClientId(clientId: string): Promise<AppointmentUI[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll("cita")
         .leftJoin("cliente", "cliente.id", "cita.cliente_id")
         .leftJoin("empleado", "empleado.id", "cita.employee_id")
         .select([
            "cliente.nombre as cliente_nombre",
            "empleado.nombre as employee_nombre"
         ])
         .where("cita.cliente_id", "=", clientId)
         .orderBy("cita.fecha", "desc")
         .execute();

      return rows.map((row) => this.mapToEntityUI(row));
   }

   async findAppointmentsByEmployeeId(employeeId: string): Promise<AppointmentUI[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll("cita")
         .leftJoin("cliente", "cliente.id", "cita.cliente_id")
         .leftJoin("empleado", "empleado.id", "cita.employee_id")
         .select([
            "cliente.nombre as cliente_nombre",
            "empleado.nombre as employee_nombre"
         ])
         .where("cita.employee_id", "=", employeeId)
         .orderBy("cita.fecha", "asc")
         .execute();

      return rows.map((row) => this.mapToEntityUI(row));
   }

   async findAppointmentsByUserId(userId: string): Promise<AppointmentUI[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll("cita")
         .leftJoin("cliente", "cliente.id", "cita.cliente_id")
         .leftJoin("empleado", "empleado.id", "cita.employee_id")
         .innerJoin("user_employee_link", "user_employee_link.empleado_id", "empleado.id")
         .select([
            "cliente.nombre as cliente_nombre",
            "empleado.nombre as employee_nombre"
         ])
         .where("user_employee_link.user_id", "=", userId)
         .orderBy("cita.fecha", "asc")
         .execute();

      return rows.map((row) => this.mapToEntityUI(row));
   }
}