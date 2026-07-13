import { create } from "zustand";
import type { Supplier, SupplierForm, UpdateSupplierForm } from "@/dtos/supplier.dto";

type SupplierStore = {
   Suppliers: Supplier[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetSuppliers: (params?: { force?: boolean }) => Promise<void>;
   GetSupplierById: (id: string) => Promise<Supplier | null>;
   CreateSupplier: (form: SupplierForm) => Promise<Supplier | Error>;
   UpdateSupplier: (id: string, data: Partial<UpdateSupplierForm>) => Promise<void | Error>;
   DeleteSupplier: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const useSupplierStore = create<SupplierStore>((set, get) => ({
   Suppliers: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetSuppliers: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/suppliers");
         if (!res.ok) throw new Error("Error al cargar proveedores");

         const data: Supplier[] = await res.json();

         set((state) => ({
            Suppliers: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching suppliers:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },
   GetSupplierById: async (id) => {
      try {
         const res = await fetch(`/api/suppliers/${id}`);
         if (!res.ok) throw new Error("Error al cargar proveedor");
         const data: Supplier = await res.json();
         return data;
      } catch (error) {
         console.error("Error fetching supplier:", error);
         return null;
      }
   },

   CreateSupplier: async (form) => {
      try {
         const res = await fetch("/api/suppliers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear proveedor");

         get().invalidateCache();
         await get().GetSuppliers();
         return data as Supplier;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateSupplier: async (id, data) => {
      try {
         const res = await fetch(`/api/suppliers/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al actualizar proveedor");

         get().invalidateCache();
         await get().GetSuppliers();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteSupplier: async (id) => {
      try {
         const res = await fetch(`/api/suppliers/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al eliminar proveedor");

         get().invalidateCache();
         await get().GetSuppliers();
      } catch (error) {
         return error as Error;
      }
   },
}));
