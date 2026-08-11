import { create } from "zustand";
import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";
import { Employee, OperadorAsignable } from "@/dtos/employee.dto";
import type { Equipo, EquipoCompraItem, EquipoEstadoHistorial, EquipoForm, EstadoEquipo, UpdateEquipoForm } from "@/dtos/equipo.dto";
import type { EquipoRentabilidad } from "@/dtos/rentabilidad.dto";

type EquipoStore = {
   Equipos: Equipo[];
   selectedEquipo: Equipo | null;
   loading: boolean;
   _fetchedLists: Set<string>;


   GetEquipos: (params?: { page?: number; limit?: number; search?: string; force?: boolean }) => Promise<void>;
   GetEquipoById: (id: string) => Promise<Equipo | null>;
   CreateEquipo: (form: EquipoForm) => Promise<Equipo | Error>;
   UpdateEquipo: (id: string, data: Partial<UpdateEquipoForm>) => Promise<void | Error>;
   DeleteEquipo: (id: string) => Promise<void | Error>;
   GetCategoriasEquipoByEquipoId: (id: string) => Promise<CategoriaEquipo>;
   GetOperadorByEquipoId: (id: string) => Promise<OperadorAsignable | null>;
   ChangeEstado: (id: string, estado: EstadoEquipo, nota?: string) => Promise<Equipo | Error>;
   invalidateCache: () => void;

   // Rentabilidad del equipo (tab Rentabilidad)
   rentabilidadData: EquipoRentabilidad | null;
   rentabilidadLoading: boolean;
   rentabilidadError: string | null;
   GetRentabilidad: (equipoId: string, desde?: string, hasta?: string, force?: boolean) => Promise<void>;

   // Compras del equipo (tab Compras y tarjeta "Artículos comprados" del tab General)
   comprasItems: EquipoCompraItem[];
   comprasLoading: boolean;
   comprasError: string | null;
   GetEquipoCompras: (equipoId: string, desde?: string, hasta?: string, force?: boolean) => Promise<void>;

   // Historial de estados del equipo (tarjeta del tab General)
   historialData: EquipoEstadoHistorial[];
   historialLoading: boolean;
   historialError: string | null;
   GetEquipoHistorial: (equipoId: string, force?: boolean) => Promise<void>;

   _rentabilidadCache: Map<string, EquipoRentabilidad>;
   _comprasCache: Map<string, EquipoCompraItem[]>;
   _historialCache: Map<string, EquipoEstadoHistorial[]>;
};

export const useEquipoStore = create<EquipoStore>((set, get) => ({
   Equipos: [],
   selectedEquipo: null,
   loading: false,
   _fetchedLists: new Set<string>(),
   rentabilidadData: null,
   rentabilidadLoading: false,
   rentabilidadError: null,
   comprasItems: [],
   comprasLoading: false,
   comprasError: null,
   historialData: [],
   historialLoading: false,
   historialError: null,

   // Cachés a nivel de módulo: al cambiar de tab el componente se desmonta y
   // remonta, y sin esto volvería a pegarle a la API cada vez. Un refresh del
   // navegador reinicia el módulo y los cachés, así que ahí sí se re-pide.
   _rentabilidadCache: new Map<string, EquipoRentabilidad>(),
   _comprasCache: new Map<string, EquipoCompraItem[]>(),
   _historialCache: new Map<string, EquipoEstadoHistorial[]>(),

   invalidateCache: () => {
      set({ _fetchedLists: new Set<string>() });
   },

   GetEquipos: async ({ page = 1, limit = 10, search = "", force = false } = {}) => {
      const cacheKey = `all_${search}_${page}_${limit}`;
      if (!force && get()._fetchedLists.has(cacheKey)) return;

      set({ loading: true });
      try {
         const res = await fetch(`/api/equipos?page=${page}&limit=${limit}&search=${search}`);
         if (!res.ok) throw new Error("Error al cargar equipos");

         const data: Equipo[] = await res.json();

         set((state) => ({
            Equipos: data,
            _fetchedLists: new Set(state._fetchedLists).add(cacheKey),
         }));
      } catch (error) {
         console.error("Error fetching equipos:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   GetEquipoById: async (id) => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/equipos/${id}`);
         if (!res.ok) throw new Error("Error al cargar equipo");
         const data: Equipo = await res.json();
         set({ selectedEquipo: data });
         return data;
      } catch (error) {
         console.error("Error fetching equipo by id:", error);
         return null;
      } finally {
         set({ loading: false });
      }
   },

   CreateEquipo: async (form) => {
      try {
         const res = await fetch("/api/equipos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al crear equipo");

         get().invalidateCache();
         await get().GetEquipos();
         return data as Equipo;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateEquipo: async (id, data) => {
      try {
         const res = await fetch(`/api/equipos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al actualizar equipo");

         get().invalidateCache();
         await get().GetEquipos();
      } catch (error) {
         return error as Error;
      }
   },

   DeleteEquipo: async (id) => {
      try {
         const res = await fetch(`/api/equipos/${id}`, {
            method: "DELETE",
         });

         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || responseData.message || "Error al eliminar equipo");

         get().invalidateCache();
         await get().GetEquipos();
      } catch (error) {
         return error as Error;
      }
   },

   GetCategoriasEquipoByEquipoId: async (id) => {
      try {
         const res = await fetch(`/api/equipos/${id}/categorias`);
         if (!res.ok) throw new Error("Error al cargar categorías de equipo");
         const data = await res.json();
         return data;
         // Aquí podrías hacer algo con los datos obtenidos, como almacenarlos en el estado si es necesario.
      } catch (error) {
         console.error("Error fetching categorias de equipo:", error);
         throw error;
      }
   },

   GetOperadorByEquipoId: async (id) => {
      try {
         const res = await fetch(`/api/equipos/${id}/operador`);
         if (!res.ok) throw new Error("Error al cargar operador del equipo");
         const data = await res.json();
         return data;
      } catch (error) {
         console.error("Error fetching operador de equipo:", error);
         throw error;
      }
   },
   ChangeEstado: async (id, estado, nota) => {
      try {
         const res = await fetch(`/api/equipos/${id}/estado`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado, nota }),
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || data.message || "Error al cambiar el estado");

         // Keep the cached list consistent (the list holds its own copy of estado).
         get().invalidateCache();
         return data as Equipo;
      } catch (error) {
         return error as Error;
      }
   },

   GetRentabilidad: async (equipoId, desde = "", hasta = "", force = false) => {
      const cacheKey = `${equipoId}|${desde}|${hasta}`;
      const cacheado = get()._rentabilidadCache.get(cacheKey);
      if (!force && cacheado) {
         set({ rentabilidadData: cacheado, rentabilidadError: null, rentabilidadLoading: false });
         return;
      }

      set({ rentabilidadLoading: true, rentabilidadError: null });
      try {
         const params = new URLSearchParams();
         if (desde) params.set("desde", desde);
         if (hasta) params.set("hasta", hasta);
         const res = await fetch(`/api/equipos/${equipoId}/rentabilidad?${params.toString()}`);
         if (!res.ok) throw new Error("No se pudo cargar la rentabilidad");

         const data: EquipoRentabilidad = await res.json();
         set((s) => ({
            rentabilidadData: data,
            _rentabilidadCache: new Map(s._rentabilidadCache).set(cacheKey, data),
         }));
      } catch (error) {
         set({ rentabilidadError: error instanceof Error ? error.message : "Error de conexión" });
      } finally {
         set({ rentabilidadLoading: false });
      }
   },

   GetEquipoCompras: async (equipoId, desde = "", hasta = "", force = false) => {
      const cacheKey = `${equipoId}|${desde}|${hasta}`;
      const cacheado = get()._comprasCache.get(cacheKey);
      if (!force && cacheado) {
         set({ comprasItems: cacheado, comprasError: null, comprasLoading: false });
         return;
      }

      set({ comprasLoading: true, comprasError: null });
      try {
         const params = new URLSearchParams();
         if (desde) params.set("desde", desde);
         if (hasta) params.set("hasta", hasta);
         const res = await fetch(`/api/equipos/${equipoId}/compras?${params.toString()}`);
         if (!res.ok) throw new Error("No se pudieron cargar las compras");

         const items: EquipoCompraItem[] = await res.json();
         set((s) => ({
            comprasItems: items,
            _comprasCache: new Map(s._comprasCache).set(cacheKey, items),
         }));
      } catch (error) {
         set({ comprasError: error instanceof Error ? error.message : "Error de conexión" });
      } finally {
         set({ comprasLoading: false });
      }
   },

   GetEquipoHistorial: async (equipoId, force = false) => {
      const cacheKey = `historial_${equipoId}`;
      const cacheado = get()._historialCache.get(cacheKey);
      if (!force && cacheado) {
         set({ historialData: cacheado, historialError: null, historialLoading: false });
         return;
      }

      set({ historialLoading: true, historialError: null });
      try {
         const res = await fetch(`/api/equipos/${equipoId}/historial`);
         if (!res.ok) throw new Error("No se pudo cargar el historial de estados");

         const data: EquipoEstadoHistorial[] = await res.json();
         set((s) => ({
            historialData: data,
            _historialCache: new Map(s._historialCache).set(cacheKey, data),
         }));
      } catch (error) {
         set({ historialError: error instanceof Error ? error.message : "Error de conexión" });
      } finally {
         set({ historialLoading: false });
      }
   },
}));
