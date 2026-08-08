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

export interface NotificationFilters {
   page?: number;
   pageSize?: number;
   /** Filtra por tipo exacto de notificación (ej. "PURCHASE_ORDER_REVIEW"). */
   tipo?: string;
   /** "LEIDA" o "NO_LEIDA" — sin valor trae ambas. */
   estado?: "LEIDA" | "NO_LEIDA";
}

export interface NotificationPaginatedResult {
   data: NotificationProps[];
   total: number;
   page: number;
   pageSize: number;
   totalPages: number;
}

export interface INotificationRepository {
   findByUserId(userId: string, filters?: NotificationFilters): Promise<NotificationPaginatedResult>;
   countUnread(userId: string): Promise<number>;
   markAsRead(id: string, userId: string): Promise<void>;
   markAllAsRead(userId: string): Promise<void>;
   markReadByReference(referenceId: string, referenceType: string): Promise<void>;
   create(data: CreateNotificationDTO): Promise<NotificationProps>;
   createMany(data: CreateNotificationDTO[]): Promise<void>;
   delete(id: string, userId: string): Promise<void>;
}
