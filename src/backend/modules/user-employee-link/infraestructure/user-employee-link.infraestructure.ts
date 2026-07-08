import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   IUserEmployeeLinkRepository,
   UserEmployeeLink,
   CreateUserEmployeeLinkDTO,
   UpdateUserEmployeeLinkDTO
} from "../domain/user-employee-link.domain";

export class KyselyUserEmployeeLinkRepository implements IUserEmployeeLinkRepository {
   constructor(private readonly db: Kysely<DB>) {}

   async findAll(): Promise<UserEmployeeLink[]> {
      const rows = await this.db
         .selectFrom("user_employee_link")
         .selectAll()
         .orderBy("created_at", "desc")
         .execute();

      return rows.map((row) =>
         UserEmployeeLink.create({
            ...row,
            created_at: new Date(row.created_at),
         })
      );
   }

   async findById(id: string): Promise<UserEmployeeLink | null> {
      const row = await this.db
         .selectFrom("user_employee_link")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return UserEmployeeLink.create({
         ...row,
         created_at: new Date(row.created_at),
      });
   }

   async findAllByUserId(userId: string): Promise<UserEmployeeLink[]> {
      const rows = await this.db
         .selectFrom("user_employee_link")
         .selectAll()
         .where("user_id", "=", userId)
         .execute();

      return rows.map((row) =>
         UserEmployeeLink.create({
            ...row,
            created_at: new Date(row.created_at),
         })
      );
   }

   async findByEmployeeId(id: string): Promise<UserEmployeeLink | null> {
      const row = await this.db
         .selectFrom("user_employee_link")
         .selectAll()
         .where("empleado_id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      return UserEmployeeLink.create({
         ...row,
         created_at: new Date(row.created_at),
      });
   }

   async create(data: CreateUserEmployeeLinkDTO): Promise<UserEmployeeLink> {
      const row = await this.db
         .insertInto("user_employee_link")
         .values({
            user_id: data.user_id,
            empleado_id: data.empleado_id,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return UserEmployeeLink.create({
         ...row,
         created_at: new Date(row.created_at),
      });
   }

   async update(id: string, data: UpdateUserEmployeeLinkDTO): Promise<UserEmployeeLink | null> {
      const row = await this.db
         .updateTable("user_employee_link")
         .set(data)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;

      return UserEmployeeLink.create({
         ...row,
         created_at: new Date(row.created_at),
      });
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("user_employee_link")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}