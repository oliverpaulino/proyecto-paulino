import { create } from "zustand";
import type {
   Client,
   Contact,
   ClientForm,
   ClientDetails,
   ClientSalesSummary,
   ClientProjectSummary,
   CreateContactForm,
} from "@/dtos/client.dto";

type ContactWithMeta = Contact & { id: string; client_id: string };

type ClientStore = {
   Clients: Client[];
   Contacts: Contact[];
   selectedClientDetails: ClientDetails | null;
   selectedClient: Client | null;
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
   _fetchedClient: Set<string>;
   _fetchedDetails: Set<string>;
   _fetchedContacts: Set<string>;

   CreateClient: (form: ClientForm) => Promise<Client | Error>;
   GetClients: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      force?: boolean;
   }) => Promise<void>;
   GetClientDetails: (clientId: string, force?: boolean) => Promise<ClientDetails | null>;
   GetClient: (clientId: string, force?: boolean) => Promise<Client | null>;
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
   UpdateClient: (clientId: string, data: Partial<ClientForm>) => Promise<void | Error>;
   DeleteClient: (clientId: string) => Promise<void | Error>;

   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;
   SearchClients: (search: string) => Promise<void>;

   GetClientContacts: (clientId: string, force?: boolean) => Promise<void>;
   CreateContact: (contactData: Partial<CreateContactForm>) => Promise<void | Error>;
   UpdateContact: (contactData: Partial<ContactWithMeta>) => Promise<void | Error>;
   DeleteContact: (clientId: string, contactId: string) => Promise<void | Error>;

   setSelectedClientDetails: (client: ClientDetails | null) => void;
   setSelectedClient: (client: Client | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedClientDetails: () => void;
   clearSelectedClient: () => void;

   invalidateCache: () => void;
};

export const useClientStore = create<ClientStore>((set, get) => ({
   Clients: [],
   Contacts: [],
   selectedClientDetails: null,
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
   _fetchedClient: new Set<string>(),
   _fetchedDetails: new Set<string>(),
   _fetchedContacts: new Set<string>(),

   invalidateCache: () => {
      set({
         _fetchedClientLists: new Set<string>(),
         _fetchedClient: new Set<string>(),
         _fetchedDetails: new Set<string>(),
         _fetchedContacts: new Set<string>(),
      });
   },

   CreateClient: async (form) => {
      try {
         const res = await fetch(`/api/clients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();

         if (!res.ok) {
            throw new Error(data.error || data.message || "Error al crear cliente");
         }

         get().invalidateCache();
         await get().GetClients();
         return data as Client;
      } catch (error) {
         return error as Error;
      }
   },


   UploadBulkClients: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/clients/bulk/upload`, {
         method: "POST",
         body: formData,
      });
      if (!res.ok) return false;
      return true;
   },

   GetClients: async (params = {}) => {
      const { page = 1, limit = 20, search = "", force = false } = params;
      const cacheKey = `${page}:${limit}:${search}`;
      if (!force && get()._fetchedClientLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`/api/clients`);
         if (!res.ok) throw new Error("Error al cargar clientes");

         const allClients: Client[] = await res.json();

          const filtered = search
             ? allClients.filter((c) =>
                c.nombre.toLowerCase().includes(search.toLowerCase()) ||
                c.identificacion.toLowerCase().includes(search.toLowerCase()) ||
                (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
                String(c.referencia ?? "").includes(search) ||
                `CLI-${String(c.referencia ?? "").padStart(3, "0")}`.toLowerCase().includes(search.toLowerCase())
             )
             : allClients;

         const total = filtered.length;
         const totalPages = Math.max(1, Math.ceil(total / limit));
         const start = (page - 1) * limit;

         set((state) => ({
            Clients: filtered.slice(start, start + limit),
            pagination: {
               page,
               limit,
               total,
               totalPages,
               hasNext: page < totalPages,
               hasPrev: page > 1,
            },
            _fetchedClientLists: new Set(state._fetchedClientLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching clients:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetClientDetails: async (clientId, force) => {
      if (!force && get()._fetchedDetails.has(clientId)) {
         return get().selectedClientDetails;
      }
      set({ loading: true });
      try {
         const res = await fetch(`/api/clients/${clientId}`);
         if (!res.ok) throw new Error("Error al cargar detalles del cliente");

         const clientData = await res.json();

         const clientDetails = {
            ...clientData,
            ventas: [],
            proyectos: []
         };

         set((state) => ({
            selectedClientDetails: clientDetails as any,
            _fetchedDetails: new Set(state._fetchedDetails).add(clientId),
         }));

         return clientDetails as any;
      } catch (error) {
         console.error("Error fetching client details:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetClient: async (clientId, force = false) => {
      if (!force && get()._fetchedClient.has(clientId)) {
         return get().selectedClient;
      }
      set({ loading: true });
      try {
         const res = await fetch(`/api/clients/${clientId}`);
         if (!res.ok) throw new Error("Error al cargar detalles del cliente");

         const details: Client = await res.json();

         set((state) => ({
            selectedClient: details,
            _fetchedClient: new Set(state._fetchedClient).add(clientId),
         }));
         return details;
      } catch (error) {
         console.error("Error fetching clients details:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetClientSales: async (clientId, params = {}) => {
      const queryParams = new URLSearchParams(params);
      const res = await fetch(`/api/clients/${clientId}/sales?${queryParams}`);
      if (!res.ok) throw new Error("Error al cargar ventas del cliente");
      return res.json();
   },

   GetClientProjects: async (clientId, params = {}) => {
      const queryParams = new URLSearchParams(params);
      const res = await fetch(`/api/clients/${clientId}/projects?${queryParams}`);
      if (!res.ok) throw new Error("Error al cargar proyectos del cliente");
      return res.json();
   },

   UpdateClient: async (clientId, data) => {
      try {
         const res = await fetch(`/api/clients/${clientId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) {
            throw new Error(responseData.error || responseData.message || "Error al actualizar cliente");
         }

         get().invalidateCache();
         await get().GetClients();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteClient: async (clientId) => {
      try {
         const res = await fetch(`/api/clients/${clientId}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) {
            throw new Error(responseData.error || responseData.message || "Error al eliminar cliente");
         }

         get().invalidateCache();
         await get().GetClients();
      } catch (error) {
         return error as Error;
      }
   },

   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) {
         await get().GetClients({ page: pagination.page + 1, limit: pagination.limit, force: true });
      }
   },

   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) {
         await get().GetClients({ page: pagination.page - 1, limit: pagination.limit, force: true });
      }
   },

   GoToPage: async (page) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) {
         await get().GetClients({ page, limit: pagination.limit, force: true });
      }
   },

   SearchClients: async (search) => {
      const { pagination } = get();
      await get().GetClients({ page: 1, limit: pagination.limit, search, force: true });
   },

   GetClientContacts: async (clientId, force) => {
      if (!force && get()._fetchedContacts.has(clientId)) return;
      const res = await fetch(`/api/clients/${clientId}/contacts`);
      if (!res.ok) throw new Error("Error al cargar contactos del cliente");

      const data = await res.json();
      set((state) => ({
         Contacts: data.contacts,
         _fetchedContacts: new Set(state._fetchedContacts).add(clientId),
      }));
   },

   CreateContact: async (contactData) => {
      try {
         const res = await fetch(`/api/clients/contacts`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(contactData),
         });

         if (!res.ok) throw new Error((await res.json()).error || "Error al crear contacto");

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

   UpdateContact: async (contactData) => {
      const clientId = contactData.client_id;
      try {
         const res = await fetch(`/api/clients/${clientId}/contacts/${contactData.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contactData),
         });

         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar contacto");

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

   DeleteContact: async (clientId, contactId) => {
      try {
         const res = await fetch(`/api/clients/${clientId}/contacts/${contactId}`, {
            method: "DELETE",
         });

         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar contacto");

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

   clearSelectedClientDetails: () => set({ selectedClientDetails: null }),
   setSelectedClientDetails: (client) => set({ selectedClientDetails: client }),
   clearSelectedClient: () => set({ selectedClient: null }),
   setSelectedClient: (client) => set({ selectedClient: client }),
   setLoading: (loading) => set({ loading }),
}));
