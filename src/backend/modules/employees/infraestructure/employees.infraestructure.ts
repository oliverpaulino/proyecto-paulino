import { Kysely } from "kysely";
import {
   IEmployeeRepository,
   CreateEmployeeDTO,
   UpdateEmployeeDTO,
   Employee,
   TipoIdentificacion,
   TipoRolEmpleado,
   ContactEmpleadoProps,
   OperadorProps,
} from "../domain/employees.domain";
import { DB } from "@/backend/database";

export class KyselyEmployeeRepository implements IEmployeeRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(params?: { page?: number; limit?: number; search?: string }): Promise<Employee[]> {
      const { page = 1, limit = 10, search = "" } = params || {};
      let query = this.db
         .selectFrom("empleado")
         .selectAll();

      if (search) {
         query = query.where((eb) =>
            eb.or([
               eb("empleado.nombre", "like", `%${search}%`),
               eb("empleado.identificacion", "like", `%${search}%`),
            ])
         );
      }

      const rows = await query
         .orderBy("created_at", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) =>
         Employee.create({
            ...row,
            tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
            rol: row.rol as TipoRolEmpleado,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
         })
      );
   }

   async findAllOperators(params?: { page?: number; limit?: number; search?: string }): Promise<OperadorProps[]> {
      console.log("Fetching operators with params:", params);
      const { page = 1, limit = 10, search = "" } = params || {};
      let query = this.db
         .selectFrom("empleado")
         .innerJoin("operador", "empleado.id", "operador.empleado_id")
         .selectAll();

      if (search) {
         query = query.where((eb) =>
            eb.or([
               eb("empleado.nombre", "like", `%${search}%`),
               eb("empleado.identificacion", "like", `%${search}%`),
               eb("operador.licencia", "like", `%${search}%`),
            ])
         );
      }

      const rowResult = await query
         .orderBy("empleado.created_at", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();


      return rowResult.map((row) => ({
         ...row,
         tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
         toJSON() {
            return { ...row };
         },
      }));


   }


   async findById(id: string): Promise<Employee | null> {
      const row = await this.db
         .selectFrom("empleado")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return Employee.create({
         ...row,
         tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
         rol: row.rol as TipoRolEmpleado,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async existsByIdentificacion(identificacion: string, excludeId?: string): Promise<boolean> {
      let query = this.db
         .selectFrom("empleado")
         .select("id")
         .where("identificacion", "=", identificacion);

      if (excludeId) {
         query = query.where("id", "!=", excludeId);
      }

      const row = await query.executeTakeFirst();
      return !!row;
   }

   async create(data: CreateEmployeeDTO): Promise<Employee> {
      const row = await this.db
         .insertInto("empleado")
         .values({
            nombre: data.nombre,
            identificacion: data.identificacion,
            tipo_identificacion: data.tipo_identificacion,
            rol: data.rol,
            salario: data.salario,
            activo: data.activo ?? true,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return Employee.create({
         ...row,
         tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
         rol: row.rol as TipoRolEmpleado,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async update(id: string, data: UpdateEmployeeDTO): Promise<Employee | null> {
      const row = await this.db
         .updateTable("empleado")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;

      return Employee.create({
         ...row,
         tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
         rol: row.rol as TipoRolEmpleado,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("empleado")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }

   async getContactsByEmployeeId(empleadoId: string): Promise<ContactEmpleadoProps[]> {
      const rows = await this.db
         .selectFrom("contact_empleado")
         .selectAll()
         .where("empleado_id", "=", empleadoId)
         .orderBy("created_at", "desc")
         .execute();

      return rows.map(r => ({
         ...r,
         created_at: new Date(r.created_at),
         updated_at: new Date(r.updated_at),
      })) as ContactEmpleadoProps[];
   }

   async getOperatorByEmployeeId(empleadoId: string): Promise<OperadorProps | null> {
      const row = await this.db
         .selectFrom("operador")
         .selectAll()
         .where("empleado_id", "=", empleadoId)
         .executeTakeFirst();

      if (!row) return null;
      return {
         ...row,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as OperadorProps;
   }

   async createContact(data: ContactEmpleadoProps): Promise<ContactEmpleadoProps> {
      const row = await this.db
         .insertInto("contact_empleado")
         .values(data)
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         ...row,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as ContactEmpleadoProps;
   }

   async updateContact(id: string, data: Partial<ContactEmpleadoProps>): Promise<ContactEmpleadoProps> {
      const row = await this.db
         .updateTable("contact_empleado")
         .set(data)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         ...row,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as ContactEmpleadoProps;
   }

   async deleteContact(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("contact_empleado")
         .where("id", "=", id)
         .executeTakeFirst();
      return Number(result.numDeletedRows) > 0;
   }

   async createOperator(data: OperadorProps): Promise<OperadorProps> {
      const row = await this.db
         .insertInto("operador")
         .values(data as any)
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         ...row,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as OperadorProps;
   }

   async updateOperator(id: string, data: Partial<OperadorProps>): Promise<OperadorProps> {
      const row = await this.db
         .updateTable("operador")
         .set(data as any)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         ...row,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as OperadorProps;
   }
}