import type { Kysely } from "kysely";
import type { DB } from "@/backend/database";
import { notificationEmitter } from "@/backend/shared/notification-emitter";
import type {
   CreateNotificationDTO,
   INotificationRepository,
   NotificationFilters,
   NotificationPaginatedResult,
   NotificationProps,
} from "../domain/notification.domain";

const MAX_PAGE_SIZE = 50;

export class KyselyNotificationRepository implements INotificationRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findByUserId(
      userId: string,
      filters: NotificationFilters = {}
   ): Promise<NotificationPaginatedResult> {
      const page = filters.page && filters.page > 0 ? filters.page : 1;
      const pageSize =
         filters.pageSize && filters.pageSize > 0
            ? Math.min(filters.pageSize, MAX_PAGE_SIZE)
            : 10;
      const tipo = filters.tipo?.trim() || undefined;
      const estado = filters.estado;

      let dataQuery = this.db
         .selectFrom("notifications")
         .selectAll()
         .where("user_id", "=", userId);
      let countQuery = this.db
         .selectFrom("notifications")
         .select((eb) => eb.fn.countAll<string>().as("count"))
         .where("user_id", "=", userId);

      if (tipo) {
         dataQuery = dataQuery.where("type", "=", tipo);
         countQuery = countQuery.where("type", "=", tipo);
      }
      if (estado === "LEIDA") {
         dataQuery = dataQuery.where("is_read", "=", true);
         countQuery = countQuery.where("is_read", "=", true);
      } else if (estado === "NO_LEIDA") {
         dataQuery = dataQuery.where("is_read", "=", false);
         countQuery = countQuery.where("is_read", "=", false);
      }

      const countResult = await countQuery.executeTakeFirst();
      const total = Number(countResult?.count ?? 0);

      const rows = await dataQuery
         .orderBy("is_read", "asc")
         .orderBy("created_at", "desc")
         .offset((page - 1) * pageSize)
         .limit(pageSize)
         .execute();

      return {
         data: rows.map((r) => ({ ...r, is_read: Boolean(r.is_read) })),
         total,
         page,
         pageSize,
         totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
   }

   async countUnread(userId: string): Promise<number> {
      const result = await this.db
         .selectFrom("notifications")
         .select((eb) => eb.fn.countAll<string>().as("count"))
         .where("user_id", "=", userId)
         .where("is_read", "=", false)
         .executeTakeFirst();

      return Number(result?.count ?? 0);
   }

   async markAsRead(id: string, userId: string): Promise<void> {
      await this.db
         .updateTable("notifications")
         .set({ is_read: true, read_at: new Date() })
         .where("id", "=", id)
         .where("user_id", "=", userId)
         .execute();
   }

   async markAllAsRead(userId: string): Promise<void> {
      await this.db
         .updateTable("notifications")
         .set({ is_read: true, read_at: new Date() })
         .where("user_id", "=", userId)
         .where("is_read", "=", false)
         .execute();
   }

   async markReadByReference(referenceId: string, referenceType: string): Promise<void> {
      const rows = await this.db
         .updateTable("notifications")
         .set({ is_read: true, read_at: new Date() })
         .where("reference_id", "=", referenceId)
         .where("reference_type", "=", referenceType)
         .where("is_read", "=", false)
         .returning("user_id")
         .execute();

      // Notify affected users so their SSE badge updates in real-time
      const uniqueUserIds = [...new Set(rows.map((r) => r.user_id))];
      for (const userId of uniqueUserIds) {
         notificationEmitter.emit("new_notification", { userId });
      }
   }

   async create(data: CreateNotificationDTO): Promise<NotificationProps> {
      const row = await this.db
         .insertInto("notifications")
         .values({
            user_id: data.user_id,
            title: data.title,
            message: data.message,
            type: data.type,
            reference_id: data.reference_id ?? null,
            reference_type: data.reference_type ?? null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      notificationEmitter.emit("new_notification", { userId: data.user_id });
      return { ...row, is_read: Boolean(row.is_read) };
   }

   async createMany(data: CreateNotificationDTO[]): Promise<void> {
      if (data.length === 0) return;

      await this.db
         .insertInto("notifications")
         .values(
            data.map((d) => ({
               user_id: d.user_id,
               title: d.title,
               message: d.message,
               type: d.type,
               reference_id: d.reference_id ?? null,
               reference_type: d.reference_type ?? null,
            }))
         )
         .execute();

      // Emit once per unique recipient
      const uniqueUserIds = [...new Set(data.map((d) => d.user_id))];
      for (const userId of uniqueUserIds) {
         notificationEmitter.emit("new_notification", { userId });
      }
   }

   async delete(id: string, userId: string): Promise<void> {
      await this.db
         .deleteFrom("notifications")
         .where("id", "=", id)
         .where("user_id", "=", userId)
         .execute();
   }
}
