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

   async findAllUI(): Promise<AppointmentUI[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll("cita")
         .leftJoin("cliente", "cliente.id", "cita.cliente_id")
         .leftJoin("empleado", "empleado.id", "cita.employee_id")
         .select([
            "cliente.nombre as cliente_nombre",
            "empleado.nombre as employee_nombre"
         ])
         .orderBy("cita.fecha", "asc")
         .execute();

      return rows.map((row) => 
         AppointmentUI.create({
            id: row.id,
            cliente_id: row.cliente_id,
            employee_id: row.employee_id,
            fecha: new Date(row.fecha),
            motivo: row.motivo,
            estado: row.estado as any,
            notas: row.notas,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            cliente_nombre: row.cliente_nombre || "No encontrado",
            employee_nombre: row.employee_nombre || "Sin asignar"
         })
      );
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

   async findByIdUI(id: string): Promise<AppointmentUI | null> {
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

      return AppointmentUI.create({
         id: row.id,
         cliente_id: row.cliente_id,
         employee_id: row.employee_id,
         fecha: new Date(row.fecha),
         motivo: row.motivo,
         estado: row.estado as any,
         notas: row.notas,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
         cliente_nombre: row.cliente_nombre || "No encontrado",
         employee_nombre: row.employee_nombre || "Sin asignar"
      });
   }

   async create(data: CreateAppointmentDTO): Promise<Appointment> {
      const row = await this.db
         .insertInto("cita")
         .values({
            cliente_id: data.cliente_id,
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

   async findAppointmentsByClientId(clientId: string): Promise<Appointment[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll()
         .where("cliente_id", "=", clientId)
         .orderBy("fecha", "desc")
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAppointmentsByEmployeeId(employeeId: string): Promise<Appointment[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll()
         .where("employee_id", "=", employeeId)
         .orderBy("fecha", "asc")
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAppointmentsByRangeOfTime(start?: Date | null, end?: Date | null): Promise<Appointment[]> {
      let query = this.db.selectFrom("cita").selectAll();

      if (start) {
         query = query.where("fecha", ">=", start);
      }

      if (end) {
         query = query.where("fecha", "<=", end);
      }

      const rows = await query.orderBy("fecha", "asc").execute();

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

   async findAppointmentsByClientIdUI(clientId: string): Promise<AppointmentUI[]> {
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

      return rows.map((row) => 
         AppointmentUI.create({
            id: row.id,
            cliente_id: row.cliente_id,
            employee_id: row.employee_id,
            fecha: new Date(row.fecha),
            motivo: row.motivo,
            estado: row.estado as any,
            notas: row.notas,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            cliente_nombre: row.cliente_nombre || "No encontrado",
            employee_nombre: row.employee_nombre || "Sin asignar"
         })
      );
   }

   async findAppointmentsByEmployeeIdUI(employeeId: string): Promise<AppointmentUI[]> {
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

      return rows.map((row) => 
         AppointmentUI.create({
            id: row.id,
            cliente_id: row.cliente_id,
            employee_id: row.employee_id,
            fecha: new Date(row.fecha),
            motivo: row.motivo,
            estado: row.estado as any,
            notas: row.notas,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            cliente_nombre: row.cliente_nombre || "No encontrado",
            employee_nombre: row.employee_nombre || "Sin asignar"
         })
      );
   }

   async findAppointmentsByRangeOfTimeUI(start?: Date | null, end?: Date | null): Promise<AppointmentUI[]> {
      let query = this.db
         .selectFrom("cita")
         .selectAll("cita")
         .leftJoin("cliente", "cliente.id", "cita.cliente_id")
         .leftJoin("empleado", "empleado.id", "cita.employee_id")
         .select([
            "cliente.nombre as cliente_nombre",
            "empleado.nombre as employee_nombre"
         ]);

      if (start) {
         query = query.where("cita.fecha", ">=", start);
      }

      if (end) {
         query = query.where("cita.fecha", "<=", end);
      }

      const rows = await query.orderBy("cita.fecha", "asc").execute();

      return rows.map((row) => 
         AppointmentUI.create({
            id: row.id,
            cliente_id: row.cliente_id,
            employee_id: row.employee_id,
            fecha: new Date(row.fecha),
            motivo: row.motivo,
            estado: row.estado as any,
            notas: row.notas,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            cliente_nombre: row.cliente_nombre || "No encontrado",
            employee_nombre: row.employee_nombre || "Sin asignar"
         })
      );
   }

   async findAppointmentsByStateUI(state: EstadoCita): Promise<AppointmentUI[]> {
      const rows = await this.db
         .selectFrom("cita")
         .selectAll("cita")
         .leftJoin("cliente", "cliente.id", "cita.cliente_id")
         .leftJoin("empleado", "empleado.id", "cita.employee_id")
         .select([
            "cliente.nombre as cliente_nombre",
            "empleado.nombre as employee_nombre"
         ])
         .where("cita.estado", "=", state)
         .orderBy("cita.fecha", "asc")
         .execute();

      return rows.map((row) => 
         AppointmentUI.create({
            id: row.id,
            cliente_id: row.cliente_id,
            employee_id: row.employee_id,
            fecha: new Date(row.fecha),
            motivo: row.motivo,
            estado: row.estado as any,
            notas: row.notas,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            cliente_nombre: row.cliente_nombre || "No encontrado",
            employee_nombre: row.employee_nombre || "Sin asignar"
         })
      );
   }
}