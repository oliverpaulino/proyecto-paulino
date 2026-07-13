import { create } from "zustand";
import type { CategoriaEquipo, CategoriaEquipoForm, UpdateCategoriaEquipoForm } from "@/dtos/categoria-equipo.dto";
import { CreateMedidaCobroForm, MedidaCobro, UpdateMedidaCobroForm } from "@/dtos/medida-cobro.dto";

type MedidaCobroStore = {
   MedidaCobros: MedidaCobro[];
   loading: boolean;
   _fetchedLists: Set<string>;

   GetMedidaCobros: (params?: { force?: boolean }) => Promise<void>;
   CreateMedidaCobro: (form: CreateMedidaCobroForm) => Promise<MedidaCobro | Error>;
   UpdateMedidaCobro: (id: string, data: Partial<UpdateMedidaCobroForm>) => Promise<void | Error>;
   DeleteMedidaCobro: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const useMedidaCobroStore = create<MedidaCobroStore>((set, get) => ({
   MedidaCobros: [],
   loading: false,
   _fetchedLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetMedidaCobros: async ({ force = false } = {}) => {
      const cacheKey = "all";
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch("/api/medida-cobros");
         if (!res.ok) throw new Error("Error al cargar medidas de cobro");

         const data: MedidaCobro[] = await res.json();

         set((state) => ({
            MedidaCobros: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching medida_cobro:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateMedidaCobro: async (form) => {
      try {
         const res = await fetch("/api/medida-cobros", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear medida de cobro");

         get().invalidateCache();
         await get().GetMedidaCobros();
         return data as MedidaCobro;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateMedidaCobro: async (id, data) => {
      try {
         const res = await fetch(`/api/medida-cobros/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al actualizar medida de cobro");

         get().invalidateCache();
         await get().GetMedidaCobros();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteMedidaCobro: async (id) => {
      try {
         const res = await fetch(`/api/medida-cobros/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al eliminar medida de cobro");

         get().invalidateCache();
         await get().GetMedidaCobros();
      } catch (error) {
         return error as Error;
      }
   },
}));
