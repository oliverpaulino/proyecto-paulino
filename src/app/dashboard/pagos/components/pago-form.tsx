"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectBuscadorGasto } from "@/components/shared/SelectBuscadorGasto";
import { SelectBuscadorDeduccion } from "@/components/shared/SelectBuscadorDeduccion";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";
import { SelectBuscadorOrdenCompra } from "@/components/shared/selectBuscadorOrdenCompra";
import {
   CreatePagoForm,
   InfoDestinoPago,
   ConfigPagoPorDestino,
   TipoDestinoPago,
} from "@/dtos/pagos.dto";
import { usePagoStore } from "@/stores/usePagoStore";
import { GastoInfoCard } from "./info-cards/gasto-info-card";
import { DeduccionInfoCard } from "./info-cards/deduccion-info-card";
import { ProyectoInfoCard } from "./info-cards/proyecto-info-card";
import { OrdenCompraInfoCard } from "./info-cards/orden-compra-info-card";
import { TIPO_DESTINO_LABEL } from "./info-cards/info-card-shell";

interface PagoFormProps {
   initialData?: any;
   predefinedValues?: Partial<CreatePagoForm>;
   /** Código visible de la OC cuando viene predefinida (pago rápido), para que
    * el selector muestre la referencia aunque esté bloqueado. */
   predefinedOrdenCompraLabel?: string;
   onSubmit: (data: any) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
}

const INPUT_CLASS = "h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] disabled:opacity-60 disabled:bg-muted";
const TEXTAREA_CLASS = "min-h-[80px] w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none disabled:opacity-60 disabled:bg-muted resize-none";

export function PagoForm({ initialData, predefinedValues, predefinedOrdenCompraLabel, onSubmit, onCancel, loading }: PagoFormProps) {
   // Determinar estado inicial del tipo de destino basado en la data inicial
   const getInitialDestino = () => {
      if (initialData?.gasto_empresa_id || predefinedValues?.gasto_empresa_id) return 'GASTO';
      if (initialData?.deduccion_empleado_id || predefinedValues?.deduccion_empleado_id) return 'DEDUCCION';
      if (initialData?.proyecto_id || predefinedValues?.proyecto_id) return 'PROYECTO';
      if (initialData?.orden_compra_id || predefinedValues?.orden_compra_id) return 'ORDEN_COMPRA';
      return '';
   };

   const [destinoTipo, setDestinoTipo] = useState<TipoDestinoPago | "">(getInitialDestino());

   // Config funcional del destino elegido: los enums de método de pago y tipo
   // de movimiento varían según el destino (ver ConfigPagoPorDestino en el DTO).
   const config = destinoTipo ? ConfigPagoPorDestino[destinoTipo] : null;
   const metodoPagoOptions = config?.tipoMetodoPagoPosible ?? [];
   const tipoMovimientoOptions = config?.tipoMovimientoPosibles ?? [];
   const soloUnMovimiento = tipoMovimientoOptions.length === 1;

   const [values, setValues] = useState({
      metodo_pago: initialData?.metodo_pago ?? predefinedValues?.metodo_pago ?? "TRANSFERENCIA",
      tipo_movimiento: initialData?.tipo_movimiento ?? predefinedValues?.tipo_movimiento ?? "SALIDA",
      monto_pagado: initialData?.monto_pagado ?? predefinedValues?.monto_pagado ?? "",
      concepto: initialData?.concepto ?? predefinedValues?.concepto ?? "",
      fecha: initialData?.fecha 
         ? new Date(initialData.fecha) 
         : (predefinedValues?.fecha ? new Date(predefinedValues.fecha) : new Date()),
      
      gasto_empresa_id: initialData?.gasto_empresa_id ?? predefinedValues?.gasto_empresa_id ?? null,
      deduccion_empleado_id: initialData?.deduccion_empleado_id ?? predefinedValues?.deduccion_empleado_id ?? null,
      proyecto_id: initialData?.proyecto_id ?? predefinedValues?.proyecto_id ?? null,
      orden_compra_id: initialData?.orden_compra_id ?? predefinedValues?.orden_compra_id ?? null,
   });

   const [error, setError] = useState<string | null>(null);

   const destinoInfo = usePagoStore((s) => s.destinoInfo);
   const destinoInfoLoading = usePagoStore((s) => s.destinoInfoLoading);
   const GetDestinoInfo = usePagoStore((s) => s.GetDestinoInfo);
   const clearDestinoInfo = usePagoStore((s) => s.clearDestinoInfo);

   // Carga el balance polimórfico del destino seleccionado (Gasto, Deducción,
   // Proyecto u Orden de Compra) para mostrarlo en la sección informativa.
   useEffect(() => {
      const params: Record<string, string> = {};
      if (values.gasto_empresa_id) params.gasto_empresa_id = values.gasto_empresa_id;
      if (values.deduccion_empleado_id) params.deduccion_empleado_id = values.deduccion_empleado_id;
      if (values.proyecto_id) params.proyecto_id = values.proyecto_id;
      if (values.orden_compra_id) params.orden_compra_id = values.orden_compra_id;

      if (Object.keys(params).length === 1) {
         clearDestinoInfo();
         GetDestinoInfo(params);
      } else {
         clearDestinoInfo();
      }
   }, [
      values.gasto_empresa_id,
      values.deduccion_empleado_id,
      values.proyecto_id,
      values.orden_compra_id,
      GetDestinoInfo,
      clearDestinoInfo,
   ]);

   // Al editar, el saldo del destino ya incluye el propio pago: se devuelve
   // para mostrar el balance real antes de aplicar el nuevo monto.
   const editingAdjustment = useMemo(() => {
      if (!initialData) return 0;
      const mismoMov = initialData.tipo_movimiento === values.tipo_movimiento;
      return mismoMov ? Number(initialData.monto_pagado) : 0;
   }, [initialData, values.tipo_movimiento]);

   function set<K extends keyof typeof values>(field: K, value: typeof values[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   const handleDestinoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value as TipoDestinoPago | "";
      setDestinoTipo(type);
      const nextConfig = type ? ConfigPagoPorDestino[type] : null;
      // Limpiar los IDs cuando cambie el destino para mantener la exclusividad,
      // y ajustar método/movimiento a los primeros permitidos por el destino.
      setValues((prev) => ({
         ...prev,
         metodo_pago: nextConfig?.tipoMetodoPagoPosible[0]?.value ?? prev.metodo_pago,
         tipo_movimiento: nextConfig?.tipoMovimientoPosibles[0]?.value ?? prev.tipo_movimiento,
         gasto_empresa_id: null,
         deduccion_empleado_id: null,
         proyecto_id: null,
         orden_compra_id: null,
      }));
   };

   // Hay que guardar una referencia de destino concreta (gasto, deducción,
   // proyecto u orden de compra); elegir solo el tipo no desbloquea el resto.
   const destinoReferenciaSeleccionada = Boolean(
      values.gasto_empresa_id || values.deduccion_empleado_id || values.proyecto_id || values.orden_compra_id
   );

   const esEntrada = values.tipo_movimiento === "ENTRADA";

   // Gasto nacido de una orden de compra + movimiento SALIDA: no acepta pagos.
   // Todo se desactiva salvo destino, referencia y tipo de movimiento.
   const gastoBloqueadoPorOC =
      destinoInfo?.tipo === "GASTO" && !esEntrada && destinoInfo.aceptaPagoSalida === 0;

   // El tipo de movimiento se libera con solo elegir un destino (no exige
   // haber guardado la referencia): sus opciones derivan del destino elegido.
   const isTipoMovimientoDisabled =
      loading || !config || soloUnMovimiento || predefinedValues?.tipo_movimiento !== undefined;

   // "Nada se puede pasar del monto pendiente o disponible": el tope del
   // movimiento activo también limita el campo de monto.
   const topeActivo = destinoInfo
      ? (esEntrada ? destinoInfo.aceptaPagoEntrada : destinoInfo.aceptaPagoSalida)
      : null;
   const montoMaximo = topeActivo === null ? undefined : Math.max(0, topeActivo + editingAdjustment);

   const isDisabled = (field: keyof CreatePagoForm) => {
      // Nada es editable hasta guardar una referencia de destino concreta, y
      // un gasto asociado a una OC bloquea todo cuando el movimiento es salida.
      return loading || !destinoReferenciaSeleccionada || gastoBloqueadoPorOC || (predefinedValues?.[field] !== undefined);
   };

   // Los buscadores de referencia se desbloquean con solo elegir el tipo (para
   // poder buscar y guardar la referencia); el resto del form exige la referencia.
   const isDestinoBuscadorDisabled = (field: keyof CreatePagoForm) => {
      return loading || (predefinedValues?.[field] !== undefined);
   };

   const formatDateForInput = (date?: Date) => {
      if (!date || isNaN(date.getTime())) return "";
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
   };

   const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      const [year, month, day] = val.split("-").map(Number);
      if (year && month && day) {
         set("fecha", new Date(year, month - 1, day));
      }
   };

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);

      if (Number(values.monto_pagado) <= 0) return setError("El monto debe ser mayor a 0.");
      
      const count = [values.gasto_empresa_id, values.deduccion_empleado_id, values.proyecto_id, values.orden_compra_id].filter(Boolean).length;
      if (count !== 1) {
         return setError("Debe proveer exactamente una referencia de destino válida (Gasto, Deducción, Proyecto u Orden de Compra).");
      }

      if (destinoInfo) {
         const monto = Number(values.monto_pagado);
         const esEntrada = values.tipo_movimiento === 'ENTRADA';

         if (destinoInfo.tipo === 'DEDUCCION' && !esEntrada) {
            return setError("Las deducciones solo aceptan pagos de entrada (el empleado amortiza su deuda).");
         }
         if (destinoInfo.tipo === 'ORDEN_COMPRA' && !esEntrada) {
            return setError("Las órdenes de compra solo aceptan pagos de salida (la empresa paga al proveedor).");
         }
         if (destinoInfo.tipo === 'ORDEN_COMPRA' && destinoInfo.estado && !['APROBADA', 'RECIBIDA'].includes(destinoInfo.estado)) {
            return setError(`No se pueden realizar pagos a órdenes de compra en estado ${destinoInfo.estado}; solo aprobadas o recibidas.`);
         }
         if (destinoInfo.tipo === 'GASTO' && esEntrada && !destinoInfo.cobrableProyecto) {
            return setError("Este gasto no es cobrable al cliente: solo se permiten pagos de salida.");
         }
         if (destinoInfo.tipo === 'GASTO' && !esEntrada && destinoInfo.aceptaPagoSalida === 0) {
            return setError("Este gasto está asociado a una orden de compra: los pagos se registran contra la orden, no contra el gasto.");
         }

         // El tope lo define el destino (null = sin tope, p.ej. entradas a proyecto).
         const tope = esEntrada ? destinoInfo.aceptaPagoEntrada : destinoInfo.aceptaPagoSalida;
         const topeAjustado = tope === null ? null : tope + editingAdjustment;
         if (topeAjustado !== null && monto > topeAjustado + 0.01) {
            return setError(`El monto excede el saldo disponible del destino (disponible: RD$ ${Math.max(0, topeAjustado).toFixed(2)}).`);
         }
      }

      try {
         await onSubmit({
            metodo_pago: values.metodo_pago,
            tipo_movimiento: values.tipo_movimiento,
            monto_pagado: Number(values.monto_pagado),
            concepto: values.concepto,
            fecha: values.fecha,
            gasto_empresa_id: values.gasto_empresa_id,
            deduccion_empleado_id: values.deduccion_empleado_id,
            proyecto_id: values.proyecto_id,
            orden_compra_id: values.orden_compra_id,
         });
      } catch (err: any) {
         setError(err.message || "Error al procesar el formulario");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2 px-3 overflow-y-auto">

            {/* ── Destino: lo primero. Sin él nada más es editable. ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Destino *</Label>
                    <select 
                        value={destinoTipo} 
                        onChange={handleDestinoChange}
                        disabled={loading || !!initialData || (!!predefinedValues?.orden_compra_id)} 
                        className={INPUT_CLASS}
                        required
                    >
                        <option value="" disabled>Seleccione el tipo...</option>
                        {(Object.keys(ConfigPagoPorDestino) as TipoDestinoPago[]).map((t) => (
                           <option key={t} value={t}>{TIPO_DESTINO_LABEL[t]}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <Label>Tipo de Movimiento *</Label>
                  <select 
                        value={values.tipo_movimiento} 
                        onChange={(e) => set("tipo_movimiento", e.target.value)}
                        disabled={isTipoMovimientoDisabled}
                        className={INPUT_CLASS}
                  >
                        {!config && <option value="">Seleccione un destino primero...</option>}
                        {tipoMovimientoOptions.map((t) => (
                           <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                  </select>
               </div>
            </div>

            <div className="flex flex-col gap-1.5">
               <Label>Referencia de Destino *</Label>
               {!destinoTipo && (
                  <div className="h-9 flex items-center text-sm text-muted-foreground italic px-3 rounded-md bg-muted/30 border border-input/30">
                        Seleccione un tipo primero...
                  </div>
               )}
               {destinoTipo === 'GASTO' && (
                  <SelectBuscadorGasto 
                     value={values.gasto_empresa_id}
                     initialLabel={initialData?.gasto_codigo_referencia ?? ""} 
                     onChange={(id) => set("gasto_empresa_id", id)} 
                     disabled={isDestinoBuscadorDisabled("gasto_empresa_id")} 
                  />
               )}
               {destinoTipo === 'DEDUCCION' && (
                  <SelectBuscadorDeduccion 
                     value={values.deduccion_empleado_id}
                     initialLabel={initialData?.deduccion_codigo_referencia ?? ""} 
                     onChange={(id) => set("deduccion_empleado_id", id)} 
                     disabled={isDestinoBuscadorDisabled("deduccion_empleado_id")} 
                  />
               )}
               {destinoTipo === 'PROYECTO' && (
                  <SelectBuscadorProyecto 
                     value={values.proyecto_id}
                     initialLabel={initialData?.proyecto_codigo_referencia ?? ""} 
                     onChange={(id) => set("proyecto_id", id)} 
                     disabled={isDestinoBuscadorDisabled("proyecto_id")} 
                  />
               )}
               {destinoTipo === 'ORDEN_COMPRA' && (
                  <SelectBuscadorOrdenCompra 
                     value={values.orden_compra_id}
                     initialLabel={initialData?.orden_compra_codigo_referencia ?? predefinedOrdenCompraLabel ?? ""} 
                     onChange={(id) => set("orden_compra_id", id)} 
                     disabled={isDestinoBuscadorDisabled("orden_compra_id")} 
                  />
               )}
            </div>

            {/* ── Sección informativa del destino (balance polimórfico) ── */}
            {(destinoTipo && (values.gasto_empresa_id || values.deduccion_empleado_id || values.proyecto_id || values.orden_compra_id)) && (
               <DestinoInfoCards
                  destinoTipo={destinoTipo}
                  info={destinoInfo}
                  loading={destinoInfoLoading}
                  esEntrada={esEntrada}
                  monto={Number(values.monto_pagado) || 0}
                  adjustment={editingAdjustment}
               />
            )}

            <div className="mt-2 h-px bg-border" />

            <div className="flex flex-col gap-1.5">
               <Label>Método de Pago *</Label>
               <select 
                  value={values.metodo_pago} 
                  onChange={(e) => set("metodo_pago", e.target.value)}
                  disabled={isDisabled("metodo_pago") || !config}
                  className={INPUT_CLASS}
               >
                  {!config && <option value="">Seleccione un destino primero...</option>}
                  {metodoPagoOptions.map((m) => (
                     <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
               </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>Monto (RD$) *</Label>
                    <Input type="number" step="0.01" min="0.01" max={montoMaximo} value={values.monto_pagado} onChange={(e) => set("monto_pagado", e.target.value)} required disabled={isDisabled("monto_pagado")} className={INPUT_CLASS} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label>Fecha del Pago *</Label>
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

            <div className="flex flex-col gap-1.5">
                <Label>Concepto del Pago *</Label>
                <textarea 
                    value={values.concepto} 
                    onChange={(e) => set("concepto", e.target.value)} 
                    required 
                    disabled={isDisabled("concepto")} 
                    className={TEXTAREA_CLASS} 
                    placeholder="Ej: Transferencia #489221, Pago correspondiente a..." 
                />
            </div>

         {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">{error}</div>}

         <div className="flex gap-2 justify-end pt-4 border-t border-border mt-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>}
            <Button type="submit" disabled={loading || gastoBloqueadoPorOC}>{loading ? "Guardando..." : "Guardar Pago"}</Button>
         </div>
      </form>
   );
}

/**
 * Despacha el card informativo según el tipo de destino elegido. Cada card
 * renderiza su propia vista según el movimiento (ENTRADA/SALIDA) con los
 * campos simplificados (monto total, pendiente y nuevo saldo).
 */
function DestinoInfoCards({ destinoTipo, info, loading, esEntrada, monto, adjustment }: {
   destinoTipo: TipoDestinoPago;
   info: InfoDestinoPago | null;
   loading: boolean;
   esEntrada: boolean;
   monto: number;
   adjustment: number;
}) {
   const common = { info, loading, esEntrada, monto, adjustment };

   switch (destinoTipo) {
      case "GASTO":
         return <GastoInfoCard {...common} />;
      case "DEDUCCION":
         return <DeduccionInfoCard {...common} />;
      case "PROYECTO":
         return <ProyectoInfoCard {...common} />;
      case "ORDEN_COMPRA":
         return <OrdenCompraInfoCard {...common} />;
   }
}