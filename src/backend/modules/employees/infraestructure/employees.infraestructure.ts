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
   OperadorInsertProps,
} from "../domain/employees.domain";
import { DB } from "@/backend/database";

export class KyselyEmployeeRepository implements IEmployeeRepository {
   constructor(private readonly db: Kysely<DB>) { }

   private buildCodigoReferencia(referencia: number): string {
      const ref = String(referencia).padStart(3, "0");
      return `EMP-${ref}`;
   }

   private mapToEntity(row: any): Employee {
      return Employee.create({
         ...row,
         codigoReferencia: this.buildCodigoReferencia(row.referencia),
         tipo_identificacion: row.tipo_identificacion as TipoIdentificacion,
         rol: row.rol as TipoRolEmpleado,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      })
   }

   async findAll(params?: { page?: number; limit?: number; search?: string }): Promise<Employee[]> {
      const { page = 1, limit = 10, search = "" } = params || {};
      let query = this.db
         .selectFrom("empleado")
         .selectAll();

      if (search) {
         const cleaned = search.trim().toUpperCase();
         const refDigits = (cleaned.startsWith("EMP-") ? cleaned.slice(4) : cleaned).replace(/\D/g, "");
         query = query.where((eb) =>
            eb.or([
               eb("empleado.nombre", "like", `%${search}%`),
               eb("empleado.identificacion", "like", `%${search}%`),
               ...(refDigits ? [eb("empleado.referencia", "=", Number(refDigits))] : []),
            ])
         );
      }

      const rows = await query
         .orderBy("created_at", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAllOperators(params?: { page?: number; limit?: number; search?: string }): Promise<OperadorProps[]> {
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

   async findUnlinkedEmployees(): Promise<Employee[]> {
      const rows = await this.db
         .selectFrom("empleado")
         .selectAll()
         .where((eb) =>
            eb.not(
               eb.exists(
                  eb
                     .selectFrom("user_employee_link")
                     .select("user_employee_link.id")
                     .whereRef("user_employee_link.empleado_id", "=", "empleado.id")
               )
            )
         )
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findLinkedEmployeesByUserId(userId: string): Promise<Employee[]> {
      const rows = await this.db
         .selectFrom("empleado")
         .innerJoin("user_employee_link", "empleado.id", "user_employee_link.empleado_id")
         .selectAll("empleado")
         .where("user_employee_link.user_id", "=", userId)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<Employee | null> {
      const row = await this.db
         .selectFrom("empleado")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return this.mapToEntity(row);
   }
   async findOperatorById(id: string): Promise<OperadorProps | null> {
      const row = await this.db
         .selectFrom("operador")
         .where("operador.id", "=", id)
         .selectAll()
         .executeTakeFirst();
      if (!row) return null;
      const rowEmpleado = await this.db
         .selectFrom("empleado")
         .where("empleado.id", "=", row.empleado_id)
         .selectAll()
         .executeTakeFirst();


      return {
         empleado_id: row.empleado_id,
         id: row.id,
         licencia: row.licencia,
         nombre: rowEmpleado?.nombre || "",
         identificacion: rowEmpleado?.identificacion || "",
         fecha_vencimiento: row.fecha_vencimiento ? new Date(row.fecha_vencimiento) : null,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as OperadorProps;
   }

   async isOperadorActivo(operadorId: string): Promise<boolean | null> {
      if (!operadorId) return null;
      const row = await this.db
         .selectFrom("operador")
         .innerJoin("empleado", "empleado.id", "operador.empleado_id")
         .select("empleado.activo")
         .where("operador.id", "=", operadorId)
         .executeTakeFirst();
      return row ? Boolean(row.activo) : null;
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
            frecuencia_pago: data.frecuencia_pago,
            rol: data.rol,
            salario: data.salario,
            aplica_retenciones: data.aplica_retenciones ?? false,
            activo: data.activo ?? true,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.mapToEntity(row);
   }

   async update(id: string, data: UpdateEmployeeDTO): Promise<Employee | null> {
      const row = await this.db
         .updateTable("empleado")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;

      return this.mapToEntity(row);
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

   async createOperator(data: OperadorInsertProps): Promise<OperadorProps> {
      const row = await this.db
         .insertInto("operador")
         .values({
            id: data.id,
            empleado_id: data.empleado_id,
            licencia: data.licencia ?? null,
            fecha_vencimiento: data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null,
            created_at: new Date(),
            updated_at: new Date(),
         } as any)
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         ...row,
         nombre: "",
         identificacion: "",
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
         toJSON() {
            return { ...row };
         },
      } as OperadorProps;
   }

   async updateOperator(id: string, data: Partial<OperadorProps>): Promise<OperadorProps> {
      const row = await this.db
         .updateTable("operador")
         .set({
            ...(data.licencia !== undefined ? { licencia: data.licencia } : {}),
            ...(data.fecha_vencimiento !== undefined
               ? { fecha_vencimiento: data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null }
               : {}),
            updated_at: new Date(),
         } as any)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         ...row,
         nombre: "",
         identificacion: "",
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
         toJSON() {
            return { ...row };
         },
      } as OperadorProps;
   }


   async getEmployeeDetails(empleadoId: string) {
      const empleado = await this.db.selectFrom("empleado").selectAll().where("id", "=", empleadoId).executeTakeFirst();
      const contactos = await this.db.selectFrom("contact_empleado").selectAll().where("empleado_id", "=", empleadoId).execute();
      const operador = await this.db.selectFrom("operador").selectAll().where("empleado_id", "=", empleadoId).executeTakeFirst();

      const tarifas = await this.db.selectFrom("empleado_categoria_tarifa as ect")
         .innerJoin("categoria_equipo_tarifa as cet", "cet.id", "ect.categoria_equipo_tarifa_id")
         .innerJoin("categoria_equipo as ce", "ce.id", "cet.categoria_equipo_id")
         .select([
            "ect.id",
            "ect.empleado_id",
            "ect.categoria_equipo_tarifa_id",
            "cet.nombre as tarifa_nombre", // "Viaje", "Bote"
            "ce.id as categoria_equipo_id",
            "ce.nombre as categoria_nombre", // "Camión"
            "ect.monto_pago"
         ])
         .where("ect.empleado_id", "=", empleadoId)
         .execute();


      return { empleado, contactos, operador: operador || null, tarifas };
   }

   async createTarifa(data: { empleado_id: string; categoria_equipo_tarifa_id: string; monto_pago: number }) {
      return await this.db.insertInto("empleado_categoria_tarifa")
         .values(data)
         .returningAll()
         .executeTakeFirstOrThrow();
   }

   async updateTarifa(id: string, monto_pago: number, frecuencia_pago: string) {
      return await this.db.updateTable("empleado_categoria_tarifa")
         .set({ monto_pago, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirstOrThrow();
   }

   async deleteTarifa(id: string) {
      return await this.db.deleteFrom("empleado_categoria_tarifa")
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();
   }

   async upsertTarifasCategoria(
      empleado_id: string,
      tarifas: { categoria_equipo_tarifa_id: string, monto_pago: number }[]
   ) {
      if (tarifas.length === 0) return;

      const values = tarifas.map(t => ({
         empleado_id,
         categoria_equipo_tarifa_id: t.categoria_equipo_tarifa_id,
         monto_pago: t.monto_pago
      }));

      return await this.db.insertInto("empleado_categoria_tarifa")
         .values(values)
         .onConflict((oc) => oc
            .columns(['empleado_id', 'categoria_equipo_tarifa_id'])
            .doUpdateSet({
               monto_pago: (eb) => eb.ref('excluded.monto_pago'),
               updated_at: new Date()
            })
         )
         .execute();
   }

}