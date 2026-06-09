"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useTipoItemStore } from "@/stores/useTipoItemStore";
import type { Item } from "@/dtos/item.dto";

export interface ItemFormValues {
   nombre: string;
   tipo_id: string;
   stock: string;
   unidad: string;
   descripcion: string;
}

interface ItemFormProps {
   initialData?: Partial<Item>;
   onSubmit: (data: ItemFormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
   /** Opens the category manager so the user can add a tipo_item without leaving the form. */
   onManageCategories?: () => void;
}

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

export function ItemForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear item",
   onManageCategories,
}: ItemFormProps) {
   const { TipoItems, GetTipoItems } = useTipoItemStore();

   const [values, setValues] = useState<ItemFormValues>({
      nombre: initialData?.nombre ?? "",
      tipo_id: initialData?.tipo_id ?? "",
      stock: initialData?.stock != null ? String(initialData.stock) : "0",
      unidad: initialData?.unidad ?? "",
      descripcion: initialData?.descripcion ?? "",
   });
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      GetTipoItems();
   }, [GetTipoItems]);

   // Default to first category once they load (create mode only).
   useEffect(() => {
      if (!values.tipo_id && TipoItems.length > 0) {
         setValues((prev) => (prev.tipo_id ? prev : { ...prev, tipo_id: TipoItems[0].id }));
      }
   }, [TipoItems, values.tipo_id]);

   function set(field: keyof ItemFormValues, value: string) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!values.tipo_id) {
         setError("Selecciona una categoría");
         return;
      }
      try {
         await onSubmit(values);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="if-nombre">Nombre *</Label>
            <Input
               id="if-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="Nombre del item"
               required
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
               <Label htmlFor="if-tipo">Categoría *</Label>
               {onManageCategories && (
                  <button
                     type="button"
                     onClick={onManageCategories}
                     className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline dark:text-blue-400"
                  >
                     <Plus className="size-3" />
                     Nueva categoría
                  </button>
               )}
            </div>
            <select
               id="if-tipo"
               value={values.tipo_id}
               onChange={(e) => set("tipo_id", e.target.value)}
               className={SELECT_CLASS}
               required
            >
               {TipoItems.length === 0 && <option value="">Sin categorías — crea una</option>}
               {TipoItems.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
               ))}
            </select>
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="if-stock">Stock</Label>
               <Input
                  id="if-stock"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  placeholder="0"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="if-unidad">Unidad</Label>
               <Input
                  id="if-unidad"
                  value={values.unidad}
                  onChange={(e) => set("unidad", e.target.value)}
                  placeholder="ej. unidad, caja, litro"
               />
            </div>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="if-descripcion">Descripción</Label>
            <Input
               id="if-descripcion"
               value={values.descripcion}
               onChange={(e) => set("descripcion", e.target.value)}
               placeholder="Descripción del item"
            />
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
               <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancelar
               </Button>
            )}
            <Button type="submit" disabled={loading}>
               {loading ? "Guardando…" : submitLabel}
            </Button>
         </div>
      </form>
   );
}
