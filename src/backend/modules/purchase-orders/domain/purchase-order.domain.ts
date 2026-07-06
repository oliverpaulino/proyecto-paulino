export type EstadoOrdenCompra =
   | "BORRADOR"
   | "PENDIENTE"
   | "APROBADA"
   | "RECIBIDA"
   | "CANCELADA";

export interface PurchaseOrderItemProps {
   id: string;
   orden_compra_id: string;
   descripcion: string;
   cantidad: number;
   precio_unitario: number;
   subtotal: number;
   created_at: Date;
   updated_at: Date;
}

export interface PurchaseOrderProps {
   id: string;
   proveedor_id: string;
   proveedor_nombre?: string;
   fecha: Date;
   estado: EstadoOrdenCompra;
   notas: string | null;
   total: number;
   approved_by: string | null;
   approved_by_name: string | null;
   approved_at: Date | null;
   items: PurchaseOrderItemProps[];
   created_at: Date;
   updated_at: Date;
   deleted_by: string | null;
   deleted_at: Date | null;
   delete_reason: string | null;
}

const TRANSITIONS: Record<EstadoOrdenCompra, EstadoOrdenCompra[]> = {
   BORRADOR: ["PENDIENTE", "CANCELADA"],
   PENDIENTE: ["APROBADA", "BORRADOR", "CANCELADA"],
   APROBADA: ["RECIBIDA", "CANCELADA"],
   RECIBIDA: [],
   CANCELADA: [],
};

export function canTransition(
   from: EstadoOrdenCompra,
   to: EstadoOrdenCompra
): boolean {
   return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isEditable(estado: EstadoOrdenCompra): boolean {
   return estado === "BORRADOR" || estado === "PENDIENTE";
}

export class PurchaseOrder {
   private constructor(private readonly props: PurchaseOrderProps) { }

   static create(props: PurchaseOrderProps): PurchaseOrder {
      return new PurchaseOrder(props);
   }

   get id(): string { return this.props.id; }
   get proveedor_id(): string { return this.props.proveedor_id; }
   get proveedor_nombre(): string | undefined { return this.props.proveedor_nombre; }
   get fecha(): Date { return this.props.fecha; }
   get estado(): EstadoOrdenCompra { return this.props.estado; }
   get notas(): string | null { return this.props.notas; }
   get total(): number { return this.props.total; }
   get approved_by(): string | null { return this.props.approved_by; }
   get approved_by_name(): string | null { return this.props.approved_by_name; }
   get approved_at(): Date | null { return this.props.approved_at; }
   get items(): PurchaseOrderItemProps[] { return this.props.items; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }
   get deleted_by(): string | null { return this.props.deleted_by; }
   get deleted_at(): Date | null { return this.props.deleted_at; }
   get delete_reason(): string | null { return this.props.delete_reason; }

   toJSON(): PurchaseOrderProps {
      return { ...this.props };
   }
}

export interface CreatePurchaseOrderDTO {
   proveedor_id: string;
   fecha: Date;
   notas?: string | null;
   items: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
   }>;
}

export interface UpdatePurchaseOrderDTO {
   proveedor_id?: string;
   fecha?: Date;
   notas?: string | null;
   items?: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
   }>;
}

export interface ApproverRecord {
   user_id: string;
   user_name: string;
   granted_by: string;
   granted_at: Date;
}

export interface IPurchaseOrderRepository {
   findAll(): Promise<PurchaseOrder[]>;
   findAllDeleted(): Promise<PurchaseOrder[]>;
   findById(id: string): Promise<PurchaseOrder | null>;
   create(data: CreatePurchaseOrderDTO): Promise<PurchaseOrder>;
   updateHeader(
      id: string,
      data: Omit<UpdatePurchaseOrderDTO, "items">
   ): Promise<PurchaseOrder | null>;
   replaceItems(
      id: string,
      items: Array<{
         descripcion: string;
         cantidad: number;
         precio_unitario: number;
      }>
   ): Promise<PurchaseOrder | null>;
   updateStatus(
      id: string,
      estado: EstadoOrdenCompra,
      approvedBy?: string,
      approvedByName?: string
   ): Promise<PurchaseOrder | null>;
   delete(userId: string, id: string): Promise<boolean>;
   // Approver management
   isApprover(userId: string): Promise<boolean>;
   listApprovers(): Promise<ApproverRecord[]>;
   addApprover(userId: string, userName: string, grantedBy: string): Promise<void>;
   removeApprover(userId: string): Promise<void>;
}
