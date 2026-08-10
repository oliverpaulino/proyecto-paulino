"use client";

import { useEffect, useMemo, useState } from "react";
import {
   DndContext, KeyboardSensor, PointerSensor, closestCenter,
   useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
   SortableContext, arrayMove, rectSortingStrategy,
   sortableKeyboardCoordinates, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Lock, Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSessionPermissions } from "@/hooks/usePermissions";
import { useSession } from "@/lib/auth-client";
import {
   SIZE_TO_COLS, useWidgetLayoutStore,
   type WidgetLayout, type WidgetSize,
} from "@/stores/useWidgetLayoutStore";
import {
   WIDGET_REGISTRY, esWidgetId, type WidgetId,
} from "@/lib/widgets/widget-registry";
import { puedeVerWidget, widgetsConPermiso } from "@/lib/widgets/widget-permissions";
import { layoutDesdePreset, presetParaRol } from "@/lib/widgets/dashboard-presets";

/** Orden de tamaños al alternar con el botón. */
const CICLO_TAMANO: Record<WidgetSize, WidgetSize> = {
   small: "medium",
   medium: "large",
   large: "small",
   full: "small",
};

const COL_SPAN: Record<WidgetSize, string> = {
   small: "md:col-span-1",
   medium: "md:col-span-2",
   large: "md:col-span-3",
   full: "md:col-span-3",
};

export function DashboardGrid({ editando }: { editando: boolean }) {
   const { data: session, isPending } = useSession();
   const { permissions, isLoading: permisosCargando } = useSessionPermissions();

   const userId = session?.user?.id ?? null;
   const rol = (session?.user as { role?: string | null } | undefined)?.role ?? null;

   const getUserLayout = useWidgetLayoutStore((s) => s.getUserLayout);
   const setUserLayout = useWidgetLayoutStore((s) => s.setUserLayout);
   const toggleWidget = useWidgetLayoutStore((s) => s.toggleWidget);
   const resizeWidget = useWidgetLayoutStore((s) => s.resizeWidget);
   const layouts = useWidgetLayoutStore((s) => s.layouts);

   // `persist` de zustand rehidrata DESPUÉS del primer render. Sin esperar,
   // el servidor pinta el preset por defecto y el cliente el layout guardado,
   // y React tira mismatch de hidratación.
   const [hidratado, setHidratado] = useState(false);
   useEffect(() => {
      const unsub = useWidgetLayoutStore.persist?.onFinishHydration?.(() => setHidratado(true));
      if (useWidgetLayoutStore.persist?.hasHydrated?.()) setHidratado(true);
      return () => unsub?.();
   }, []);

   const guardado = userId ? (layouts[userId] ?? []) : [];

   /**
    * Layout efectivo = lo guardado, saneado contra el catálogo y los permisos.
    * Si no hay nada guardado, se siembra el preset del rol.
    */
   const layout = useMemo<WidgetLayout[]>(() => {
      if (!hidratado || permisosCargando) return [];

      const base = guardado.length > 0
         ? guardado
         : layoutDesdePreset(presetParaRol(rol), permissions);

      return base
         // Ids que ya no existen (widget renombrado o retirado) se descartan:
         // quedaron guardados en el localStorage de alguien y no se pueden
         // renderizar.
         .filter((w) => esWidgetId(w.id))
         // El permiso se revisa SIEMPRE, no solo al aplicar el preset: si a un
         // usuario le quitan un rol, su layout guardado no debe seguir
         // pintando la tarjeta.
         .filter((w) => puedeVerWidget(WIDGET_REGISTRY[w.id as WidgetId], permissions))
         .sort((a, b) => a.position - b.position);
   }, [hidratado, permisosCargando, guardado, permissions, rol]);

   const sensors = useSensors(
      // Un umbral de 8px deja que un click en el enlace del encabezado siga
      // siendo un click y no el inicio de un arrastre.
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
   );

   if (isPending || permisosCargando || !hidratado) {
      return (
         <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
               <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
         </div>
      );
   }

   if (!userId) return null;

   const visibles = layout.filter((w) => w.visible || editando);

   function onDragEnd(e: DragEndEvent) {
      const { active, over } = e;
      if (!over || active.id === over.id || !userId) return;

      const actual = layout.length > 0 ? layout : getUserLayout(userId);
      const desde = actual.findIndex((w) => w.id === active.id);
      const hasta = actual.findIndex((w) => w.id === over.id);
      if (desde < 0 || hasta < 0) return;

      setUserLayout(userId, arrayMove(actual, desde, hasta));
   }

   return (
      <div className="flex flex-col gap-4">
         {editando ? <CatalogoOculto userId={userId} layout={layout} /> : null}

         {visibles.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
               <p className="text-sm font-medium">Tu panel está vacío</p>
               <p className="text-sm text-muted-foreground">
                  Entra en <span className="font-medium">Personalizar</span> y elige una vista o
                  agrega tarjetas.
               </p>
            </Card>
         ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
               <SortableContext items={visibles.map((w) => w.id)} strategy={rectSortingStrategy}>
                  <div className="grid auto-rows-fr gap-4 md:grid-cols-3">
                     {visibles.map((w) => (
                        <WidgetCelda
                           key={w.id}
                           widget={w}
                           editando={editando}
                           onToggle={() => toggleWidget(userId, w.id)}
                           onResize={() => resizeWidget(userId, w.id, CICLO_TAMANO[w.size])}
                        />
                     ))}
                  </div>
               </SortableContext>
            </DndContext>
         )}
      </div>
   );
}

function WidgetCelda({
   widget, editando, onToggle, onResize,
}: {
   widget: WidgetLayout;
   editando: boolean;
   onToggle: () => void;
   onResize: () => void;
}) {
   const meta = WIDGET_REGISTRY[widget.id as WidgetId];
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: widget.id, disabled: !editando });

   const Componente = meta.component;

   return (
      <div
         ref={setNodeRef}
         style={{ transform: CSS.Translate.toString(transform), transition }}
         className={cn(
            "relative col-span-1",
            COL_SPAN[widget.size],
            isDragging && "z-10 opacity-70",
            editando && !widget.visible && "opacity-40",
         )}
      >
         {editando ? (
            <div className="absolute -top-2 right-2 z-20 flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm">
               <Button
                  variant="ghost" size="icon" className="size-7"
                  onClick={onResize} title={`Tamaño: ${widget.size}`}
               >
                  {widget.size === "large" || widget.size === "full" ? (
                     <Minimize2 className="size-3.5" />
                  ) : (
                     <Maximize2 className="size-3.5" />
                  )}
               </Button>
               <Button
                  variant="ghost" size="icon" className="size-7"
                  onClick={onToggle}
                  title={widget.visible ? "Ocultar tarjeta" : "Mostrar tarjeta"}
               >
                  {widget.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
               </Button>
               <button
                  className="flex size-7 cursor-grab items-center justify-center rounded active:cursor-grabbing"
                  title="Arrastrar para reordenar"
                  {...attributes}
                  {...listeners}
               >
                  <GripVertical className="size-3.5 text-muted-foreground" />
               </button>
            </div>
         ) : null}

         <Componente />
      </div>
   );
}

/**
 * Tarjetas escondidas y bloqueadas, solo en modo edición. Lo bloqueado se
 * muestra en gris con su motivo en vez de esconderse: así se entiende que la
 * tarjeta existe y por qué no está disponible.
 */
function CatalogoOculto({ userId, layout }: { userId: string; layout: WidgetLayout[] }) {
   const { permissions } = useSessionPermissions();
   const setUserLayout = useWidgetLayoutStore((s) => s.setUserLayout);

   const enPanel = new Set(layout.map((w) => w.id));
   const catalogo = widgetsConPermiso(permissions).filter((w) => !enPanel.has(w.id as WidgetId));

   if (catalogo.length === 0) return null;

   function agregar(id: WidgetId) {
      const meta = WIDGET_REGISTRY[id];
      setUserLayout(userId, [
         ...layout,
         { id, position: layout.length, size: meta.defaultSize, visible: true },
      ]);
   }

   return (
      <Card className="flex flex-col gap-3 p-4">
         <p className="text-sm font-medium">Agregar tarjetas</p>
         <div className="flex flex-wrap gap-2">
            {catalogo.map((w) => (
               <Button
                  key={w.id}
                  variant="outline"
                  size="sm"
                  disabled={!w.puedeVer}
                  title={w.motivo ?? w.description}
                  onClick={() => agregar(w.id as WidgetId)}
                  className="gap-1.5"
               >
                  {w.puedeVer ? <w.icon className="size-3.5" /> : <Lock className="size-3.5" />}
                  {w.label}
               </Button>
            ))}
         </div>
      </Card>
   );
}
