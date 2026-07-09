import { create } from "zustand";
import type { Unit, CreateUnitForm, UpdateUnitForm, TipoUnidad, ConversionResult } from "@/dtos/unit.dto";

type UnitStore = {
   Units: Unit[];
   selectedUnit: Unit | null;
   loading: boolean;

   GetUnits: () => Promise<void>;
   GetUnitsByTipo: (tipoUnidad: TipoUnidad) => Promise<Unit[]>;
   GetUnitById: (id: string) => Promise<Unit | null>;
   ConvertirUnidades: (valor: number, origenId: string, destinoId: string) => Promise<ConversionResult>;
   
   CreateUnit: (form: CreateUnitForm) => Promise<Unit | Error>;
   UpdateUnit: (id: string, data: UpdateUnitForm) => Promise<void | Error>;
   DeleteUnit: (id: string) => Promise<void | Error>;

   setSelectedUnit: (unit: Unit | null) => void;
   setLoading: (loading: boolean) => void;
};

export const useUnitStore = create<UnitStore>((set, get) => ({
   Units: [],
   selectedUnit: null,
   loading: false,

   GetUnits: async () => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/units`);
         if (!res.ok) throw new Error("Error al cargar las unidades");
         
         const units: Unit[] = await res.json();
         set({ Units: units });
      } catch (error) {
         console.error("Error fetching units:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetUnitsByTipo: async (tipoUnidad) => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/units/tipo/${tipoUnidad}`);
         if (!res.ok) throw new Error("Error al cargar las unidades por tipo");
         return await res.json();
      } catch (error) {
         console.error("Error fetching units by type:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetUnitById: async (id) => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/units/${id}`);
         if (!res.ok) {
             if(res.status === 404) return null;
             throw new Error("Error al cargar la unidad");
         }
         return await res.json();
      } catch (error) {
         console.error("Error fetching unit by id:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   ConvertirUnidades: async (valor, origenId, destinoId) => {
      try {
         const res = await fetch(`/api/units/convertir/${origenId}/${destinoId}?valor=${valor}`);
         const data = await res.json();
         
         if (!res.ok) {
             throw new Error(data.error || "Error al realizar la conversión");
         }
         
         return data as ConversionResult;
      } catch (error) {
         console.error("Error convirtiendo unidades:", error);
         throw error;
      }
   },

   CreateUnit: async (form) => {
      try {
         const res = await fetch(`/api/units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear unidad");

         await get().GetUnits();
         return data as Unit;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateUnit: async (id, data) => {
      try {
         const res = await fetch(`/api/units/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar unidad");

         await get().GetUnits();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteUnit: async (id) => {
      try {
         const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar unidad");

         await get().GetUnits();
         set({ selectedUnit: null });
      } catch (error) {
         return error as Error;
      }
   },

   setSelectedUnit: (unit) => set({ selectedUnit: unit }),
   setLoading: (loading) => set({ loading }),
}));