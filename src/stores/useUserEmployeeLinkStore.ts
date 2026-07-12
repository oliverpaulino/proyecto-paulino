import { create } from "zustand";
import type {
   UserEmployeeLink,
   CreateUserEmployeeLinkForm,
   UpdateUserEmployeeLinkForm
} from "@/dtos/user-employee-link.dto";

type UserEmployeeLinkStore = {
   Links: UserEmployeeLink[];
   selectedLink: UserEmployeeLink | null;
   loading: boolean;

   GetLinks: () => Promise<void>;
   GetLinksByUserId: (userId: string) => Promise<UserEmployeeLink[]>;
   GetLinkByEmployeeId: (empleadoId: string) => Promise<UserEmployeeLink | null>;
   
   CreateLink: (form: CreateUserEmployeeLinkForm) => Promise<UserEmployeeLink | Error>;
   UpdateLink: (id: string, data: UpdateUserEmployeeLinkForm) => Promise<void | Error>;
   DeleteLink: (id: string) => Promise<void | Error>;

   setSelectedLink: (link: UserEmployeeLink | null) => void;
   setLoading: (loading: boolean) => void;
};

export const useUserEmployeeLinkStore = create<UserEmployeeLinkStore>((set, get) => ({
   Links: [],
   selectedLink: null,
   loading: false,

   GetLinks: async () => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/user-employee-links`);
         if (!res.ok) throw new Error("Error al cargar los vínculos");
         
         const links: UserEmployeeLink[] = await res.json();
         set({ Links: links });
      } catch (error) {
         console.error("Error fetching user-employee links:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetLinksByUserId: async (userId) => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/user-employee-links/user/${userId}`);
         if (!res.ok) throw new Error("Error al cargar los vínculos del usuario");
         return await res.json();
      } catch (error) {
         console.error("Error fetching links by user id:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetLinkByEmployeeId: async (empleadoId) => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/user-employee-links/employee/${empleadoId}`);
         if (!res.ok) {
             if(res.status === 404) return null;
             throw new Error("Error al cargar el vínculo del empleado");
         }
         return await res.json();
      } catch (error) {
         console.error("Error fetching link by employee id:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateLink: async (form) => {
      try {
         const res = await fetch(`/api/user-employee-links`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear vínculo");

         await get().GetLinks();
         return data as UserEmployeeLink;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateLink: async (id, data) => {
      try {
         const res = await fetch(`/api/user-employee-links/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar vínculo");

         await get().GetLinks();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteLink: async (id) => {
      try {
         const res = await fetch(`/api/user-employee-links/${id}`, { method: "DELETE" });
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar vínculo");

         await get().GetLinks();
         set({ selectedLink: null });
      } catch (error) {
         return error as Error;
      }
   },

   setSelectedLink: (link) => set({ selectedLink: link }),
   setLoading: (loading) => set({ loading }),
}));