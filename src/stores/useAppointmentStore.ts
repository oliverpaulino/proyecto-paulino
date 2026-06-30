import { create } from "zustand";
import type {
   AppointmentUI,
   CreateAppointmentForm,
   UpdateAppointmentForm,
   EstadoCita,
} from "@/dtos/appointment.dto";

type AppointmentStore = {
   Appointments: AppointmentUI[]; // Las 20 citas de la página actual
   allFetchedAppointments: AppointmentUI[]; // El cache maestro en memoria
   selectedAppointment: AppointmentUI | null;
   loading: boolean;
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
   };

   // Filtros activos para mantenerlos al cambiar de página
   currentFilters: {
      search: string;
      state?: EstadoCita;
      start?: string;
      end?: string;
   };

   _fetchedAppointmentLists: Set<string>;

   GetAppointments: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      state?: EstadoCita;
      start?: string;
      end?: string;
      force?: boolean;
   }) => Promise<void>;

   CreateAppointment: (form: CreateAppointmentForm) => Promise<AppointmentUI | Error>;
   UpdateAppointment: (id: string, data: UpdateAppointmentForm) => Promise<void | Error>;
   DeleteAppointment: (id: string) => Promise<void | Error>;

   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;
   SearchAppointments: (search: string) => Promise<void>;

   setSelectedAppointment: (appointment: AppointmentUI | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedAppointment: () => void;
   invalidateCache: () => void;
};

const BASE_URL = "/api/appointments";

export const useAppointmentStore = create<AppointmentStore>((set, get) => ({
   Appointments: [],
   allFetchedAppointments: [],
   selectedAppointment: null,
   loading: false,
   pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
   },
   currentFilters: {
      search: "",
   },
   _fetchedAppointmentLists: new Set<string>(),

   invalidateCache: () => {
      set({ _fetchedAppointmentLists: new Set<string>() });
   },

   GetAppointments: async (params = {}) => {
      const {
         page = 1,
         limit = 20,
         search = get().currentFilters.search,
         state = get().currentFilters.state,
         start = get().currentFilters.start,
         end = get().currentFilters.end,
         force = false,
      } = params;

      set({ currentFilters: { search, state, start, end } });

      const cacheKey = `${state || ""}:${start || ""}:${end || ""}`;
      let masterList = get().allFetchedAppointments;

      if (force || !get()._fetchedAppointmentLists.has(cacheKey)) {
         set({ loading: true });
         try {
            const query = new URLSearchParams();
            if (start) query.append("start", start);
            if (end) query.append("end", end);

            const url = query.toString() ? `${BASE_URL}?${query.toString()}` : BASE_URL;
            const res = await fetch(url);
            
            if (!res.ok) {
               const errData = await res.json().catch(() => null);
               throw new Error(errData?.error || "Error al cargar citas");
            }

            masterList = await res.json();

            set((s) => ({
               allFetchedAppointments: masterList,
               _fetchedAppointmentLists: new Set(s._fetchedAppointmentLists).add(cacheKey),
            }));
         } catch (error) {
            console.error("Error fetching appointments:", error);
            set({ loading: false });
            return;
         }
      }

      const filtered = search.trim()
         ? masterList.filter((a) =>
              a.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
              a.motivo?.toLowerCase().includes(search.toLowerCase()) ||
              a.employee_nombre?.toLowerCase().includes(search.toLowerCase())
           )
         : masterList;

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const startIndex = (safePage - 1) * limit;

      set({
         Appointments: filtered.slice(startIndex, startIndex + limit),
         loading: false,
         pagination: {
            page: safePage,
            limit,
            total,
            totalPages,
            hasNext: safePage < totalPages,
            hasPrev: safePage > 1,
         },
      });
   },

   CreateAppointment: async (form) => {
      try {
         const res = await fetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         
         const data = await res.json();
         if (!res.ok) {
            const errMsg = typeof data.error === "object" ? "Verifica los campos del formulario" : data.error;
            throw new Error(errMsg || "Error al agendar cita");
         }

         get().invalidateCache();
         await get().GetAppointments({ force: true });
         return data as AppointmentUI;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateAppointment: async (id, data) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         
         if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Error al actualizar cita");
         }

         get().invalidateCache();
         await get().GetAppointments({ force: true });
      } catch (error) {
         return error as Error;
      }
   },

   DeleteAppointment: async (id) => {
      try {
         const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
         
         if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Error al eliminar cita");
         }

         get().invalidateCache();
         await get().GetAppointments({ force: true });
         get().clearSelectedAppointment();
      } catch (error) {
         return error as Error;
      }
   },

   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) {
         await get().GetAppointments({ page: pagination.page + 1, limit: pagination.limit });
      }
   },

   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) {
         await get().GetAppointments({ page: pagination.page - 1, limit: pagination.limit });
      }
   },

   GoToPage: async (page) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) {
         await get().GetAppointments({ page, limit: pagination.limit });
      }
   },

   SearchAppointments: async (search) => {
      const { pagination } = get();
      await get().GetAppointments({ page: 1, limit: pagination.limit, search });
   },

   setSelectedAppointment: (appointment) => set({ selectedAppointment: appointment }),
   setLoading: (loading) => set({ loading }),
   clearSelectedAppointment: () => set({ selectedAppointment: null }),
}));