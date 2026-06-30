import { create } from "zustand";
import { SIN_PROYECTO } from "@/dtos/tarea.dto";
import type {
   Tarea,
   TareaForm,
   UpdateTareaForm,
   EstadoTarea,
   ProyectoOption,
} from "@/dtos/tarea.dto";

type TareaStore = {
   tareas: Tarea[];
   proyectos: ProyectoOption[];
   loading: boolean;
   currentProyectoId: string | null;
   _fetchedProyectos: boolean;

   GetTareas: (proyectoId?: string) => Promise<void>;
   GetProyectos: (force?: boolean) => Promise<void>;
   CreateTarea: (form: TareaForm) => Promise<Tarea | Error>;
   UpdateTarea: (tareaId: string, data: UpdateTareaForm) => Promise<Tarea | Error>;
   DeleteTarea: (tareaId: string) => Promise<void | Error>;

   /** Optimistic, in-memory only update (no API call). */
   patchTareaLocally: (tareaId: string, patch: Partial<Tarea>) => void;
   /** Optimistic estado change with rollback on failure — used by drag-and-drop. */
   MoveTarea: (tareaId: string, estado: EstadoTarea) => Promise<void>;
};

export const useTareaStore = create<TareaStore>((set, get) => ({
   tareas: [],
   proyectos: [],
   loading: false,
   currentProyectoId: null,
   _fetchedProyectos: false,

   GetTareas: async (proyectoId) => {
      set({ loading: true, currentProyectoId: proyectoId ?? null });
      try {
         const qs = proyectoId ? `?proyecto_id=${encodeURIComponent(proyectoId)}` : "";
         const res = await fetch(`/api/tareas${qs}`);
         if (!res.ok) throw new Error("Error al cargar tareas");
         const data: Tarea[] = await res.json();
         set({ tareas: data });
      } catch (error) {
         console.error("Error fetching tareas:", error);
      } finally {
         set({ loading: false });
      }
   },

   GetProyectos: async (force = false) => {
      if (!force && get()._fetchedProyectos) return;
      try {
         const res = await fetch(`/api/tareas/proyectos`);
         if (!res.ok) throw new Error("Error al cargar proyectos");
         const data: ProyectoOption[] = await res.json();
         set({ proyectos: data, _fetchedProyectos: true });
      } catch (error) {
         console.error("Error fetching proyectos:", error);
      }
   },

   CreateTarea: async (form) => {
      try {
         const res = await fetch(`/api/tareas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Error al crear tarea");

         const created = data as Tarea;
         // Insertar en la vista actual solo si la tarea coincide con el filtro activo:
         //  - sin filtro (null)                  → siempre
         //  - filtro "Sin proyecto" (SIN_PROYECTO) → solo si la tarea no tiene proyecto
         //  - filtro por id                       → solo si coincide el proyecto
         const { currentProyectoId } = get();
         const matchesFilter =
            !currentProyectoId ||
            (currentProyectoId === SIN_PROYECTO
               ? created.proyecto_id === null
               : currentProyectoId === created.proyecto_id);
         if (matchesFilter) {
            set((state) => ({ tareas: [created, ...state.tareas] }));
         }
         return created;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateTarea: async (tareaId, data) => {
      try {
         const res = await fetch(`/api/tareas/${tareaId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         const responseData = await res.json();
         if (!res.ok) throw new Error(responseData.error || "Error al actualizar tarea");

         const updated = responseData as Tarea;
         set((state) => ({
            tareas: state.tareas.map((t) => (t.id === tareaId ? updated : t)),
         }));
         return updated;
      } catch (error) {
         return error as Error;
      }
   },

   DeleteTarea: async (tareaId) => {
      // Optimistic remove with snapshot for rollback.
      const snapshot = get().tareas;
      set((state) => ({ tareas: state.tareas.filter((t) => t.id !== tareaId) }));
      try {
         const res = await fetch(`/api/tareas/${tareaId}`, { method: "DELETE" });
         if (!res.ok) {
            const responseData = await res.json().catch(() => ({}));
            throw new Error(responseData.error || "Error al eliminar tarea");
         }
      } catch (error) {
         set({ tareas: snapshot }); // rollback
         return error as Error;
      }
   },

   patchTareaLocally: (tareaId, patch) => {
      set((state) => ({
         tareas: state.tareas.map((t) => (t.id === tareaId ? { ...t, ...patch } : t)),
      }));
   },

   MoveTarea: async (tareaId, estado) => {
      const prev = get().tareas.find((t) => t.id === tareaId);
      if (!prev || prev.estado === estado) return;

      // Optimistic update first for snappy drag-and-drop.
      get().patchTareaLocally(tareaId, { estado, updated_at: new Date() });

      const result = await get().UpdateTarea(tareaId, { estado });
      if (result instanceof Error) {
         // Rollback to previous estado.
         get().patchTareaLocally(tareaId, { estado: prev.estado });
      }
   },
}));
