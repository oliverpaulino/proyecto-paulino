"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { SelectBuscadorProveedor } from "@/components/shared/selectBuscadorProveedor";
import { SelectBuscadorEquipo } from "@/components/shared/selectBuscadorEquipo";
import { SupplierForm } from "../../proveedores/components/supplier-form";
import { useSupplierStore } from "@/stores/useSupplierStore";
import type { PurchaseOrderItemForm } from "@/dtos/purchase-order.dto";
import type { PurchaseOrderProps } from "@/backend/modules/purchase-orders/domain/purchase-order.domain";
import { Package, Plus, Trash2, Truck } from "lucide-react";

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

const ITEM_GRID =
   "lg:grid-cols-[minmax(0,3fr)_minmax(0,2.5fr)_minmax(70px,1fr)_minmax(90px,1.4fr)_minmax(90px,1.3fr)_minmax(36px,0.6fr)]";

const ITEM_COLS = `grid grid-cols-2 gap-3 items-end ${ITEM_GRID}`;

function emptyItem(): PurchaseOrderItemForm {
   return { descripcion: "", cantidad: 1, precio_unitario: 0, equipo_id: "" };
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
   const { CreateSupplier } = useSupplierStore();

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
               equipo_id: i.equipo_id ?? "",
            }))
            : [emptyItem()],
   });
   const [equipoLabels, setEquipoLabels] = useState<string[]>(
      initialData?.items && initialData.items.length > 0
         ? initialData.items.map((i) => i.equipo_nombre ?? "")
         : [""]
   );
   const [proveedorLabel, setProveedorLabel] = useState(
      initialData?.proveedor_nombre ?? ""
   );
   const [error, setError] = useState<string | null>(null);

   const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
   const [newProveedorName, setNewProveedorName] = useState("");
   const [isCreatingProveedor, setIsCreatingProveedor] = useState(false);

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
               field === "descripcion" || field === "equipo_id"
                  ? value
                  : Number(value),
         };
         return { ...prev, items };
      });
   }

   function addItem() {
      setValues((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
      setEquipoLabels((prev) => [...prev, ""]);
   }

   function removeItem(index: number) {
      setValues((prev) => ({
         ...prev,
         items: prev.items.filter((_, i) => i !== index),
      }));
      setEquipoLabels((prev) => prev.filter((_, i) => i !== index));
   }

   const subtotals = values.items.map(
      (i) => (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0)
   );
   const total = subtotals.reduce((a, b) => a + b, 0);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!values.proveedor_id) {
         setError("Debe seleccionar un proveedor.");
         return;
      }
      if (values.items.length === 0) {
         setError("Agrega al menos un ítem");
         return;
      }
      // Normalize the equipo select's empty value to null so it maps to a NULL
      // uuid column rather than the invalid empty string "".
      const payload: PurchaseOrderFormValues = {
         ...values,
         items: values.items.map((i) => ({
            ...i,
            equipo_id: i.equipo_id ? i.equipo_id : null,
         })),
      };
      try {
         await onSubmit(payload);
      } catch (err: unknown) {
         console.log(err);
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <>
         <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
            {/* Información general */}
            <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
               <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-blue dark:text-white">
                  <Truck className="size-4" />
                  Información general
               </h3>

               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="pof-proveedor">Proveedor *</Label>
                     <SelectBuscadorProveedor
                        value={values.proveedor_id}
                        initialLabel={proveedorLabel}
                        onChange={(id) => {
                           setField("proveedor_id", id ?? "");
                           if (!id) setProveedorLabel("");
                        }}
                        onCreateNew={(term) => {
                           setNewProveedorName(term);
                           setIsProveedorModalOpen(true);
                        }}
                     />
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
               </div>

               <div className="mt-4 flex flex-col gap-1.5">
                  <Label htmlFor="pof-notas">Notas</Label>
                  <Input
                     id="pof-notas"
                     value={values.notas}
                     onChange={(e) => setField("notas", e.target.value)}
                     placeholder="Observaciones opcionales"
                  />
               </div>
            </section>

            {/* Ítems */}
            <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
               <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-blue dark:text-white">
                     <Package className="size-4" />
                     Ítems de la orden
                  </h3>
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

               {values.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                     Sin ítems. Haz clic en "Agregar ítem" para empezar.
                  </div>
               ) : (
                  <div className="flex flex-col gap-3">
                     <div className={`hidden px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid lg:gap-3 ${ITEM_GRID}`}>
                        <span>Descripción</span>
                        <span>Equipo</span>
                        <span>Cant.</span>
                        <span className="text-right">P. Unit.</span>
                        <span className="text-right">Subtotal</span>
                        <span />
                     </div>

                     {values.items.map((item, idx) => (
                        <div
                           key={idx}
                           className={`${ITEM_COLS} rounded-lg border border-border bg-muted/20 p-3`}
                        >
                           <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
                              <Label className="text-xs text-muted-foreground lg:hidden">
                                 Descripción
                              </Label>
                              <Input
                                 value={item.descripcion}
                                 onChange={(e) =>
                                    setItemField(idx, "descripcion", e.target.value)
                                 }
                                 placeholder="Descripción del ítem"
                                 required
                              />
                           </div>

                           <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
                              <Label className="text-xs text-muted-foreground lg:hidden">
                                 Equipo
                              </Label>
                              <SelectBuscadorEquipo
                                 value={item.equipo_id ?? null}
                                 initialLabel={equipoLabels[idx]}
                                 onChange={(id) =>
                                    setItemField(idx, "equipo_id", id ?? "")
                                 }
                              />
                           </div>

                           <div className="flex flex-col gap-1.5">
                              <Label className="text-xs text-muted-foreground lg:hidden">
                                 Cantidad
                              </Label>
                              <Input
                                 type="number"
                                 min="0.001"
                                 step="any"
                                 value={item.cantidad}
                                 onChange={(e) =>
                                    setItemField(idx, "cantidad", e.target.value)
                                 }
                                 required
                              />
                           </div>

                           <div className="flex flex-col gap-1.5">
                              <Label className="text-xs text-muted-foreground lg:hidden">
                                 Precio unitario
                              </Label>
                              <Input
                                 type="number"
                                 min="0"
                                 step="any"
                                 value={item.precio_unitario}
                                 onChange={(e) =>
                                    setItemField(idx, "precio_unitario", e.target.value)
                                 }
                                 required
                              />
                           </div>

                           <div className="flex flex-col gap-1.5">
                              <Label className="text-xs text-muted-foreground lg:hidden">
                                 Subtotal
                              </Label>
                              <div className="flex h-9 items-center justify-end rounded-md border border-border bg-card px-3 text-sm font-semibold text-brand-blue dark:text-blue-300">
                                 {formatMoney(subtotals[idx])}
                              </div>
                           </div>

                           <div className="flex items-end justify-end">
                              <button
                                 type="button"
                                 onClick={() => removeItem(idx)}
                                 disabled={values.items.length === 1}
                                 className="rounded p-2 text-brand-red transition-colors hover:bg-brand-red/10 disabled:opacity-30"
                                 title="Eliminar ítem"
                              >
                                 <Trash2 className="size-4" />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 px-4 py-3">
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                     Total de la orden
                  </span>
                  <span className="text-xl font-bold text-brand-blue dark:text-white">
                     {formatMoney(total)}
                  </span>
               </div>
            </section>

            {error && (
               <div className="rounded-md border border-destructive bg-destructive/10 p-2.5 text-sm font-medium text-destructive">
                  {error}
               </div>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
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

         {/* Diálogo de creación de proveedor */}
         <Dialog open={isProveedorModalOpen} onOpenChange={setIsProveedorModalOpen}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Crear nuevo proveedor</DialogTitle>
                  <DialogDescription>
                     Registra el proveedor y quedará seleccionado en la orden.
                  </DialogDescription>
               </DialogHeader>
               <SupplierForm
                  initialData={{ nombre: newProveedorName }}
                  loading={isCreatingProveedor}
                  onSubmit={async (data) => {
                     setIsCreatingProveedor(true);
                     try {
                        const result = await CreateSupplier({
                           nombre: data.nombre,
                           rnc: data.rnc,
                           tipo: data.tipo,
                           email: data.email || null,
                           telefono: data.telefono || null,
                           direccion: data.direccion || null,
                        });

                        if (result instanceof Error) throw result;

                        if (result && result.id) {
                           setField("proveedor_id", result.id);
                           setProveedorLabel(result.nombre);
                        }

                        setIsProveedorModalOpen(false);
                     } catch (err) {
                        console.error("Error al crear proveedor", err);
                     } finally {
                        setIsCreatingProveedor(false);
                     }
                  }}
                  onCancel={() => setIsProveedorModalOpen(false)}
               />
            </DialogContent>
         </Dialog>
      </>
   );
}
