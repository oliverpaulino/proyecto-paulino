import { create } from "zustand";

export type PermissionMap = Record<string, string[]>;

export interface RoleRow {
   key: string;
   label: string;
   description: string | null;
   permissions: PermissionMap;
   isBuiltin: boolean;
   isAdmin: boolean;
}

export type CreateRoleData = {
   key: string;
   label: string;
   description: string;
   permissions: PermissionMap;
};

export type UpdateRoleData = Omit<CreateRoleData, "key">;

type RoleStore = {
   roles: RoleRow[];
   loading: boolean;
   error: string | null;

   GetRoles: () => Promise<void>;
   CreateRole: (data: CreateRoleData) => Promise<RoleRow | Error>;
   UpdateRole: (key: string, data: UpdateRoleData) => Promise<RoleRow | Error>;
   DeleteRole: (key: string) => Promise<void | Error>;

   clearError: () => void;
};

export const useRoleStore = create<RoleStore>((set, get) => ({
   roles: [],
   loading: false,
   error: null,

   GetRoles: async () => {
      set({ loading: true, error: null });
      try {
         const res = await fetch("/api/roles", { credentials: "include" });
         if (!res.ok) throw new Error("No se pudieron cargar los roles");
         const roles: RoleRow[] = await res.json();
         set({ roles });
      } catch (err) {
         set({ error: err instanceof Error ? err.message : "Error desconocido" });
      } finally {
         set({ loading: false });
      }
   },

   CreateRole: async (data) => {
      try {
         const res = await fetch("/api/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
         });
         const body = await res.json().catch(() => null);
         if (!res.ok) throw new Error(body?.error ?? "No se pudo guardar el rol");

         await get().GetRoles();
         return body as RoleRow;
      } catch (err) {
         return err as Error;
      }
   },

   UpdateRole: async (key, data) => {
      try {
         const res = await fetch(`/api/roles/${key}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
         });
         const body = await res.json().catch(() => null);
         if (!res.ok) throw new Error(body?.error ?? "No se pudo guardar el rol");

         await get().GetRoles();
         return body as RoleRow;
      } catch (err) {
         return err as Error;
      }
   },

   DeleteRole: async (key) => {
      try {
         const res = await fetch(`/api/roles/${key}`, {
            method: "DELETE",
            credentials: "include",
         });
         if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? "No se pudo eliminar el rol");
         }
         await get().GetRoles();
      } catch (err) {
         set({ error: err instanceof Error ? err.message : "Error desconocido" });
      }
   },

   clearError: () => set({ error: null }),
}));
