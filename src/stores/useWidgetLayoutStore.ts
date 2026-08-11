import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WidgetId } from "@/lib/widgets/widget-registry";

export type WidgetSize = "small" | "medium" | "large" | "full";

export interface WidgetLayout {
   id: WidgetId;
   position: number;
   size: WidgetSize;
   visible: boolean;
}

/** Cuántas columnas ocupa cada tamaño en la grilla de 3. */
export const SIZE_TO_COLS: Record<WidgetSize, number> = {
   small: 1,
   medium: 2,
   large: 3,
   full: 3,
};

/**
 * Layout del panel, por usuario, en localStorage.
 *
 * Se guarda por `userId` y no en una clave única porque dos cuentas en el mismo
 * navegador (el dueño y la secretaria en la PC de la oficina) no deben pisarse
 * el panel. El layout NO viaja entre dispositivos: es una preferencia de
 * presentación, y si algún día debe seguir al usuario, esto se cambia por una
 * tabla sin tocar los widgets.
 *
 * Acá NO se filtra por permisos: esto solo recuerda posiciones. Quién puede ver
 * qué lo resuelve `visibleWidgetsFor` contra la sesión, en cada render.
 */
type WidgetLayoutStore = {
   layouts: Record<string, WidgetLayout[]>;
   getUserLayout: (userId: string) => WidgetLayout[];
   setUserLayout: (userId: string, layout: WidgetLayout[]) => void;
   resetUserLayout: (userId: string) => void;
   toggleWidget: (userId: string, widgetId: WidgetId) => void;
   resizeWidget: (userId: string, widgetId: WidgetId, size: WidgetSize) => void;
   reorderWidgets: (userId: string, fromIndex: number, toIndex: number) => void;
};

/** Reasigna `position` según el orden del arreglo. */
function renumerar(layout: WidgetLayout[]): WidgetLayout[] {
   return layout.map((w, i) => ({ ...w, position: i }));
}

export const useWidgetLayoutStore = create<WidgetLayoutStore>()(
   persist(
      (set, get) => ({
         layouts: {},

         getUserLayout: (userId) => get().layouts[userId] ?? [],

         setUserLayout: (userId, layout) =>
            set((state) => ({
               layouts: { ...state.layouts, [userId]: renumerar(layout) },
            })),

         // Borra la entrada en vez de dejarla vacía: `[]` es un layout válido
         // (el usuario escondió todo) y no se puede distinguir de "sin
         // configurar", que es lo que hace caer al preset por defecto.
         resetUserLayout: (userId) =>
            set((state) => {
               const next = { ...state.layouts };
               delete next[userId];
               return { layouts: next };
            }),

         toggleWidget: (userId, widgetId) => {
            const actual = get().getUserLayout(userId);
            get().setUserLayout(
               userId,
               actual.map((w) =>
                  w.id === widgetId ? { ...w, visible: !w.visible } : w,
               ),
            );
         },

         resizeWidget: (userId, widgetId, size) => {
            const actual = get().getUserLayout(userId);
            get().setUserLayout(
               userId,
               actual.map((w) => (w.id === widgetId ? { ...w, size } : w)),
            );
         },

         reorderWidgets: (userId, fromIndex, toIndex) => {
            const actual = [...get().getUserLayout(userId)];
            if (
               fromIndex < 0 || toIndex < 0 ||
               fromIndex >= actual.length || toIndex >= actual.length
            ) return;

            const [movido] = actual.splice(fromIndex, 1);
            actual.splice(toIndex, 0, movido);
            get().setUserLayout(userId, actual);
         },
      }),
      { name: "panel-widgets-layout", version: 1 },
   ),
);
