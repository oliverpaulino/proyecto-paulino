import { create } from "zustand";
import type {
   Employee,
   CreateEmployeeForm,
   UpdateEmployeeForm,
   ContactEmployee,
   CreateContactEmployeeForm,
   UpdateContactEmployeeForm,
   Operator,
   CreateOperatorForm,
   UpdateOperatorForm,
   EmployeeDetails,
} from "@/dtos/employee.dto";

type EmployeeStore = {
   Employees: Employee[];
   selectedEmployee: EmployeeDetails | null;
   loading: boolean;
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
   };
   
   _fetchedEmployeeLists: Set<string>;
   _fetchedDetails: Set<string>;

   GetEmployees: (params?: { page?: number; limit?: number; search?: string; force?: boolean }) => Promise<void>;
   GetEmployeeDetails: (empleadoId: string, force?: boolean) => Promise<EmployeeDetails | null>;
   CreateEmployee: (form: CreateEmployeeForm) => Promise<Employee | Error>;
   UpdateEmployee: (empleadoId: string, data: UpdateEmployeeForm) => Promise<void | Error>;
   DeleteEmployee: (empleadoId: string) => Promise<void | Error>;

   NextPage: () => Promise<void>;
   PrevPage: () => Promise<void>;
   GoToPage: (page: number) => Promise<void>;
   SearchEmployees: (search: string) => Promise<void>;

   CreateContact: (data: CreateContactEmployeeForm) => Promise<void | Error>;
   UpdateContact: (contactoId: string, data: UpdateContactEmployeeForm, empleadoId?: string) => Promise<void | Error>;
   DeleteContact: (empleadoId: string, contactoId: string) => Promise<void | Error>;

   CreateOperator: (data: CreateOperatorForm) => Promise<void | Error>;
   UpdateOperator: (operadorId: string, data: UpdateOperatorForm) => Promise<void | Error>;

   setSelectedEmployee: (employee: EmployeeDetails | null) => void;
   setLoading: (loading: boolean) => void;
   clearSelectedEmployee: () => void;
   invalidateCache: () => void;
};

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
   Employees: [],
   selectedEmployee: null,
   loading: false,
   pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
   },
   _fetchedEmployeeLists: new Set<string>(),
   _fetchedDetails: new Set<string>(),

   invalidateCache: () => {
      set({
         _fetchedEmployeeLists: new Set<string>(),
         _fetchedDetails: new Set<string>(),
      });
   },

   GetEmployees: async (params = {}) => {
      const { page = 1, limit = 20, search = "", force = false } = params;
      const cacheKey = `${page}:${limit}:${search}`;
      if (!force && get()._fetchedEmployeeLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`/api/employees`);
         if (!res.ok) throw new Error("Error al cargar empleados");

         const allEmployees: Employee[] = await res.json();

         const filtered = search
            ? allEmployees.filter((e) =>
                 e.nombre.toLowerCase().includes(search.toLowerCase()) ||
                 e.identificacion.includes(search)
              )
            : allEmployees;

         const total = filtered.length;
         const totalPages = Math.max(1, Math.ceil(total / limit));
         const start = (page - 1) * limit;

         set((state) => ({
            Employees: filtered.slice(start, start + limit),
            pagination: {
               page,
               limit,
               total,
               totalPages,
               hasNext: page < totalPages,
               hasPrev: page > 1,
            },
            _fetchedEmployeeLists: new Set(state._fetchedEmployeeLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching employees:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetEmployeeDetails: async (empleadoId, force = false) => {
      if (!force && get()._fetchedDetails.has(empleadoId)) {
         return get().selectedEmployee;
      }
      set({ loading: true });
      try {
         const res = await fetch(`/api/employees/${empleadoId}/details`);
         if (!res.ok) throw new Error("Error al cargar detalles del empleado");

         const details: EmployeeDetails = await res.json();

         set((state) => ({
            selectedEmployee: details,
            _fetchedDetails: new Set(state._fetchedDetails).add(empleadoId),
         }));
         return details;
      } catch (error) {
         console.error("Error fetching employee details:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   CreateEmployee: async (form) => {
      try {
         const res = await fetch(`/api/employees`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear empleado");

         get().invalidateCache();
         await get().GetEmployees({ force: true });
         return data as Employee;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateEmployee: async (empleadoId, data) => {
      try {
         const res = await fetch(`/api/employees/${empleadoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar empleado");

         get().invalidateCache();
         await get().GetEmployees({ force: true });
         await get().GetEmployeeDetails(empleadoId, true);
      } catch (error) {
         return error as Error;
      }
   },

   DeleteEmployee: async (empleadoId) => {
      try {
         const res = await fetch(`/api/employees/${empleadoId}`, { method: "DELETE" });
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar empleado");

         get().invalidateCache();
         await get().GetEmployees({ force: true });
         get().clearSelectedEmployee();
      } catch (error) {
         return error as Error;
      }
   },

   NextPage: async () => {
      const { pagination } = get();
      if (pagination.hasNext) await get().GetEmployees({ page: pagination.page + 1, limit: pagination.limit, force: true });
   },
   PrevPage: async () => {
      const { pagination } = get();
      if (pagination.hasPrev) await get().GetEmployees({ page: pagination.page - 1, limit: pagination.limit, force: true });
   },
   GoToPage: async (page) => {
      const { pagination } = get();
      if (page >= 1 && page <= pagination.totalPages) await get().GetEmployees({ page, limit: pagination.limit, force: true });
   },
   SearchEmployees: async (search) => {
      const { pagination } = get();
      await get().GetEmployees({ page: 1, limit: pagination.limit, search, force: true });
   },
   
   CreateContact: async (data) => {
      try {
         const res = await fetch(`/api/employees/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al crear contacto");
         await get().GetEmployeeDetails(data.empleado_id, true);
      } catch (error) {
         return error as Error;
      }
   },

   UpdateContact: async (contactoId, data,) => {
      try {
         const res = await fetch(`/api/employees/contacts/${contactoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar contacto");
         const empId = empleadoId ?? get().selectedEmployee?.empleado.id;
         if (empId) await get().GetEmployeeDetails(empId, true);
      } catch (error) {
         return error as Error;
      }
   },

   DeleteContact: async (empleadoId, contactoId) => {
      try {
         const res = await fetch(`/api/employees/contacts/${contactoId}`, { method: "DELETE" });
         if (!res.ok) throw new Error((await res.json()).error || "Error al eliminar contacto");
         await get().GetEmployeeDetails(empleadoId, true);
      } catch (error) {
         return error as Error;
      }
   },

   CreateOperator: async (data) => {
      try {
         const res = await fetch(`/api/employees/operators`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al asignar operador");
         await get().GetEmployeeDetails(data.empleado_id, true);
      } catch (error) {
         return error as Error;
      }
   },

   UpdateOperator: async (operadorId, data) => {
      try {
         const res = await fetch(`/api/employees/operators/${operadorId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (!res.ok) throw new Error((await res.json()).error || "Error al actualizar operador");
         const empId = get().selectedEmployee?.empleado.id;
         if (empId) await get().GetEmployeeDetails(empId, true);
      } catch (error) {
         return error as Error;
      }
   },

   setSelectedEmployee: (employee) => set({ selectedEmployee: employee }),
   setLoading: (loading) => set({ loading }),
   clearSelectedEmployee: () => set({ selectedEmployee: null }),
}));