import { create } from "zustand";

export interface RolEmpleado {
   id: string;
   nombre: string;
   label: string;
   es_operador: boolean;
   color: string | null;
   created_at: string;
   updated_at: string;
}

type RolEmpleadoStore = {
   roles: RolEmpleado[];
   loading: boolean;
   error: string | null;
   GetRoles: (force?: boolean) => Promise<void>;
   CreateRole: (data: { nombre: string; label: string; es_operador?: boolean; color?: string | null }) => Promise<RolEmpleado | Error>;
   UpdateRole: (id: string, data: { label?: string; es_operador?: boolean; color?: string | null }) => Promise<void | Error>;
   DeleteRole: (id: string) => Promise<void | Error>;
};

export const useRolEmpleadoStore = create<RolEmpleadoStore>((set, get) => ({
   roles: [],
   loading: false,
   error: null,

   GetRoles: async (force = false) => {
      if (!force && get().roles.length > 0) return;
      set({ loading: true, error: null });
      try {
         const res = await fetch("/api/roles-empleado");
         if (!res.ok) throw new Error("Error al cargar roles");
         const data: RolEmpleado[] = await res.json();
         set({ roles: data });
      } catch (err) {
         set({ error: err instanceof Error ? err.message : "Error desconocido" });
      } finally {
         set({ loading: false });
      }
   },

   CreateRole: async (data) => {
      try {
         const res = await fetch("/api/roles-empleado", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         const result = await res.json();
         if (!res.ok) throw new Error(result.error || "Error al crear rol");
         await get().GetRoles(true);
         return result as RolEmpleado;
      } catch (err) {
         return err as Error;
      }
   },

   UpdateRole: async (id, data) => {
      try {
         const res = await fetch(`/api/roles-empleado/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         const result = await res.json();
         if (!res.ok) throw new Error(result.error || "Error al actualizar rol");
         await get().GetRoles(true);
      } catch (err) {
         return err as Error;
      }
   },

   DeleteRole: async (id) => {
      try {
         const res = await fetch(`/api/roles-empleado/${id}`, { method: "DELETE" });
         const result = await res.json();
         if (!res.ok) throw new Error(result.error || "Error al eliminar rol");
         await get().GetRoles(true);
      } catch (err) {
         return err as Error;
      }
   },
}));
