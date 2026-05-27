import { Kysely } from "kysely";
import { IEmployeeRepository, CreateEmployeeDTO, UpdateEmployeeDTO, Employee, TipoIdentificacion, TipoRolEmpleado } from "../domain/employees.domain";
import { DB } from "@/backend/database";

export class KyselyEmployeeRepository implements IEmployeeRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<Employee[]> {
      const rows = await this.db
         .selectFrom("empleado")
         .selectAll()
         .orderBy("created_at", "desc")
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

   async create(data: CreateEmployeeDTO): Promise<Employee> {
      const row = await this.db
         .insertInto("empleado")
         .values({
            user_id: data.user_id ?? null,
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
}