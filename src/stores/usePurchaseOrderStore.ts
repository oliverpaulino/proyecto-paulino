import { create } from "zustand";
import type {
   PurchaseOrder,
   PurchaseOrderForm,
   PurchaseOrderDeleted,
   UpdatePurchaseOrderForm,
   EstadoOrdenCompra,
   PaginatedPurchaseOrders,
} from "@/dtos/purchase-order.dto";

type PurchaseOrderStore = {
   PurchaseOrders: PaginatedPurchaseOrders;
   PurchaseOrdersDeleted: PaginatedPurchaseOrders;
   loading: boolean;
   _fetchedLists: Set<string>;
   _fetchedListsDeleted: Set<string>;

   GetPurchaseOrders: (params?: { force?: boolean, page?: number, limit?: number, search?: string }) => Promise<void>;
   GetPurchaseOrdersDeleted: (params?: { force?: boolean, page?: number, limit?: number, search?: string }) => Promise<void>;

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
   GetOrdenesCompraBySupplier: (supplierId: string, params?: { force?: boolean, page?: number, limit?: number, search?: string }) => Promise<void>;
   RestorePurchaseOrder: (id: string) => Promise<void | Error>;
   CheckIsApprover: () => Promise<boolean>;
   invalidateCache: () => void;
};

export const usePurchaseOrderStore = create<PurchaseOrderStore>((set, get) => ({
   PurchaseOrders: {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
   },
   PurchaseOrdersDeleted: {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
   },
   loading: false,
   _fetchedLists: new Set<string>(),
   _fetchedListsDeleted: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
      set({ _fetchedListsDeleted: new Set<string>() });
   },

   GetPurchaseOrders: async (params = {}) => {
      const { force = false, page = 1, limit = 10, search = "" } = params;
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`/api/purchase-orders?page=${page}&limit=${limit}&search=${search}`);
         if (!res.ok) throw new Error("Error al cargar órdenes de compra");

         const data: PaginatedPurchaseOrders = await res.json();

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

   GetPurchaseOrdersDeleted: async (params = {}) => {
      const { force = false, page = 1, limit = 10, search = "" } = params;
      const cacheKey = "all";
      if (!force && get()._fetchedListsDeleted.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`/api/purchase-orders/deleted?page=${page}&limit=${limit}&search=${search}`);
         if (!res.ok) throw new Error("Error al cargar órdenes de compra eliminadas");

         const data: PaginatedPurchaseOrders = await res.json();
         console.log(data, "deleted data")

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

         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }

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

   GetOrdenesCompraBySupplier: async (supplierId, { force = false, page = 1, limit = 10, search = "" } = {}) => {
      const cacheKey = `supplier-${supplierId}`;
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`/api/purchase-orders?supplierId=${supplierId}&page=${page}&limit=${limit}&search=${search}`);
         if (!res.ok) throw new Error("Error al cargar órdenes de compra por proveedor");
         const data = await res.json();
         console.log(data, "data")
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
   RestorePurchaseOrder: async (id) => {
      try {
         const res = await fetch(`/api/purchase-orders/${id}/restore`, {
            method: "PATCH",
         });

         const responseData = await res.json();
         if (!res.ok)
            throw new Error(
               responseData.error ||
               responseData.message ||
               "Error al restaurar orden de compra"
            );

         get().invalidateCache();
         await get().GetPurchaseOrdersDeleted({ force: true });
      } catch (error) {
         return error as Error;
      }
   },
}));
