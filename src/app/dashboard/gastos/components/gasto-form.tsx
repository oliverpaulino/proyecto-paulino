"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SelectBuscadorCategoriaGasto } from "@/components/shared/selectBuscadorCategoriaGasto";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";
import { SelectBuscadorOrdenCompra } from "@/components/shared/selectBuscadorOrdenCompra";
import { SelectBuscadorEquipo } from "@/components/shared/selectBuscadorEquipo";
import { SelectBuscadorEmployee } from "@/components/shared/selectBuscadorEmployee";
import { CategoriaGastoForm } from "../../categorias-gastos/components/categoria-gasto-form";
import { useCategoriaGastoStore } from "@/stores/useCategoriaGastoStore";
import type { CreateGastoForm } from "@/dtos/gastos.dto";

interface GastoFormProps {
   initialData?: any;
   predefinedValues?: Partial<CreateGastoForm>;
   onSubmit: (data: any) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
}

const INPUT_CLASS = "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] disabled:opacity-60 disabled:bg-muted";
const TEXTAREA_CLASS = "min-h-[80px] w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none disabled:opacity-60 disabled:bg-muted resize-none";

export function GastoForm({ initialData, predefinedValues, onSubmit, onCancel, loading }: GastoFormProps) {
   const router = useRouter();
   const { CreateCategoria } = useCategoriaGastoStore();
   const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
   const [newCategoriaInitialName, setNewCategoriaInitialName] = useState("");
   const [isCreatingCategoria, setIsCreatingCategoria] = useState(false);
   const [categoriaGastoNombre, setCategoriaGastoNombre] = useState(initialData?.categoria_gasto_nombre ?? "");

   const [values, setValues] = useState({
      monto_total: initialData?.monto_total ?? predefinedValues?.monto_total ?? "",
      concepto: initialData?.concepto ?? predefinedValues?.concepto ?? "",
      ncf: initialData?.ncf ?? predefinedValues?.ncf ?? "",
      fecha: initialData?.fecha 
         ? new Date(initialData.fecha) 
         : (predefinedValues?.fecha ? new Date(predefinedValues.fecha) : new Date()),
      categoria_gasto_id: initialData?.categoria_gasto_id ?? predefinedValues?.categoria_gasto_id ?? null,
      orden_compra_id: initialData?.orden_compra_id ?? predefinedValues?.orden_compra_id ?? null,
      proyecto_id: initialData?.proyecto_id ?? predefinedValues?.proyecto_id ?? null,
      equipo_id: initialData?.equipo_id ?? predefinedValues?.equipo_id ?? null,
   });

   const [asociarEmpleado, setAsociarEmpleado] = useState(false);
   const [deduccion, setDeduccion] = useState({
      empleado_id: null as string | null,
      monto_total: "",
      balance_pendiente: "",
      cuotas_sugeridas: 1,
      concepto: "",
      fecha: new Date(),
   });
   // Campos de la deducción que el usuario ya modificó a mano (dejan de sincronizarse)
   const [deduccionTouched, setDeduccionTouched] = useState<Set<string>>(() => new Set());

   // ── Cobrable al Cliente ──
   const [cobrableProyecto, setCobrableProyecto] = useState<boolean>(
      initialData?.cobrable_proyecto ?? false
   );
   const [cobrableMonto, setCobrableMonto] = useState<string>(
      initialData?.cobrable_proyecto
         ? String(initialData.cobrable_monto ?? initialData.monto_total ?? "")
         : "0"
   );

   const [error, setError] = useState<string | null>(null);

   const gastoMonto = Number(values.monto_total) || 0;
   const cobrableMontoNum = Number(cobrableMonto) || 0;
   const montoDisponibleDeduccion = Math.max(0, gastoMonto - (cobrableProyecto ? cobrableMontoNum : 0));
   const deduccionMontoDefault =
      cobrableProyecto && cobrableMontoNum > 0 ? String(montoDisponibleDeduccion) : values.monto_total;

   function set<K extends keyof typeof values>(field: K, value: typeof values[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   function setDeduccionField<K extends keyof typeof deduccion>(field: K, value: typeof deduccion[K]) {
      setDeduccionTouched((prev) => new Set(prev).add(field as string));
      setDeduccion((prev) => ({ ...prev, [field]: value }));
   }

   const isDisabled = (field: keyof CreateGastoForm) => {
      return loading || (predefinedValues?.[field] !== undefined);
   };

   // Formatea la fecha usando componentes locales para evitar desfases UTC
   const formatDateForInput = (date?: Date) => {
      if (!date || isNaN(date.getTime())) return "";
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
   };

   // Genera la fecha en hora local exacta según la selección del usuario
   const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      const [year, month, day] = val.split("-").map(Number);
      if (year && month && day) {
         set("fecha", new Date(year, month - 1, day));
      }
   };

   const handleDeduccionDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      const [year, month, day] = val.split("-").map(Number);
      if (year && month && day) {
         setDeduccionField("fecha", new Date(year, month - 1, day));
      }
   };

   // Al activar/desactivar el interruptor cobrable
   const handleCobrableToggle = (checked: boolean) => {
      setCobrableProyecto(checked);
      setCobrableMonto(checked ? String(values.monto_total ?? "") : "0");
   };

   // Al activar la asociación, precarga la deducción con los datos del gasto
   const handleAsociarToggle = (checked: boolean) => {
      setAsociarEmpleado(checked);
      if (checked) {
         setDeduccionTouched(new Set());
         setDeduccion({
            empleado_id: null,
            monto_total: deduccionMontoDefault,
            balance_pendiente: deduccionMontoDefault,
            cuotas_sugeridas: 1,
            concepto: values.concepto,
            fecha: values.fecha,
         });
      }
   };

   // Mantiene sincronizada la deducción con el gasto
   useEffect(() => {
      if (!asociarEmpleado) return;

      setDeduccion((prev) => ({
         ...prev,
         monto_total: deduccionTouched.has("monto_total") ? prev.monto_total : deduccionMontoDefault,
         balance_pendiente: deduccionTouched.has("balance_pendiente") ? prev.balance_pendiente : deduccionMontoDefault,
         concepto: deduccionTouched.has("concepto") ? prev.concepto : values.concepto,
         fecha: deduccionTouched.has("fecha") ? prev.fecha : values.fecha,
      }));
   }, [asociarEmpleado, values.monto_total, values.concepto, values.fecha, deduccionTouched, cobrableProyecto, cobrableMonto]);

   const montoSugeridoDeduccion =
      Number(deduccion.monto_total) > 0 && Number(deduccion.cuotas_sugeridas) > 0
         ? Number(deduccion.monto_total) / Number(deduccion.cuotas_sugeridas)
         : null;

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);

      if (!values.categoria_gasto_id) return setError("Debe seleccionar una categoría de gasto.");
      if (Number(values.monto_total) <= 0) return setError("El monto debe ser mayor a 0.");

      if (cobrableProyecto) {
         if (cobrableMontoNum < 0) return setError("El monto a cobrar al cliente no puede ser menor a 0.");
         if (cobrableMontoNum > gastoMonto) {
            return setError("El monto a cobrar al cliente no puede ser mayor al monto del gasto.");
         }
      }

      if (asociarEmpleado && !deduccion.empleado_id) {
         return setError("Debe seleccionar un empleado para la deducción.");
      }
      if (asociarEmpleado && Number(deduccion.monto_total) <= 0) {
         return setError("El monto de la deducción debe ser mayor a 0.");
      }
      if (asociarEmpleado && Number(deduccion.monto_total) > montoDisponibleDeduccion) {
         return setError(
            `La deducción no puede superar $${montoDisponibleDeduccion.toLocaleString("en-US", { minimumFractionDigits: 2 })} (monto del gasto menos lo cobrado al cliente).`
         );
      }

      try {
         const payload: any = {
            monto_total: Number(values.monto_total),
            concepto: values.concepto,
            ncf: values.ncf,
            fecha: values.fecha,
            categoria_gasto_id: values.categoria_gasto_id,
            orden_compra_id: values.orden_compra_id,
            proyecto_id: values.proyecto_id,
            equipo_id: values.equipo_id,
            cobrable_proyecto: cobrableProyecto,
            cobrable_monto: cobrableProyecto ? cobrableMontoNum : 0,
         };

         if (asociarEmpleado && deduccion.empleado_id) {
            payload.deduccion = {
               empleado_id: deduccion.empleado_id,
               equipo_id: values.equipo_id,
               monto_total: Number(deduccion.monto_total),
               balance_pendiente: deduccion.balance_pendiente ? Number(deduccion.balance_pendiente) : null,
               cuotas_sugeridas: Number(deduccion.cuotas_sugeridas),
               concepto: deduccion.concepto,
               fecha: deduccion.fecha,
            };
         }

         await onSubmit(payload);
      } catch (err: any) {
         setError(err.message || "Error al procesar el formulario");
      }
   }

   return (
      <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2 px-3 overflow-y-auto">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Categoría de Gasto *</Label>
                    <SelectBuscadorCategoriaGasto 
                       value={values.categoria_gasto_id} 
                       initialLabel={categoriaGastoNombre} 
                       onChange={(id) => set("categoria_gasto_id", id)} 
                       disabled={isDisabled("categoria_gasto_id")}
                       onCreateNew={(term) => {
                          setNewCategoriaInitialName(term);
                          setIsCategoriaModalOpen(true);
                       }}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                   <Label>Monto Total ($) *</Label>
                   <Input type="number" step="0.01" min="0.01" value={values.monto_total} onChange={(e) => set("monto_total", e.target.value)} required disabled={isDisabled("monto_total")} className={INPUT_CLASS} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                   <Label>Número de comprobante fiscal </Label>
                   <Input value={values.ncf} onChange={(e) => set("ncf", e.target.value)} disabled={isDisabled("ncf")} className={INPUT_CLASS} placeholder="B01..." />
                </div>
                <div className="flex flex-col gap-1.5">
                   <Label>Fecha del Comprobante *</Label>
                   <Input 
                      type="date" 
                      value={formatDateForInput(values.fecha)} 
                      onChange={handleDateChange} 
                      required 
                      disabled={isDisabled("fecha")} 
                      className={INPUT_CLASS} 
                   />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Orden de Compra</Label>
                    <SelectBuscadorOrdenCompra 
                        value={values.orden_compra_id} 
                        initialLabel={initialData?.orden_compra_codigo_referencia ?? ""} 
                        onChange={(id) => set("orden_compra_id", id)} 
                        disabled={isDisabled("orden_compra_id")} 
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label>Equipo Asociado</Label>
                    <SelectBuscadorEquipo 
                        value={values.equipo_id} 
                        initialLabel={initialData?.equipo_codigo_referencia ?? ""} 
                        onChange={(id) => set("equipo_id", id)} 
                        disabled={isDisabled("equipo_id")} 
                    />
                </div>  
            </div>

            {/* ── Proyecto Asociado / Cobrable al Cliente ── */}
            <div className="rounded-md border border-border bg-muted/20 p-4 flex flex-col gap-3">
               <div className="flex flex-col gap-1.5">
                  <Label>Proyecto Asociado</Label>
                  <SelectBuscadorProyecto
                     value={values.proyecto_id}
                     initialLabel={initialData?.proyecto_codigo_referencia ?? ""}
                     onChange={(id) => set("proyecto_id", id)}
                     disabled={isDisabled("proyecto_id")}
                  />
               </div>

               <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                     <Label htmlFor="cobrable-proyecto" className="font-semibold">
                        Cobrable al Cliente
                     </Label>
                     <p className="text-sm text-muted-foreground">
                        {cobrableProyecto
                           ? "El cargo correrá por cuenta del cliente del proyecto."
                           : "El cargo correrá por cuenta de la empresa."}
                     </p>
                  </div>
                  <Switch
                     id="cobrable-proyecto"
                     checked={cobrableProyecto}
                     onCheckedChange={handleCobrableToggle}
                     disabled={loading}
                  />
               </div>

               {/* Se muestra únicamente si cobrableProyecto está activo */}
               {cobrableProyecto && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
                     <Label>Monto a Cobrar al Cliente ($)</Label>
                     <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={gastoMonto > 0 ? gastoMonto : undefined}
                        value={cobrableMonto}
                        onChange={(e) => setCobrableMonto(e.target.value)}
                        disabled={loading}
                        className={INPUT_CLASS}
                     />
                     <p className="text-xs text-muted-foreground">
                        No puede ser menor a 0 ni mayor a ${gastoMonto.toLocaleString("en-US", { minimumFractionDigits: 2 })}.
                     </p>
                  </div>
               )}
            </div>

            <div className="flex flex-col gap-1.5">
               <Label>Concepto del Gasto *</Label>
               <textarea 
                  value={values.concepto} 
                  onChange={(e) => set("concepto", e.target.value)} 
                  required 
                  disabled={isDisabled("concepto")} 
                  className={TEXTAREA_CLASS} 
                  placeholder="Ej: Compra de material de oficina" 
               />
            </div>

            {/* ── Deducción / Asociar a Empleado ── */}
            {!initialData ? (
               <div className="rounded-md border border-border bg-muted/20 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                     <Checkbox
                        id="asociar-empleado"
                        checked={asociarEmpleado}
                        onCheckedChange={handleAsociarToggle}
                        disabled={loading}
                        className="mt-0.5"
                     />
                     <div className="flex flex-col gap-0.5">
                        <Label htmlFor="asociar-empleado" className="font-semibold">
                           Asociar a Empleado (Deducción)
                        </Label>
                        <p className="text-sm text-muted-foreground">
                           {asociarEmpleado
                              ? "Este gasto también se le asignará a un empleado y deberá cubrirlo."
                              : "Este gasto no está asociado a ningún empleado."}
                        </p>
                     </div>
                  </div>

                  {asociarEmpleado && (
                     <div className="flex flex-col gap-4 border-t border-border pt-4">
                        <div className="flex flex-col gap-1.5">
                           <Label>Empleado Asociado *</Label>
                           <SelectBuscadorEmployee
                              value={deduccion.empleado_id}
                              initialLabel=""
                              onChange={(id) => setDeduccionField("empleado_id", id)}
                              disabled={loading}
                           />
                        </div>

                        {deduccion.empleado_id && (
                           <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-1.5">
                                     <Label>Monto de la Deducción ($) *</Label>
                                     <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={montoDisponibleDeduccion > 0 ? montoDisponibleDeduccion : undefined}
                                        value={deduccion.monto_total}
                                        onChange={(e) => setDeduccionField("monto_total", e.target.value)}
                                        required
                                        disabled={loading}
                                        className={INPUT_CLASS}
                                     />
                                     {cobrableProyecto && cobrableMontoNum > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                           Máximo deducible: ${montoDisponibleDeduccion.toLocaleString("en-US", { minimumFractionDigits: 2 })} (monto del gasto menos lo cobrado al cliente).
                                        </p>
                                     )}
                                  </div>
                                 <div className="flex flex-col gap-1.5">
                                    <Label>Balance Pendiente ($)</Label>
                                    <Input
                                       type="number"
                                       step="0.01"
                                       value={deduccion.balance_pendiente}
                                       onChange={(e) => setDeduccionField("balance_pendiente", e.target.value)}
                                       disabled={loading}
                                       className={INPUT_CLASS}
                                       placeholder="Dejar vacío si no aplica"
                                    />
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div className="flex flex-col gap-1.5">
                                    <Label>Cuotas Sugeridas *</Label>
                                    <Input
                                       type="number"
                                       min="1"
                                       step="1"
                                       value={deduccion.cuotas_sugeridas}
                                       onChange={(e) => setDeduccionField("cuotas_sugeridas", Number(e.target.value))}
                                       required
                                       disabled={loading}
                                       className={INPUT_CLASS}
                                    />
                                    <p className="text-xs text-muted-foreground">Cantidad de cuotas en las que se pagará la deducción.</p>
                                 </div>
                                 <div className="flex flex-col gap-1.5">
                                    <Label>Monto Sugerido por Cuota ($)</Label>
                                    <div className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 py-1 text-sm font-semibold flex items-center text-brand-blue">
                                       {montoSugeridoDeduccion != null ? `$${montoSugeridoDeduccion.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "-"}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Monto total ÷ cuotas sugeridas.</p>
                                 </div>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                 <Label>Fecha de Aplicación *</Label>
                                 <Input
                                    type="date"
                                    value={formatDateForInput(deduccion.fecha)}
                                    onChange={handleDeduccionDateChange}
                                    required
                                    disabled={loading}
                                    className={INPUT_CLASS}
                                 />
                                 <p className="text-xs text-muted-foreground">El equipo será el mismo que el del gasto.</p>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                 <Label>Concepto de la Deducción *</Label>
                                 <textarea
                                    value={deduccion.concepto}
                                    onChange={(e) => setDeduccionField("concepto", e.target.value)}
                                    required
                                    disabled={loading}
                                    className={TEXTAREA_CLASS}
                                    placeholder="Ej: Descuento por daños en maquinaria..."
                                 />
                              </div>
                           </>
                        )}
                     </div>
                  )}
               </div>
            ) : (
               <div className="rounded-md border border-border/60 bg-muted/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
                  <p className="text-muted-foreground">
                     Si quiere asociar una deducción a este gasto, debe hacerlo desde el apartado de deducciones.
                  </p>
                  <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => router.push("/dashboard/deducciones")}
                     className="shrink-0"
                  >
                     Ir a Deducciones
                  </Button>
               </div>
            )}

         {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">{error}</div>}

         <div className="flex gap-2 justify-end pt-4 border-t border-border mt-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar Gasto"}</Button>
         </div>
      </form>

      <Dialog open={isCategoriaModalOpen} onOpenChange={setIsCategoriaModalOpen}>
         <DialogContent className="max-w-md">
            <DialogHeader>
               <DialogTitle>Crear Nueva Categoría de Gasto</DialogTitle>
            </DialogHeader>
            <CategoriaGastoForm
               initialData={{ nombre: newCategoriaInitialName }}
               loading={isCreatingCategoria}
               onSubmit={async (data) => {
                  setIsCreatingCategoria(true);
                  try {
                     const result = await CreateCategoria({
                        nombre: data.nombre,
                        grupo: data.grupo,
                     });

                     if (result instanceof Error) throw result;

                     if (result && result.id) {
                        set("categoria_gasto_id", result.id);
                        setCategoriaGastoNombre(result.nombre || data.nombre);
                     }

                     setIsCategoriaModalOpen(false);
                  } catch (error) {
                     console.error("Error al crear categoría de gasto", error);
                  } finally {
                     setIsCreatingCategoria(false);
                  }
               }}
               onCancel={() => setIsCategoriaModalOpen(false)}
            />
         </DialogContent>
      </Dialog>
      </>
   );
}