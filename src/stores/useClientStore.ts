import { create } from "zustand";
import type {
   Client,
   Contact,
   ClientForm,
   ClientDetails,
   ClientSalesSummary,
   ClientProjectSummary,
   CreateContactForm,
   UpdateContactForm,
} from "@/dtos/client.dto";

type ClientStore = {
   Clients: Client[];
   Contacts: Contact[];
   selectedClient: ClientDetails | null;
   loading: boolean;
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
   };
   _fetchedClientLists: Set<string>;
   _fetchedDetails: Set<string>;
   _fetchedContacts: Set<string>;

   // Actions
   CreateClient: (ClientForm: ClientForm) => Promise<Client | Error>;
   GetClients: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      force?: boolean;
   }) => Promise<void>;

   GetClientDetails: (
      clientId: string,
      force?: boolean,
   ) => Promise<ClientDetails | null>;
   GetClientSales: (
      clientId: string,
      params?: Record<string, string>,
   ) => Promise<{
      sales: ClientSalesSummary[];
      pagination: { page: number; totalPages: number; totalCount: number };
   }>;
   GetClientProjects: (
      clientId: string,
      params?: Record<string, string>,
   ) => Promise<{
      projects: ClientProjectSummary[];
      pagination: { page: number; totalPages: number; totalCount: number };
   }>;
   UploadBulkClients: (file: File) => Promise<boolean>;
   UpdateClient: (
      clientId: string,
      data: Partial<ClientForm>,
   ) => Promise<void | Error>;
   DeleteClient: (clientId: string) => Promise<void | Error>;

   // Pagination helpers
   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;
   SearchClients: (search: string) => Promise<void>;

   //contacts
   GetClientContacts: (clientId: string, force?: boolean) => Promise<void>;
   CreateContact: (
      contactData: Partial<CreateContactForm>,
   ) => Promise<void | Error>;
   UpdateContact: (
      contactData: Partial<UpdateContactForm>,
   ) => Promise<void | Error>;
   DeleteContact: (clientId: string, contactId: string) => Promise<void | Error>;
   // State setters
   setSelectedClient: (client: ClientDetails | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedClient: () => void;
   invalidateCache: () => void;
};

export const useClientStore = create<ClientStore>((set, get) => ({
   Clients: [],
   Contacts: [],
   selectedClient: null,
   loading: false,
   pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
   },
   _fetchedClientLists: new Set<string>(),
   _fetchedDetails: new Set<string>(),
   _fetchedContacts: new Set<string>(),

   invalidateCache: () => {
      set({
         _fetchedClientLists: new Set<string>(),
         _fetchedDetails: new Set<string>(),
         _fetchedContacts: new Set<string>(),
      });
   },

   CreateClient: async (ClientForm) => {
      console.log(ClientForm);

      try {
         const res = await fetch(`/api/clients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ClientForm }),
         });

         if (!res.ok) {
            throw new Error((await res.json()).message);
         }
         // refresh after create
         get().invalidateCache();
         await get().GetClients();
         const data: { data: Client } = await res.json();
         return data.data;
      } catch (error) {
         return error as Error;
      }
   },
   UploadBulkClients: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/clients/bulk/upload`, {
         method: "POST",
         body: formData,
      });
      if (!res.ok) {
         const error = await res.json();
         console.error("Error uploading file:", error);
         return false;
      }
      const data = await res.json();
      console.log("File uploaded successfully:", data);
      return true;
   },
   GetClients: async (params = {}) => {
      const { page = 1, limit = 20, search = "", force = false } = params;
      const cacheKey = `${page}:${limit}:${search}`;
      if (!force && get()._fetchedClientLists.has(cacheKey)) return;

      try {
         const queryParams = new URLSearchParams();
         queryParams.append("page", page.toString());
         queryParams.append("limit", limit.toString());
         if (search) {
            queryParams.append("search", search);
         }

         const res = await fetch(`/api/clients?${queryParams}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
         });

         if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to fetch clients");
         }

         const data: {
            clients: Client[];
            pagination: {
               page: number;
               limit: number;
               total: number;
               totalPages: number;
               hasNext: boolean;
               hasPrev: boolean;
            };
         } = await res.json();

         set((state) => ({
            Clients: data.clients,
            pagination: data.pagination,
            _fetchedClientLists: new Set(state._fetchedClientLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching clients:", error);
         throw error;
      }
   },

   GetClientDetails: async (clientId: string, force?: boolean) => {
      if (!force && get()._fetchedDetails.has(clientId)) {
         return get().selectedClient;
      }
      set({ loading: true });
      try {
         const res = await fetch(`/api/clients/${clientId}/details`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
         });

         if (!res.ok) {
            throw new Error("Failed to fetch client details");
         }

         const data = await res.json();
         const clientDetails = data.client_details;

         set((state) => ({
            selectedClient: clientDetails,
            _fetchedDetails: new Set(state._fetchedDetails).add(clientId),
         }));
         return clientDetails;
      } catch (error) {
         console.error("Error fetching client details:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetClientSales: async (clientId: string, params = {}) => {
      try {
         const queryParams = new URLSearchParams(params);
         const res = await fetch(`/api/clients/${clientId}/sales?${queryParams}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
         });

         if (!res.ok) {
            throw new Error("Failed to fetch client sales");
         }

         return await res.json();
      } catch (error) {
         console.error("Error fetching client sales:", error);
         throw error;
      }
   },

   GetClientProjects: async (clientId: string, params = {}) => {
      try {
         const queryParams = new URLSearchParams(params);
         const res = await fetch(
            `/api/clients/${clientId}/projects?${queryParams}`,
            {
               method: "GET",
               headers: { "Content-Type": "application/json" },
            },
         );

         if (!res.ok) {
            throw new Error("Failed to fetch client projects");
         }

         return await res.json();
      } catch (error) {
         console.error("Error fetching client projects:", error);
         throw error;
      }
   },

   UpdateClient: async (clientId: string, data: Partial<ClientForm>) => {
      try {
         const res = await fetch(`/api/clients/${clientId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         if (!res.ok) {
            throw new Error((await res.json()).message);
         }

         // Refresh clients list
         get().invalidateCache();
         await get().GetClients();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteClient: async (clientId: string) => {
      try {
         const res = await fetch(`/api/clients/${clientId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
         });

         if (!res.ok) {
            throw new Error((await res.json()).message);
         }

         // Refresh clients list
         get().invalidateCache();
         await get().GetClients();
      } catch (error) {
         return error as Error;
      }
   },

   // Pagination helpers
   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) {
         await get().GetClients({
            page: pagination.page + 1,
            limit: pagination.limit,
         });
      }
   },

   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) {
         await get().GetClients({
            page: pagination.page - 1,
            limit: pagination.limit,
         });
      }
   },

   GoToPage: async (page: number) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) {
         await get().GetClients({ page, limit: pagination.limit });
      }
   },

   SearchClients: async (search: string) => {
      const { pagination } = get();
      await get().GetClients({ page: 1, limit: pagination.limit, search });
   },

   GetClientContacts: async (clientId: string, force?: boolean) => {
      if (!force && get()._fetchedContacts.has(clientId)) return;
      try {
         const res = await fetch(`/api/clients/${clientId}/contacts`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
         });

         if (!res.ok) {
            throw new Error("Failed to fetch client contacts");
         }

         const data = await res.json();
         set((state) => ({
            Contacts: data.contacts,
            _fetchedContacts: new Set(state._fetchedContacts).add(clientId),
         }));
      } catch (error) {
         console.error("Error fetching client contacts:", error);
         throw error;
      }
   },
   CreateContact: async (contactData: Partial<Contact>) => {
      try {
         const res = await fetch(`/api/clients/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...contactData }),
         });

         if (!res.ok) {
            throw new Error((await res.json()).message);
         }

         // Refresh contacts list
         set((state) => {
            const next = new Set(state._fetchedContacts);
            next.delete(contactData.client_id!);
            return { _fetchedContacts: next };
         });
         await get().GetClientContacts(contactData.client_id!);
      } catch (error) {
         return error as Error;
      }
   },
   UpdateContact: async (contactData: Partial<Contact>) => {
      const clientId = contactData.client_id;
      try {
         const res = await fetch(
            `/api/clients/${clientId}/contacts/${contactData.id}`,
            {
               method: "PATCH",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(contactData),
            },
         );

         if (!res.ok) {
            throw new Error((await res.json()).message);
         }

         // Refresh contacts list
         set((state) => {
            const next = new Set(state._fetchedContacts);
            next.delete(clientId!);
            return { _fetchedContacts: next };
         });
         await get().GetClientContacts(clientId!);
      } catch (error) {
         return error as Error;
      }
   },
   DeleteContact: async (clientId: string, contactId: string) => {
      try {
         const res = await fetch(
            `/api/clients/${clientId}/contacts/${contactId}`,
            {
               method: "DELETE",
               headers: { "Content-Type": "application/json" },
            },
         );

         if (!res.ok) {
            throw new Error((await res.json()).message);
         }

         // Refresh contacts list
         set((state) => {
            const next = new Set(state._fetchedContacts);
            next.delete(clientId);
            return { _fetchedContacts: next };
         });
         await get().GetClientContacts(clientId);
      } catch (error) {
         return error as Error;
      }
   },

   clearSelectedClient: () => set({ selectedClient: null }),
   setSelectedClient: (client: ClientDetails | null) =>
      set({ selectedClient: client }),
   setLoading: (loading: boolean) => set({ loading }),
}));
