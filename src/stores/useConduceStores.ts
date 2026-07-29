import { create } from "zustand";
import type {
   ConduceDTO,
   ConduceFiltros,
   ConduceListResult,
   CreateConduceForm,
} from "@/dtos/conduce.dto";

type ConduceStore = {
   conduces: ConduceDTO[];
   total: number;
   page: number;
   pageSize: number;
   loading: boolean;
   filtros: ConduceFiltros;

   // ── Categorías por proyecto (carga ligera) ───────────────────────────
   categorias: Array<{ nombre: string; count: number; subtotal: number; subtotalCobrable: number; cobrable_count: number }>;
   categoriasLoading: boolean;

   // ── Conduces por categoría dentro de un proyecto ─────────────────────
   conducesPorCategoria: Record<string, ConduceDTO[]>;
   categoriaLoading: string | null; // nombre de la categoría que está cargando
   /** true mientras se hace la búsqueda global con debounce */
   conducesGlobalLoading: boolean;

   // ── Eliminados ──────────────────────────────────────────────────────
   // Estado APARTE de `conduces` a propósito: así el apartado de
   // "eliminados" no pisa la lista activa que esté viendo otra pantalla al
   // mismo tiempo (ambas comparten este mismo store global).
   eliminados: ConduceDTO[];
   totalEliminados: number;
   loadingEliminados: boolean;

   SetFiltros: (filtros: ConduceFiltros) => void;
   GetConduces: (filtros?: ConduceFiltros) => Promise<void>;
   GetConducesByProyecto: (proyectoId: string) => Promise<void>;
   /** Trae solo los nombres+conteo de categorías de un proyecto (ligero). */
   GetCategoriasByProyecto: (proyectoId: string) => Promise<void>;
   /** Trae los conduces de una categoría específica de un proyecto. */
   GetConducesByCategoria: (proyectoId: string, categoria: string) => Promise<void>;
   /** Trae conduces eliminados (fuerza eliminado=true sin importar lo que le pases). */
   GetConducesEliminados: (filtros?: Omit<ConduceFiltros, "eliminado">) => Promise<void>;
   CreateConduce: (form: CreateConduceForm) => Promise<ConduceDTO | Error>;
   UpdateConduce: (
      id: string,
      form: Partial<CreateConduceForm>,
      proyectoIdAnterior?: string | null
   ) => Promise<ConduceDTO | Error>;
   /** Eliminación lógica — motivo es opcional. */
   DeleteConduce: (id: string, motivo?: string) => Promise<true | Error>;
   /** Revierte una eliminación lógica y lo quita de `eliminados` si estaba ahí. */
   RestoreConduce: (id: string) => Promise<ConduceDTO | Error>;
   /** Trae TODOS los conduces de un proyecto, opcionalmente filtrados (búsqueda global, reemplaza la carga per-categoría). */
   GetAllConducesByProyecto: (proyectoId: string, filtros?: { busqueda?: string; es_cobrable?: string; tipo_conduce?: string; categoria?: string }) => Promise<void>;
   /** Limpia conducesPorCategoria (vuelve a lazy loading per-categoría). */
   ClearConducesPorCategoria: () => void;
   BulkToggleCobrable: (ids: string[], es_cobrable: boolean) => Promise<true | Error>;
};

function buildQuery(filtros: ConduceFiltros): string {
   const params = new URLSearchParams();
   Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
   });
   return params.toString();
}

export const useConduceStore = create<ConduceStore>((set, get) => ({
   conduces: [],
   total: 0,
   page: 1,
   pageSize: 25,
   loading: false,
   filtros: {},

   categorias: [],
   categoriasLoading: false,

   conducesPorCategoria: {},
   categoriaLoading: null,
   conducesGlobalLoading: false,

   eliminados: [],
   totalEliminados: 0,
   loadingEliminados: false,

   SetFiltros: (filtros) => set({ filtros }),

   // Usado por el registro general (/dashboard/conduces): respeta filtros +
   // paginación, para poder navegar volúmenes grandes sin traer todo junto.
   GetConduces: async (filtros) => {
      const finalFiltros: ConduceFiltros = { page: 1, pageSize: 25, ...get().filtros, ...filtros };
      set({ loading: true, filtros: finalFiltros });
      try {
         const qs = buildQuery(finalFiltros);
         const res = await fetch(`/api/conduces?${qs}`);
         if (!res.ok) throw new Error("Error al cargar conduces");
         const data: ConduceListResult = await res.json();
         set({ conduces: data.data, total: data.total, page: data.page, pageSize: data.pageSize });
      } catch (error) {
         console.error("Error fetching conduces:", error);
         throw error;
      } finally {
         set({ loading: false });
      }
   },

   // Usado en la página de detalle de un proyecto: trae todos los conduces
   // de ese proyecto (sin paginar, normalmente son pocos por proyecto).
   GetConducesByProyecto: async (proyectoId) => {
      set({ loading: true });
      try {
         const res = await fetch(`/api/conduces?proyecto_id=${proyectoId}&pageSize=500`);
         if (!res.ok) throw new Error("Error al cargar conduces");
         const data: ConduceListResult = await res.json();
         set({ conduces: data.data, total: data.total });
      } finally {
         set({ loading: false });
      }
   },

   // Trae solo nombres y conteo de categorías (ligero, sin detalles).
   GetCategoriasByProyecto: async (proyectoId) => {
      set({ categoriasLoading: true });
      try {
         const res = await fetch(`/api/conduces/categorias?proyecto_id=${proyectoId}`);
         if (!res.ok) throw new Error("Error al cargar categorías de conduces");
         const data: Array<{ nombre: string; count: number; subtotal: number; subtotalCobrable: number; cobrable_count: number }> = await res.json();
         set({ categorias: data });
      } catch (error) {
         console.error("Error fetching categorias:", error);
      } finally {
         set({ categoriasLoading: false });
      }
   },

   // Trae los conduces de una categoría específica de un proyecto.
   GetConducesByCategoria: async (proyectoId, categoria) => {
      set({ categoriaLoading: categoria });
      try {
         const params = new URLSearchParams({ proyecto_id: proyectoId, pageSize: "500" });
         if (categoria === "Sin categoría") {
            params.set("categoria_equipo_tarifa_null", "true");
         } else {
            params.set("categoria_equipo_tarifa_nombre", categoria);
         }
         const res = await fetch(`/api/conduces?${params.toString()}`);
         if (!res.ok) throw new Error("Error al cargar conduces");
         const data: ConduceListResult = await res.json();
         set((s) => ({
            conducesPorCategoria: { ...s.conducesPorCategoria, [categoria]: data.data },
         }));
      } catch (error) {
         console.error(`Error fetching conduces for categoria "${categoria}":`, error);
      } finally {
         set({ categoriaLoading: null });
      }
   },

   // Para imprimir. Pide páginas grandes en bucle hasta agotar el total, así
   // el reporte cubre todo el filtro aunque en pantalla solo se vean 25.
   FetchConducesParaReporte: async (filtros: ConduceFiltros) => {
      const PAGE_SIZE = 500;
      const LIMITE_PAGINAS = 40; // ~20 000 conduces; tope para no colgar el navegador
      const acumulado: ConduceDTO[] = [];

      for (let page = 1; page <= LIMITE_PAGINAS; page++) {
         // page/pageSize se fijan aquí, después de esparcir los filtros, para
         // que la paginación del listado no se cuele en el reporte.
         const qs = buildQuery({ ...filtros, page, pageSize: PAGE_SIZE });
         const res = await fetch(`/api/conduces?${qs}`);
         if (!res.ok) throw new Error("Error al cargar conduces para el reporte");
         const data: ConduceListResult = await res.json();

         acumulado.push(...data.data);
         if (acumulado.length >= data.total || data.data.length < PAGE_SIZE) break;
      }

      return acumulado;
   },

   // Para el apartado de "Conduces eliminados". Usa su propio slice de
   // estado (eliminados/totalEliminados/loadingEliminados) para no chocar
   // con la lista activa.
   GetConducesEliminados: async (filtros) => {
      set({ loadingEliminados: true });
      try {
         const finalFiltros: ConduceFiltros = { page: 1, pageSize: 25, ...filtros, eliminado: true };
         const qs = buildQuery(finalFiltros);
         const res = await fetch(`/api/conduces?${qs}`);
         if (!res.ok) throw new Error("Error al cargar conduces eliminados");
         const data: ConduceListResult = await res.json();
         set({ eliminados: data.data, totalEliminados: data.total });
      } catch (error) {
         console.error("Error fetching conduces eliminados:", error);
         throw error;
      } finally {
         set({ loadingEliminados: false });
      }
   },

   CreateConduce: async (form) => {
      try {
         const res = await fetch("/api/conduces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
         });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         const data: ConduceDTO = await res.json();
         set((s) => ({ conduces: [data, ...s.conduces], total: s.total + 1 }));
         return data;
      } catch (error) {
         return error as Error;
      }
   },

   UpdateConduce: async (id, form, proyectoIdAnterior) => {
      try {
         const res = await fetch(`/api/conduces/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, proyecto_id_anterior: proyectoIdAnterior ?? null }),
         });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         const data: ConduceDTO = await res.json();
         set((s) => ({ conduces: s.conduces.map((c) => (c.id === id ? data : c)) }));
         return data;
      } catch (error) {
         return error as Error;
      }
   },

   // Eliminación lógica: el registro no se borra en el backend, solo se
   // oculta de los listados normales — por eso aquí también se retira de la
   // lista local, igual que antes con el DELETE físico.
   DeleteConduce: async (id, motivo) => {
      try {
         const res = await fetch(`/api/conduces/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: motivo ?? null }),
         });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         set((s) => ({ conduces: s.conduces.filter((c) => c.id !== id), total: Math.max(0, s.total - 1) }));
         return true;
      } catch (error) {
         return error as Error;
      }
   },

   // Usado por el apartado de "Conduces eliminados". Al restaurar con
   // éxito, lo quita de `eliminados` (ya no pertenece ahí) — no lo agrega
   // de vuelta a `conduces` automáticamente porque esa lista puede tener
   // filtros/paginación propios; quien esté viendo la lista activa la
   // refresca al volver a esa pantalla.
   RestoreConduce: async (id) => {
      try {
         const res = await fetch(`/api/conduces/${id}/restore`, { method: "POST" });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         const data: ConduceDTO = await res.json();
         set((s) => ({
            eliminados: s.eliminados.filter((c) => c.id !== id),
            totalEliminados: Math.max(0, s.totalEliminados - 1),
         }));
         return data;
      } catch (error) {
         return error as Error;
      }
   },

   BulkToggleCobrable: async (ids, es_cobrable) => {
      try {
         const res = await fetch("/api/conduces/bulk-cobrable", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, es_cobrable }),
         });
         if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
         }
         // Actualizar el estado local de los conduces modificados
         set((s) => ({
            conduces: s.conduces.map((c) =>
               ids.includes(c.id) ? { ...c, es_cobrable } : c
            ),
            conducesPorCategoria: Object.fromEntries(
               Object.entries(s.conducesPorCategoria).map(([cat, items]) => [
                  cat,
                  items.map((c) => (ids.includes(c.id) ? { ...c, es_cobrable } : c)),
               ])
            ),
         }));
         return true;
      } catch (error) {
         return error as Error;
      }
   },

   GetAllConducesByProyecto: async (proyectoId, filtros) => {
      set({ conducesGlobalLoading: true });
      try {
         const params = new URLSearchParams({ proyecto_id: proyectoId, pageSize: "500" });
         if (filtros?.busqueda) params.set("busqueda", filtros.busqueda);
         if (filtros?.es_cobrable && filtros.es_cobrable !== "all") {
            params.set("es_cobrable", filtros.es_cobrable === "cobrable" ? "true" : "false");
         }
         if (filtros?.tipo_conduce && filtros.tipo_conduce !== "all") {
            params.set("tipo_conduce", filtros.tipo_conduce);
         }
         if (filtros?.categoria) {
            if (filtros.categoria === "Sin categoría") {
               params.set("categoria_equipo_tarifa_null", "true");
            } else {
               params.set("categoria_equipo_tarifa_nombre", filtros.categoria);
            }
         }
         const res = await fetch(`/api/conduces?${params.toString()}`);
         if (!res.ok) throw new Error("Error al cargar conduces");
         const data: ConduceListResult = await res.json();
         // Agrupar por categoría
         const grouped: Record<string, ConduceDTO[]> = {};
         for (const c of data.data) {
            const cat = c.categoria_equipo_tarifa_nombre || "Sin categoría";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(c);
         }
         set({ conducesPorCategoria: grouped });
      } catch (error) {
         console.error("Error fetching all conduces:", error);
      } finally {
         set({ conducesGlobalLoading: false });
      }
   },

   ClearConducesPorCategoria: () => {
      set({ conducesPorCategoria: {} });
   },
}));