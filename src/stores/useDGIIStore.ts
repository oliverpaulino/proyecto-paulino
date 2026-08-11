import { create } from "zustand";

export type DGIIResponse = {
   error: boolean;
   mensaje?: string;
   nombre_razon_social?: string;
   [key: string]: unknown;
};

type DGIIStore = {
   isLoading: boolean;
   lastResult: DGIIResponse | null;
   ConsultarDGII: (identificacion: string) => Promise<DGIIResponse | null>;
};

export const useDGIIStore = create<DGIIStore>((set) => ({
   isLoading: false,
   lastResult: null,

   ConsultarDGII: async (identificacion) => {
      set({ isLoading: true });
      try {
         const res = await fetch(`/api/dgii/${identificacion}`);
         if (!res.ok) return null;
         const data: DGIIResponse = await res.json();
         set({ lastResult: data });
         return data;
      } catch {
         return null;
      } finally {
         set({ isLoading: false });
      }
   },
}));
