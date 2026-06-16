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
   items: PurchaseOrderItemProps[];
   created_at: Date;
   updated_at: Date;
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
   private constructor(private readonly props: PurchaseOrderProps) {}

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
   get items(): PurchaseOrderItemProps[] { return this.props.items; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

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

export interface IPurchaseOrderRepository {
   findAll(): Promise<PurchaseOrder[]>;
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
      estado: EstadoOrdenCompra
   ): Promise<PurchaseOrder | null>;
   delete(id: string): Promise<boolean>;
}
