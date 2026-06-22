import { create } from "zustand";
import type {
   PayrollConcept,
   PayrollConceptForm,
   UpdatePayrollConceptForm,
} from "@/dtos/payroll-concept.dto";

type PayrollConceptStore = {
   concepts: PayrollConcept[];
   loading: boolean;
   _fetched: boolean;

   getConcepts: (force?: boolean) => Promise<void>;
   createConcept: (form: PayrollConceptForm) => Promise<PayrollConcept | Error>;
   updateConcept: (id: string, form: UpdatePayrollConceptForm) => Promise<void | Error>;
   deactivateConcept: (id: string) => Promise<void | Error>;
   invalidateCache: () => void;
};

export const usePayrollConceptStore = create<PayrollConceptStore>((set, get) => ({
   concepts: [],
   loading: false,
   _fetched: false,

   invalidateCache: () => set({ _fetched: false }),

   getConcepts: async (force = false) => {
      if (!force && get()._fetched) return;
      set({ loading: true });
      try {
         const res = await fetch("/api/payroll/concepts");
         if (!res.ok) throw new Error("Error al cargar conceptos de nómina");
         const data: PayrollConcept[] = await res.json();
         set({ concepts: data, _fetched: true });
      } catch (error) {
         console.error("Error fetching payroll concepts:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   createConcept: async (form) => {
      try {
         const res = await fetch("/api/payroll/concepts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear concepto");

         get().invalidateCache();
         await get().getConcepts(true);
         return data as PayrollConcept;
      } catch (error) {
         return error as Error;
      }
   },

   updateConcept: async (id, form) => {
      try {
         const res = await fetch(`/api/payroll/concepts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar concepto");

         get().invalidateCache();
         await get().getConcepts(true);
      } catch (error) {
         return error as Error;
      }
   },

   deactivateConcept: async (id) => {
      try {
         const res = await fetch(`/api/payroll/concepts/${id}`, { method: "DELETE" });
         if (!res.ok) throw new Error((await res.json()).error || "Error al desactivar concepto");

         get().invalidateCache();
         await get().getConcepts(true);
      } catch (error) {
         return error as Error;
      }
   },
}));
