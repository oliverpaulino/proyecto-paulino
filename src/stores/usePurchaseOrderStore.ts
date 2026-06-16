import { create } from "zustand";
import type {
   PurchaseOrder,
   PurchaseOrderForm,
   UpdatePurchaseOrderForm,
   EstadoOrdenCompra,
} from "@/dtos/purchase-order.dto";

type PurchaseOrderStore = {
   PurchaseOrders: PurchaseOrder[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetPurchaseOrders: (params?: { force?: boolean }) => Promise<void>;
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
   invalidateCache: () => void;
};

export const usePurchaseOrderStore = create<PurchaseOrderStore>((set, get) => ({
   PurchaseOrders: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
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

   CreatePurchaseOrder: async (form) => {
      try {
         const res = await fetch("/api/purchase-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok)
            throw new Error(
               data.error || data.message || "Error al crear orden de compra"
            );

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
}));
