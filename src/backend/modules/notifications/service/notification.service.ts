import type {
   CreateNotificationDTO,
   INotificationRepository,
   NotificationProps,
} from "../domain/notification.domain";

export class NotificationService {
   constructor(private readonly repo: INotificationRepository) {}

   async getForUser(userId: string): Promise<NotificationProps[]> {
      return this.repo.findByUserId(userId);
   }

   async getUnreadCount(userId: string): Promise<number> {
      return this.repo.countUnread(userId);
   }

   async markAsRead(id: string, userId: string): Promise<void> {
      return this.repo.markAsRead(id, userId);
   }

   async markAllAsRead(userId: string): Promise<void> {
      return this.repo.markAllAsRead(userId);
   }

   async markReadByReference(referenceId: string, referenceType: string): Promise<void> {
      return this.repo.markReadByReference(referenceId, referenceType);
   }

   async notify(data: CreateNotificationDTO): Promise<NotificationProps> {
      return this.repo.create(data);
   }

   async notifyMany(data: CreateNotificationDTO[]): Promise<void> {
      return this.repo.createMany(data);
   }
}
