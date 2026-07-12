import { create } from "zustand";
import type {
   PurchaseOrder,
   PurchaseOrderForm,
   PurchaseOrderDeleted,
   UpdatePurchaseOrderForm,
   EstadoOrdenCompra,
} from "@/dtos/purchase-order.dto";

type PurchaseOrderStore = {
   PurchaseOrders: PurchaseOrder[];
   PurchaseOrdersDeleted: PurchaseOrderDeleted[];
   loading: boolean;
   _fetchedLists: Set<string>;
   _fetchedListsDeleted: Set<string>;

   GetPurchaseOrders: (params?: { force?: boolean }) => Promise<void>;
   GetPurchaseOrdersDeleted: (params?: { force?: boolean }) => Promise<void>;

   CreatePurchaseOrder: (form: PurchaseOrderForm) => Promise<PurchaseOrder | Error>;
   UpdatePurchaseOrder: (
      id: string,
      data: Partial<UpdatePurchaseOrderForm>
   ) => Promise<void | Error>;
   ChangeStatus: (
      id: string,
      estado: EstadoOrdenCompra
   ) => Promise<void | Error>;
   DeletePurchaseOrder: (id: string) => Promise<void | Error>;
   GetOrdenesCompraBySupplier: (supplierId: string, params?: { force?: boolean }) => Promise<void>;
   CheckIsApprover: () => Promise<boolean>;
   invalidateCache: () => void;
};

export const usePurchaseOrderStore = create<PurchaseOrderStore>((set, get) => ({
   PurchaseOrders: [],
   PurchaseOrdersDeleted: [],
   loading: false,
   _fetchedLists: new Set<string>(),
   _fetchedListsDeleted: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
      set({ _fetchedListsDeleted: new Set<string>() });
   },

   GetPurchaseOrders: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/purchase-orders");
         if (!res.ok) throw new Error("Error al cargar órdenes de compra");

         const data: PurchaseOrder[] = await res.json();

         set((state) => ({
            PurchaseOrders: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching purchase orders:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetPurchaseOrdersDeleted: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedListsDeleted.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/purchase-orders/deleted");
         if (!res.ok) throw new Error("Error al cargar órdenes de compra eliminadas");

         const data: PurchaseOrderDeleted[] = await res.json();

         set((state) => ({
            PurchaseOrdersDeleted: data,
            _fetchedListsDeleted: new Set(state._fetchedListsDeleted).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching deleted purchase orders:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreatePurchaseOrder: async (form) => {
      try {
         const res = await fetch("/api/purchase-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         // 1. PRIMERO validamos si falló
         if (!res.ok) {
            // Leemos como texto plano para evitar el SyntaxError si es un 404 o error del servidor
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }

         // 2. LUEGO parseamos el JSON (porque sabemos que res.ok es true)
         const data = await res.json();

         get().invalidateCache();
         await get().GetPurchaseOrders();
         return data as PurchaseOrder;
      } catch (error) {
         return error as Error;
      }
   },

   UpdatePurchaseOrder: async (id, data) => {
      try {
         const res = await fetch(`/api/purchase-orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok)
            throw new Error(
               responseData.error ||
               responseData.message ||
               "Error al actualizar orden de compra"
            );

         get().invalidateCache();
         await get().GetPurchaseOrders();
      } catch (error) {
         return error as Error;
      }
   },

   ChangeStatus: async (id, estado) => {
      try {
         const res = await fetch(`/api/purchase-orders/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado }),
         });

         const responseData = await res.json();
         if (!res.ok)
            throw new Error(
               responseData.error ||
               responseData.message ||
               "Error al cambiar estado"
            );

         get().invalidateCache();
         await get().GetPurchaseOrders();
      } catch (error) {
         return error as Error;
      }
   },

   CheckIsApprover: async () => {
      try {
         const res = await fetch("/api/purchase-orders/approvers/me");
         if (!res.ok) return false;
         const data = await res.json() as { isApprover: boolean };
         return data.isApprover;
      } catch {
         return false;
      }
   },

   DeletePurchaseOrder: async (id) => {
      try {
         const res = await fetch(`/api/purchase-orders/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok)
            throw new Error(
               responseData.error ||
               responseData.message ||
               "Error al eliminar orden de compra"
            );

         get().invalidateCache();
         await get().GetPurchaseOrders();
      } catch (error) {
         return error as Error;
      }
   },

   GetOrdenesCompraBySupplier: async (supplierId, { force = false } = {}) => {
      const cacheKey = `supplier-${supplierId}`;
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`/api/purchase-orders?supplierId=${supplierId}`);
         if (!res.ok) throw new Error("Error al cargar órdenes de compra por proveedor");
         const data = await res.json();
         set({ loading: false });
         set((state) => ({
            PurchaseOrders: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching purchase orders by supplier:", error);
         set({ loading: false });
         throw error;
      } finally {
         set({ loading: false });
      }
   },
}));
