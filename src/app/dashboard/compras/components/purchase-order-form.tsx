"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupplierStore } from "@/stores/useSupplierStore";
import type { PurchaseOrderItemForm } from "@/dtos/purchase-order.dto";
import type { PurchaseOrderProps } from "@/backend/modules/purchase-orders/domain/purchase-order.domain";
import { Plus, Trash2 } from "lucide-react";

interface PurchaseOrderFormValues {
   proveedor_id: string;
   fecha: string;
   notas: string;
   items: PurchaseOrderItemForm[];
}

interface PurchaseOrderFormProps {
   initialData?: Partial<PurchaseOrderProps>;
   onSubmit: (data: PurchaseOrderFormValues) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

function emptyItem(): PurchaseOrderItemForm {
   return { descripcion: "", cantidad: 1, precio_unitario: 0 };
}

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function toDateInputValue(date?: Date | string | null): string {
   if (!date) return new Date().toISOString().slice(0, 10);
   return new Date(date).toISOString().slice(0, 10);
}

export function PurchaseOrderForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear orden",
}: PurchaseOrderFormProps) {
   const { Suppliers, GetSuppliers } = useSupplierStore();

   const [values, setValues] = useState<PurchaseOrderFormValues>({
      proveedor_id: initialData?.proveedor_id ?? "",
      fecha: toDateInputValue(initialData?.fecha),
      notas: initialData?.notas ?? "",
      items:
         initialData?.items && initialData.items.length > 0
            ? initialData.items.map((i) => ({
               descripcion: i.descripcion,
               cantidad: i.cantidad,
               precio_unitario: i.precio_unitario,
            }))
            : [emptyItem()],
   });
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      GetSuppliers();
   }, [GetSuppliers]);

   function setField(field: keyof Omit<PurchaseOrderFormValues, "items">, value: string) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   function setItemField(
      index: number,
      field: keyof PurchaseOrderItemForm,
      value: string
   ) {
      setValues((prev) => {
         const items = [...prev.items];
         items[index] = {
            ...items[index],
            [field]:
               field === "descripcion" ? value : Number(value),
         };
         return { ...prev, items };
      });
   }

   function addItem() {
      setValues((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
   }

   function removeItem(index: number) {
      setValues((prev) => ({
         ...prev,
         items: prev.items.filter((_, i) => i !== index),
      }));
   }

   const subtotals = values.items.map(
      (i) => (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0)
   );
   const total = subtotals.reduce((a, b) => a + b, 0);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (values.items.length === 0) {
         setError("Agrega al menos un ítem");
         return;
      }
      try {
         await onSubmit(values);
      } catch (err: unknown) {
         console.log(err)
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
         {/* Header fields */}
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="pof-proveedor">Proveedor *</Label>
            <select
               id="pof-proveedor"
               value={values.proveedor_id}
               onChange={(e) => setField("proveedor_id", e.target.value)}
               className={SELECT_CLASS}
               required
            >
               <option value="">Selecciona un proveedor</option>
               {Suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                     {s.nombre}
                  </option>
               ))}
            </select>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="pof-fecha">Fecha *</Label>
            <Input
               id="pof-fecha"
               type="date"
               value={values.fecha}
               onChange={(e) => setField("fecha", e.target.value)}
               required
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="pof-notas">Notas</Label>
            <Input
               id="pof-notas"
               value={values.notas}
               onChange={(e) => setField("notas", e.target.value)}
               placeholder="Observaciones opcionales"
            />
         </div>

         {/* Items */}
         <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
               <Label>Ítems *</Label>
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
               >
                  <Plus className="size-3.5 mr-1" />
                  Agregar ítem
               </Button>
            </div>

            <div className="rounded-lg border border-border overflow-x-auto">
               <table className="w-full text-xs">
                  <thead>
                     <tr className="bg-muted/40">
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                           Descripción
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">
                           Cant.
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-28">
                           P. Unit.
                        </th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-28">
                           Subtotal
                        </th>
                        <th className="px-2 py-2 w-8" />
                     </tr>
                  </thead>
                  <tbody>
                     {values.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-border">
                           <td className="px-2 py-1.5">
                              <Input
                                 value={item.descripcion}
                                 onChange={(e) =>
                                    setItemField(idx, "descripcion", e.target.value)
                                 }
                                 placeholder="Descripción del ítem"
                                 required
                                 className="h-7 text-xs"
                              />
                           </td>
                           <td className="px-2 py-1.5">
                              <Input
                                 type="number"
                                 min="0.001"
                                 step="any"
                                 value={item.cantidad}
                                 onChange={(e) =>
                                    setItemField(idx, "cantidad", e.target.value)
                                 }
                                 className="h-7 text-xs text-right"
                                 required
                              />
                           </td>
                           <td className="px-2 py-1.5">
                              <Input
                                 type="number"
                                 min="0"
                                 step="any"
                                 value={item.precio_unitario}
                                 onChange={(e) =>
                                    setItemField(idx, "precio_unitario", e.target.value)
                                 }
                                 className="h-7 text-xs text-right"
                                 required
                              />
                           </td>
                           <td className="px-2 py-1.5 text-right font-semibold text-brand-blue dark:text-blue-300">
                              {formatMoney(subtotals[idx])}
                           </td>
                           <td className="px-2 py-1.5 text-center">
                              <button
                                 type="button"
                                 onClick={() => removeItem(idx)}
                                 disabled={values.items.length === 1}
                                 className="rounded p-1 text-brand-red hover:bg-brand-red/10 disabled:opacity-30 transition-colors"
                                 title="Eliminar ítem"
                              >
                                 <Trash2 className="size-3.5" />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
                  <tfoot>
                     <tr className="border-t-2 border-brand-blue/20 bg-muted/20">
                        <td
                           colSpan={3}
                           className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                           Total
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-bold text-brand-blue dark:text-white">
                           {formatMoney(total)}
                        </td>
                        <td />
                     </tr>
                  </tfoot>
               </table>
            </div>
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
               <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
               >
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
