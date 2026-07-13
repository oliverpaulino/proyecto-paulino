export interface NotificationProps {
   id: string;
   user_id: string;
   title: string;
   message: string;
   type: string;
   reference_id: string | null;
   reference_type: string | null;
   is_read: boolean;
   created_at: Date;
   read_at: Date | null;
}

export interface CreateNotificationDTO {
   user_id: string;
   title: string;
   message: string;
   type: string;
   reference_id?: string | null;
   reference_type?: string | null;
}

export interface INotificationRepository {
   findByUserId(userId: string): Promise<NotificationProps[]>;
   countUnread(userId: string): Promise<number>;
   markAsRead(id: string, userId: string): Promise<void>;
   markAllAsRead(userId: string): Promise<void>;
   markReadByReference(referenceId: string, referenceType: string): Promise<void>;
   create(data: CreateNotificationDTO): Promise<NotificationProps>;
   createMany(data: CreateNotificationDTO[]): Promise<void>;
   delete(id: string, userId: string): Promise<void>;
}
