"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, TriangleAlert, Loader2, Plus, Pencil } from "lucide-react";
import {
   useNominaStore,
   type NominaEmpleado,
} from "@/stores/useNominaStore";
import { AgregarDeduccionDialog } from "./agregar-deduccion-dialog";

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * "Precio por viaje u hora" no es un solo número: un chofer puede tener varias
 * tarifas en el mismo ciclo. Con una sola se muestra el precio; con varias se
 * muestra el rango y cuántas son, y el botón abre el detalle completo.
 */
function PrecioUnitario({
   empleado,
   onVerTarifas,
}: {
   empleado: NominaEmpleado;
   onVerTarifas: () => void;
}) {
   // Un asalariado no cobra por viaje ni por hora: cobra su sueldo. Se muestra
   // el monto entre paréntesis para no obligar a expandir la fila para verlo.
   if (empleado.modalidad === "FIJO") {
      return (
         <span className="whitespace-nowrap text-muted-foreground">
            Sueldo fijo{" "}
            <span className="text-foreground">({money(empleado.complemento_minimo)})</span>
         </span>
      );
   }
   const tarifas = empleado.tarifas ?? [];
   if (tarifas.length === 0) return <span className="text-muted-foreground">—</span>;

   const precios = [...new Set(tarifas.map((t) => t.monto_pago))].sort((a, b) => a - b);
   const sinTarifa = tarifas.filter((t) => t.monto_pago === 0).length;

   /*
      Con tarifas sin asignar, el diálogo deja de ser informativo y pasa a ser
      lo que hay que abrir para arreglarlo. Se señala en ámbar aunque haya un
      solo precio: si no, un chofer con una única tarifa en RD$ 0 no tendría
      desde dónde abrirlo.
   */
   if (sinTarifa > 0) {
      return (
         <button
            type="button"
            onClick={(ev) => {
               ev.stopPropagation();
               onVerTarifas();
            }}
            className="inline-flex items-center gap-1 rounded px-1 text-amber-700 hover:underline"
            title={`${sinTarifa} tipo(s) de cobro sin tarifa asignada: esos conduces se cuentan en RD$ 0. Abrir para asignarla.`}
         >
            <TriangleAlert className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">
               {precios.length === 1
                  ? "sin tarifa"
                  : `${money(precios[0])} – ${money(precios[precios.length - 1])}`}
            </span>
            <Badge className="border-0 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">
               {sinTarifa} sin tarifa
            </Badge>
         </button>
      );
   }

   if (precios.length === 1) {
      return (
         <button
            type="button"
            onClick={(ev) => {
               ev.stopPropagation();
               onVerTarifas();
            }}
            className="rounded px-1 hover:underline"
            title="Ver y editar las tarifas de este chofer"
         >
            {money(precios[0])}
         </button>
      );
   }

   // Con varias tarifas el número único no existe: se muestra el rango, que sí
   // dice algo (entre cuánto y cuánto le pagaron), y el detalle queda a un clic.
   return (
      <button
         type="button"
         onClick={(ev) => {
            ev.stopPropagation();
            onVerTarifas();
         }}
         className="inline-flex items-center gap-1 rounded px-1 text-blue-600 hover:underline"
         title={`${tarifas.length} tarifas distintas en este período. Ver el detalle.`}
      >
         <span className="whitespace-nowrap">
            {money(precios[0])} – {money(precios[precios.length - 1])}
         </span>
         <Badge className="border-0 bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">
            {tarifas.length}
         </Badge>
      </button>
   );
}

/**
 * Todas las tarifas que manejó una persona en el período, en un solo lugar.
 * Existe además del desglose expandible porque la pregunta "¿a cuánto le
 * pagaron cada cosa a este chofer esta quincena?" merece respuesta directa,
 * sin tener que buscar su fila y expandirla.
 */
function TarifasDialog({
   empleado,
   readOnly = false,
   onClose,
}: {
   empleado: NominaEmpleado;
   /** Un ciclo CERRADO/PAGADO no se toca: sus montos están congelados. */
   readOnly?: boolean;
   onClose: () => void;
}) {
   const { GuardarTarifasEmpleado, GuardarTarifaProyecto, FijarPrecioManual, QuitarPrecioManual, error } =
      useNominaStore();
   const tarifas = empleado.tarifas ?? [];

   /*
      Ediciones pendientes, por `categoria_equipo_tarifa_id`. Solo viven aquí
      hasta que se guarda: el precio real está en `empleado_categoria_tarifa`,
      y lo que muestra la nómina es el snapshot del ciclo. Las dos cosas se
      reconcilian recalculando, no escribiendo en el snapshot.
   */
   const [editado, setEditado] = useState<Record<string, string>>({});
   const [guardando, setGuardando] = useState(false);

   /*
      La clave con la que se guarda esta tarifa. Normalmente es su propio id;
      si es huérfana pero su nombre corresponde a UNA categoría viva, es el id
      de rescate: la fila se guardó mal (nombre sí, id no) y se puede
      re-vincular. Si el nombre es ambiguo o la categoría ya no existe, no hay
      clave y la tarifa no se puede editar.
   */
   function claveDe(t: (typeof tarifas)[number]): string | null {
      return t.categoria_equipo_tarifa_id ?? (t.rescate === "vinculable" ? t.rescate_id ?? null : null);
   }

   /*
      Toda tarifa se puede editar, pero el precio no va al mismo sitio:

        - Con clave (id propio o de rescate) va al CATÁLOGO del empleado, y
          aplica a todos sus conduces de esa categoría.
        - Sin clave (categoría borrada, o nombre ambiguo) va como PRECIO MANUAL
          de este ciclo: no hay categoría a la cual atribuirlo, así que se
          guarda pegado al ciclo y no se propaga.
        - De proyecto (tiene proyecto Y clave para atribuírsela): su precio lo
          define `proyecto_empleado_tarifa`, que gana sobre la base. Se edita
          aquí igual, pero el cambio va al PROYECTO, no al catálogo.

      La clave de edición existe siempre para poder escribir; lo que cambia es
      a dónde se guarda.
   */
   const esManual = (t: (typeof tarifas)[number]) => claveDe(t) === null;
   const esProyecto = (t: (typeof tarifas)[number]) =>
      Boolean(t.proyecto_id) && claveDe(t) !== null;

   /*
      La clave de edición lleva el proyecto: la misma tarifa puede pagarse a un
      precio por proyecto y a otro por base en el mismo ciclo, y el desglose las
      muestra como filas separadas. Sin el proyecto en la clave, editar una
      escribiría sobre la otra.
   */
   const claveEdicion = (t: (typeof tarifas)[number]) => {
      const base = claveDe(t) ?? `manual:${t.categoria_equipo_tarifa_nombre.trim().toLowerCase()}`;
      return `${base}::${t.proyecto_id ?? "sin"}`;
   };

   /*
      El desglose agrupa por (categoría, tarifa), pero el precio del catálogo
      se guarda por TARIFA. Así que si la misma tarifa aparece en dos filas
      —dos categorías de equipo distintas— ambas comparten precio y editar una
      mueve la otra. No es un error (el catálogo es así), pero hay que decirlo:
      cambiar 300 en "Camión tipo 1 · Viaje" y ver moverse "Camión tipo 2 ·
      Viaje" sin aviso parecería un bug.
   */
   const clavesRepetidas = useMemo(() => {
      const cuenta = new Map<string, number>();
      tarifas.forEach((t) => {
         const k = claveEdicion(t);
         cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
      });
      return new Set([...cuenta].filter(([, n]) => n > 1).map(([k]) => k));
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [tarifas]);

   const compartePrecio = (t: (typeof tarifas)[number]) =>
      clavesRepetidas.has(claveEdicion(t));

   /** El precio a usar ahora mismo: el editado si lo hay, si no el guardado. */
   function precioActual(t: (typeof tarifas)[number]): number {
      const k = claveEdicion(t);
      if (editado[k] !== undefined) {
         const n = Number(editado[k]);
         return Number.isFinite(n) && n >= 0 ? n : t.monto_pago;
      }
      return t.monto_pago;
   }

   const cambiada = (t: (typeof tarifas)[number]) => {
      const k = claveEdicion(t);
      if (editado[k] === undefined) return false;
      const n = Number(editado[k]);
      return Number.isFinite(n) && n >= 0 && n !== t.monto_pago;
   };

   // Al catálogo (tienen a qué vincularse), al proyecto (gana sobre el
   // catálogo) y a mano (no tienen clave).
   const cambiosCatalogo = tarifas.filter((t) => !esProyecto(t) && !esManual(t) && cambiada(t));
   const cambiosManuales = tarifas.filter((t) => esManual(t) && cambiada(t));
   const cambiosProyecto = tarifas.filter((t) => esProyecto(t) && cambiada(t));
   const cambios = [...cambiosCatalogo, ...cambiosManuales, ...cambiosProyecto];

   // Ambiguas: el nombre coincide con varias categorías vivas. No se re-vincula
   // sola, pero sí se le puede poner precio a mano.
   const ambiguas = tarifas.filter((t) => t.rescate === "ambigua");
   // Irrecuperables: la categoría se borró y solo queda el nombre.
   const huerfanas = tarifas.filter((t) => esManual(t) && t.rescate !== "ambigua").length;
   // Las que ya tienen un precio escrito a mano guardado.
   const conPrecioManual = tarifas.filter((t) => t.precio_manual);

   const invalidos = Object.values(editado).some((v) => {
      if (v.trim() === "") return true;
      const n = Number(v);
      return !Number.isFinite(n) || n < 0;
   });

   // El devengado que resultaría de guardar. No es el oficial (ese lo produce
   // el recálculo en el backend), pero deja ver el efecto antes de confirmar.
   const devengadoPreview = tarifas.reduce((s, t) => s + t.cantidad * precioActual(t), 0);
   const cambiaElTotal = cambios.length > 0 && devengadoPreview !== empleado.devengado_tarifas;

   const precios = [...new Set(tarifas.map((t) => t.monto_pago))];
   const sinTarifa = tarifas.filter((t) => precioActual(t) === 0);

   async function guardar() {
      if (cambios.length === 0 || invalidos) return;
      setGuardando(true);

      let ok = true;

      // Las que tienen categoría van al catálogo del empleado, en un solo
      // envío (el backend recalcula al final).
      if (ok && cambiosCatalogo.length > 0) {
         ok = await GuardarTarifasEmpleado(
            empleado.cycle_id,
            empleado.empleado_id,
            cambiosCatalogo.map((t) => ({
               categoria_equipo_tarifa_id: claveDe(t)!,
               monto_pago: Number(editado[claveEdicion(t)]),
            }))
         );
      }

      /*
         Las que no tienen categoría se fijan a mano, una por una: cada una es
         una tarifa distinta identificada solo por su nombre. Se hace en serie
         porque cada llamada recalcula el ciclo, y lanzarlas en paralelo sería
         pelearse por el mismo cálculo.
      */
      for (const t of cambiosManuales) {
         if (!ok) break;
         ok = await FijarPrecioManual(empleado.cycle_id, empleado.empleado_id, {
            tarifa_nombre: t.categoria_equipo_tarifa_nombre,
            monto_pago: Number(editado[claveEdicion(t)]),
         });
      }

      /*
         Las de proyecto van una por una al proyecto mismo: cada llamada
         recalcula el ciclo, y lanzarlas en paralelo sería pelearse por el
         mismo cálculo.
      */
      for (const t of cambiosProyecto) {
         if (!ok) break;
         ok = await GuardarTarifaProyecto(empleado.cycle_id, empleado.empleado_id, {
            proyecto_id: t.proyecto_id!,
            categoria_equipo_tarifa_id: claveDe(t)!,
            monto_pago: Number(editado[claveEdicion(t)]),
         });
      }

      setGuardando(false);
      // Solo se cierra si de verdad se guardó: si falló, el diálogo se queda
      // con lo escrito y el error a la vista, para no perder el trabajo.
      if (ok) onClose();
   }

   /** Quita el precio manual y deja que la tarifa vuelva a valer lo del catálogo. */
   async function quitarManual(t: (typeof tarifas)[number]) {
      setGuardando(true);
      const ok = await QuitarPrecioManual(
         empleado.cycle_id,
         empleado.empleado_id,
         t.categoria_equipo_tarifa_nombre
      );
      setGuardando(false);
      if (ok) onClose();
   }

   return (
      <Dialog open onOpenChange={(v) => !v && !guardando && onClose()}>
         <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
               <DialogTitle>Tarifas de {empleado.empleado_nombre ?? "el empleado"}</DialogTitle>
               <DialogDescription>
                  {tarifas.length === 0 ? (
                     "Sin conduces en este período."
                  ) : (
                     <>
                        {tarifas.length} tipo{tarifas.length === 1 ? "" : "s"} de cobro ·{" "}
                        {precios.length} precio{precios.length === 1 ? "" : "s"} distinto
                        {precios.length === 1 ? "" : "s"} · {empleado.total_conduces} conduce
                        {empleado.total_conduces === 1 ? "" : "s"}
                        {!readOnly && tarifas.length > 0 && (
                           <> · el precio unitario es editable</>
                        )}
                     </>
                  )}
               </DialogDescription>
            </DialogHeader>

            {tarifas.length === 0 ? (
               <p className="py-4 text-sm text-muted-foreground">
                  Este empleado no registró conduces en el período.
                  {empleado.complemento_minimo > 0 && (
                     <> Se le paga el mínimo garantizado completo.</>
                  )}
               </p>
            ) : (
               <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                         <tr className="text-xs uppercase text-muted-foreground">
                            <th className="pb-2 text-left font-semibold">Equipo</th>
                            <th className="pb-2 text-left font-semibold">Tarifa</th>
                            <th className="pb-2 text-left font-semibold">Proyecto</th>
                            <th className="pb-2 text-left font-semibold">Medida</th>
                            <th className="pb-2 text-right font-semibold">Cantidad</th>
                            <th className="pb-2 text-right font-semibold">Precio unit.</th>
                            <th className="pb-2 text-right font-semibold">Subtotal</th>
                         </tr>
                      </thead>
                      <tbody>
                         {tarifas.map((t, i) => {
                            // Toda tarifa se edita; el destino del precio
                            // depende de a quién pertenece (catálogo, proyecto
                            // o ciclo) — ver `esManual`/`esProyecto`.
                            const k = claveEdicion(t);
                            const manual = esManual(t);
                            const precio = precioActual(t);
                            const tocado = editado[k] !== undefined;
                            return (
                               <tr key={`${k}:${i}`} className="border-t border-border/50">
                                  {/*
                                     Snapshots anteriores a la migración 015 no
                                     guardaron la categoría. Se dice explícito en
                                     vez de dejar la celda vacía, que parecería
                                     un dato faltante y no un ciclo viejo.
                                  */}
                                  <td className="py-2">
                                     {t.categoria_equipo_nombre ?? (
                                        <span
                                           className="text-muted-foreground"
                                           title="Este ciclo se calculó antes de que se guardara la categoría del equipo. Recalcúlalo para verla (los ciclos cerrados no se recalculan)."
                                        >
                                           —
                                        </span>
                                     )}
                                      {compartePrecio(t) && !esProyecto(t) && (
                                        <Badge
                                           className="ml-2 border-0 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0"
                                           title="Esta tarifa se usa con más de una categoría de equipo y su precio es uno solo en el catálogo: al cambiarlo aquí cambia también en las otras filas de la misma tarifa."
                                        >
                                           precio compartido
                                        </Badge>
                                     )}
                                  </td>
                                  <td className="py-2">
                                     {t.categoria_equipo_tarifa_nombre}
                                     {t.precio_manual && (
                                        <Badge
                                           className="ml-2 border-0 bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0"
                                           title={
                                              t.precio_manual_nota ??
                                              "Precio escrito a mano para este ciclo. No sale del catálogo."
                                           }
                                        >
                                           a mano
                                        </Badge>
                                     )}
                                      {esProyecto(t) && (
                                         <Badge
                                            className="ml-2 border-0 bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0"
                                            title="Este precio lo paga el proyecto y gana sobre la base del empleado. Cambiarlo aquí actualiza la tarifa del proyecto para este chofer (afecta a sus próximas nóminas), no solo a este ciclo."
                                         >
                                            del proyecto
                                         </Badge>
                                      )}
                                  </td>
                                  <td className="py-2">
                                     {t.proyecto_nombre ?? (
                                        <span
                                           className="text-muted-foreground"
                                           title="Conduce sin proyecto: se paga la tarifa general del empleado."
                                        >
                                           Sin proyecto
                                        </span>
                                     )}
                                  </td>
                                  <td className="py-2 text-muted-foreground">
                                     {t.medida_cobro_nombre ?? "—"}
                                  </td>
                                  <td className="py-2 text-right">
                                     {t.cantidad.toLocaleString("es-DO")}
                                  </td>
                                   <td className="py-2 text-right">
                                      {readOnly ? (
                                         t.monto_pago === 0 ? (
                                            <span className="text-amber-600">sin tarifa</span>
                                         ) : (
                                            money(t.monto_pago)
                                         )
                                      ) : (
                                        <div className="flex flex-col items-end gap-0.5">
                                           <Input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              disabled={guardando}
                                              placeholder={t.monto_pago === 0 ? "sin tarifa" : undefined}
                                              title={
                                                 esProyecto(t)
                                                    ? `El precio lo paga ${t.proyecto_nombre ?? "el proyecto"}: se guarda como tarifa del proyecto para este chofer y aplica a sus próximas nóminas.`
                                                    : manual
                                                      ? t.rescate === "ambigua"
                                                        ? `Hay ${t.rescate_candidatas} categorías llamadas "${t.categoria_equipo_tarifa_nombre}": el precio se guarda a mano solo para este ciclo.`
                                                        : "Esta categoría ya no existe: el precio se guarda a mano solo para este ciclo."
                                                      : "El precio se guarda en el empleado y aplica a todos sus conduces de esta categoría."
                                              }
                                              className={`h-8 w-32 text-right ${
                                                 t.monto_pago === 0 && !tocado
                                                    ? "border-amber-400 placeholder:text-amber-600"
                                                    : manual
                                                      ? "border-purple-300"
                                                      : ""
                                              }`}
                                              value={editado[k] ?? String(t.monto_pago)}
                                              onChange={(ev) =>
                                                 setEditado((p) => ({ ...p, [k]: ev.target.value }))
                                              }
                                           />
                                           {tocado && Number(editado[k]) !== t.monto_pago && (
                                              <span className="text-[10px] text-muted-foreground">
                                                 antes {t.monto_pago === 0 ? "sin tarifa" : money(t.monto_pago)}
                                                 {manual && " · se guarda solo en este ciclo"}
                                                 {!manual && esProyecto(t) && " · se guarda como tarifa del proyecto"}
                                              </span>
                                           )}
                                          {!tocado && t.precio_manual && (
                                             <button
                                                type="button"
                                                disabled={guardando}
                                                onClick={() => quitarManual(t)}
                                                className="text-[10px] text-muted-foreground underline hover:text-foreground"
                                                title="Quitar el precio manual y volver a lo que diga el catálogo"
                                             >
                                                quitar precio manual
                                             </button>
                                          )}
                                       </div>
                                    )}
                                 </td>
                                 <td className="py-2 text-right font-medium">
                                    {money(t.cantidad * precio)}
                                 </td>
                              </tr>
                           );
                        })}
                        <tr className="border-t border-border font-semibold">
                           <td className="py-2" colSpan={6}>
                              Devengado por producción
                           </td>
                           <td className="py-2 text-right">
                              {cambiaElTotal ? (
                                 <span className="flex flex-col items-end">
                                    <span className="text-xs font-normal text-muted-foreground line-through">
                                       {money(empleado.devengado_tarifas)}
                                    </span>
                                    <span className="text-blue-600">{money(devengadoPreview)}</span>
                                 </span>
                              ) : (
                                 money(empleado.devengado_tarifas)
                              )}
                           </td>
                        </tr>
                        {empleado.complemento_minimo > 0 && (
                           <tr className="text-blue-600">
                              <td className="py-2" colSpan={6}>
                                 Complemento para alcanzar el mínimo de{" "}
                                 {money(empleado.minimo_garantizado)}
                              </td>
                              <td className="py-2 text-right font-semibold">
                                 + {money(empleado.complemento_minimo)}
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>

                  {sinTarifa.length > 0 && (
                     <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                           {sinTarifa.length} tipo{sinTarifa.length === 1 ? "" : "s"} de cobro sin
                           tarifa asignada a este empleado: esos conduces se cuentan en RD$ 0.
                           {readOnly
                              ? " Asígnele la tarifa y recalcule el ciclo."
                              : " Escriba el precio aquí y guarde para corregirlo."}
                        </span>
                     </p>
                  )}

                  {/*
                     Ambiguas: el nombre coincide con varias categorías vivas.
                     No se re-vinculan solas (sería adivinar cuál tarifa cobra
                     el chofer), pero sí se les puede poner precio a mano.
                  */}
                  {ambiguas.length > 0 && (
                     <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                           {ambiguas.map((t) => t.categoria_equipo_tarifa_nombre).join(", ")}:
                           el conduce guardó el nombre pero no la categoría, y hay más de una
                           categoría con ese nombre, así que no se re-vincula sola.
                           {readOnly
                              ? " Deje un solo nombre en el catálogo y recalcule."
                              : " Puede escribir el precio aquí (se guarda solo para este ciclo), o dejar un solo nombre en el catálogo y recalcular para arreglarlo de raíz."}
                        </span>
                     </p>
                  )}

                  {huerfanas > 0 && (
                     <p className="mt-3 text-xs text-muted-foreground">
                        {huerfanas} tipo{huerfanas === 1 ? "" : "s"} de cobro sin categoría vigente:
                        solo queda el nombre guardado en el ciclo.
                        {!readOnly && " Su precio se puede escribir a mano, pero queda guardado solo en este ciclo."}
                     </p>
                  )}

                  {conPrecioManual.length > 0 && (
                     <p className="mt-3 rounded-md bg-purple-50 p-3 text-xs text-purple-900">
                        {conPrecioManual.length} tarifa
                        {conPrecioManual.length === 1 ? "" : "s"} con precio escrito a mano. Aplica
                        solo a este empleado en este ciclo: no cambia el catálogo ni los demás
                        ciclos, y deja de usarse en cuanto la tarifa quede bien configurada.
                     </p>
                  )}

                  {!readOnly && cambiosCatalogo.length > 0 && (
                     <p className="mt-3 rounded-md bg-blue-50 p-3 text-xs text-blue-800">
                        El precio se guarda en el empleado y aplica a todos sus conduces de esta
                        categoría. Al guardar se recalcula el ciclo completo, así que otros
                        empleados con la misma tarifa no cambian, pero sí se recogen las
                        deducciones nuevas del período.
                     </p>
                  )}

                  {!readOnly && cambiosManuales.length > 0 && (
                     <p className="mt-3 rounded-md bg-purple-50 p-3 text-xs text-purple-900">
                        {cambiosManuales.map((t) => t.categoria_equipo_tarifa_nombre).join(", ")}:
                        sin categoría a la cual atribuir el precio, se guarda pegado a este ciclo
                        y a este empleado. Sobrevive a los recálculos, pero no se propaga a otros
                        ciclos ni al catálogo.
                     </p>
                  )}

                  {!readOnly && cambiosProyecto.length > 0 && (
                     <p className="mt-3 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
                        {cambiosProyecto.map((t) => t.categoria_equipo_tarifa_nombre).join(", ")}:
                        el precio lo paga{" "}
                        {cambiosProyecto[0].proyecto_nombre ?? "el proyecto"} y se guarda como su
                        tarifa para {empleado.empleado_nombre ?? "este chofer"} — aplica a sus
                        próximas nóminas en ese proyecto, no solo a este ciclo.
                     </p>
                  )}

                  {error && (
                     <p className="mt-3 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                        {error}
                     </p>
                  )}
               </div>
            )}

            {!readOnly && tarifas.length > 0 && (
               <DialogFooter>
                  <Button variant="outline" onClick={onClose} disabled={guardando}>
                     Cancelar
                  </Button>
                  <Button onClick={guardar} disabled={cambios.length === 0 || invalidos || guardando}>
                     {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
                     {guardando
                        ? "Guardando y recalculando…"
                        : cambios.length === 0
                          ? "Guardar y recalcular"
                          : `Guardar ${cambios.length} tarifa${cambios.length === 1 ? "" : "s"} y recalcular`}
                  </Button>
               </DialogFooter>
            )}
         </DialogContent>
      </Dialog>
   );
}

/**
 * Detalle de las deducciones del período, dentro del acordeón. Con cuotas, la
 * "cuota por nómina" se edita AQUÍ (no en el diálogo de agregar): se escribe el
 * nuevo monto, se le da a "Guardar cambios" y la nómina vuelve a aplicar el
 * cobro — subirla acelera el saldo, bajarla lo frena.
 */
function DetalleDeducciones({
   empleado,
   readOnly = false,
}: {
   empleado: NominaEmpleado;
   readOnly?: boolean;
}) {
   const { ActualizarCuotaDeduccion, error } = useNominaStore();
   const deducciones = empleado.detalle_deducciones ?? [];
   const [editado, setEditado] = useState<Record<string, string>>({});
   const [guardando, setGuardando] = useState(false);

   if (deducciones.length === 0) return null;

   // Solo las que tienen cuotas se editan: una de 1 cuota se cobra completa en
   // su período y su monto por nómina ES el total.
   const editables = deducciones.filter((d) => d.cuotas_sugeridas > 1);
   const puedeEditar = !readOnly && editables.length > 0;

   const hayCambios = editables.some((d) => {
      const v = editado[d.id];
      if (v === undefined) return false;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 && n !== d.monto_cuota;
   });
   const invalidos = Object.values(editado).some((v) => {
      const n = Number(v);
      return v.trim() === "" || !Number.isFinite(n) || n <= 0;
   });

   async function guardar() {
      if (!hayCambios || invalidos) return;
      setGuardando(true);
      let ok = true;
      for (const d of editables) {
         const v = editado[d.id];
         if (v === undefined) continue;
         const n = Number(v);
         if (!Number.isFinite(n) || n <= 0 || n === d.monto_cuota) continue;
         ok = await ActualizarCuotaDeduccion(
            empleado.cycle_id,
            empleado.empleado_id,
            d.id,
            n
         );
         if (!ok) break;
      }
      setGuardando(false);
      // Si todo salió bien, se deja de mostrar los valores viejos: la fila ya
      // llegó actualizada con las cuotas nuevas.
      if (ok) setEditado({});
   }

   return (
      <div className="mt-4 border-t pt-3">
         <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Deducciones del período
         </p>
         <table className="w-full text-sm">
            <thead>
               <tr className="text-xs uppercase text-muted-foreground">
                  <th className="pb-1 text-left font-semibold">Fecha</th>
                  <th className="pb-1 text-left font-semibold">Concepto</th>
                  <th className="pb-1 text-right font-semibold">Cuota por nómina</th>
                  <th className="pb-1 text-right font-semibold">Se descuenta</th>
               </tr>
            </thead>
            <tbody>
               {deducciones.map((d) => {
                  const editable = !readOnly && d.cuotas_sugeridas > 1;
                  const tocado = editado[d.id] !== undefined;
                  const valor = tocado ? editado[d.id]! : String(d.monto_cuota);
                  return (
                     <tr key={d.id} className="border-t border-border/50">
                        <td className="py-2 text-muted-foreground">
                           {new Date(`${String(d.fecha).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO")}
                        </td>
                        <td className="py-2">
                           {d.concepto}
                           {d.cuotas_sugeridas > 1 && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                 · cuota {d.cuotas_aplicadas} de {d.cuotas_sugeridas} · total{" "}
                                 {money(d.monto_total)}
                              </span>
                           )}
                        </td>
                        <td className="py-2 text-right">
                           {editable ? (
                              <Input
                                 type="number"
                                 step="0.01"
                                 min="0.01"
                                 disabled={guardando}
                                 className={`h-8 w-28 text-right ${
                                    tocado && Number(valor) !== d.monto_cuota
                                       ? "border-blue-400"
                                       : ""
                                 }`}
                                 title="Cuota que se descuenta en cada nómina. Subirla acelera el saldo, bajarla lo frena."
                                 value={valor}
                                 onChange={(ev) =>
                                    setEditado((p) => ({ ...p, [d.id]: ev.target.value }))
                                 }
                              />
                           ) : (
                              <span className="text-muted-foreground">{money(d.monto_cuota)}</span>
                           )}
                        </td>
                        <td className="py-2 text-right font-medium text-destructive">
                           − {money(d.monto_periodo)}
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>

         {puedeEditar && (
            <p className="mt-2 text-xs text-muted-foreground">
               La cuota por nómina es editable: subirla acelera el saldo, bajarla lo frena.
            </p>
         )}

         {puedeEditar && (hayCambios || invalidos) && (
            <div className="mt-3 flex items-center justify-end gap-2">
               <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditado({})}
                  disabled={guardando}
               >
                  Descartar
               </Button>
               <Button
                  type="button"
                  size="sm"
                  onClick={guardar}
                  disabled={!hayCambios || invalidos || guardando}
               >
                  {guardando && <Loader2 className="mr-2 size-3 animate-spin" />}
                  {guardando ? "Guardando…" : "Guardar cambios"}
               </Button>
            </div>
         )}

         {error && (
            <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
               {error}
            </p>
         )}
      </div>
   );
}

/**
 * Las deducciones del empleado, cargadas al abrir la fila. El listado del
 * ciclo trae solo el conteo (traer el detalle de todos costaba una query por
 * empleado), así que aquí se piden las del que se está mirando.
 */
function DeduccionesExpandible({
   empleado,
   readOnly = false,
}: {
   empleado: NominaEmpleado;
   readOnly?: boolean;
}) {
   const { detalles, cargandoDetalle, GetDetalleEmpleado } = useNominaStore();

   const cacheado = detalles[empleado.empleado_id];

   useEffect(() => {
      if (empleado.deducciones_count === 0) return;
      // Ya hay caché (o una petición en vuelo): no se duplica.
      if (detalles[empleado.empleado_id]) return;
      if (cargandoDetalle.includes(empleado.empleado_id)) return;
      GetDetalleEmpleado(empleado.cycle_id, empleado.empleado_id);
   }, [
      empleado.cycle_id,
      empleado.empleado_id,
      empleado.deducciones_count,
      detalles,
      cargandoDetalle,
      GetDetalleEmpleado,
   ]);

   if (empleado.deducciones_count === 0) return null;

   if (!cacheado) {
      return (
         <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            {cargandoDetalle.includes(empleado.empleado_id) && (
               <Loader2 className="size-3 animate-spin" />
            )}
            Cargando las {empleado.deducciones_count} deducci
            {empleado.deducciones_count === 1 ? "ón" : "ones"} del período…
         </div>
      );
   }

   // El listado del ciclo no trae `detalle_deducciones` (solo el conteo); las
   // deducciones concretas viven en el caché del store, cargado recién. Sin
   // este merge, DetalleDeducciones recibiría un arreglo vacío y no mostraría
   // nada aunque sí haya deducciones.
   return (
      <DetalleDeducciones
         empleado={{ ...empleado, detalle_deducciones: cacheado.detalle_deducciones }}
         readOnly={readOnly}
      />
   );
}

function FilaDesglose({
   empleado,
   readOnly = false,
   onEditarTarifas,
}: {
   empleado: NominaEmpleado;
   readOnly?: boolean;
   onEditarTarifas: () => void;
}) {
   const tarifas = empleado.tarifas ?? [];

   if (empleado.modalidad === "FIJO") {
      return (
         <div className="px-6 py-4">
            <table className="w-full text-sm">
               <tbody>
                  <tr>
                     <td className="py-2">
                        Salario del período
                        {empleado.rol && (
                           <span className="text-muted-foreground"> · {empleado.rol}</span>
                        )}
                     </td>
                     <td className="py-2 text-right font-semibold">
                        {money(empleado.complemento_minimo)}
                     </td>
                  </tr>
               </tbody>
            </table>
            <DeduccionesExpandible empleado={empleado} readOnly={readOnly} />
         </div>
      );
   }

   if (tarifas.length === 0) {
      return (
         <div className="px-6 py-4 text-sm text-muted-foreground">
            Sin conduces en este período.
            {empleado.complemento_minimo > 0 && (
               <> Se paga el mínimo garantizado completo.</>
            )}
         </div>
      );
   }

   // Cuántos precios distintos le tocaron: es la respuesta a "¿cuántas
   // tarifas manejó esta persona en la quincena?".
   const preciosDistintos = new Set(tarifas.map((t) => t.monto_pago)).size;

   return (
      <div className="px-6 py-4">
         <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
               Tarifas del período · {tarifas.length} tipo
               {tarifas.length === 1 ? "" : "s"} de cobro
               {preciosDistintos > 1 && <> · {preciosDistintos} precios distintos</>}
            </p>
            {!readOnly && (
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(ev) => {
                     ev.stopPropagation();
                     onEditarTarifas();
                  }}
               >
                  <Pencil className="mr-1 size-3" />
                  Editar tarifas
               </Button>
            )}
         </div>
          <table className="w-full text-sm">
             <thead>
                <tr className="text-xs uppercase text-muted-foreground">
                   <th className="pb-2 text-left font-semibold">Equipo</th>
                   <th className="pb-2 text-left font-semibold">Tarifa</th>
                   <th className="pb-2 text-left font-semibold">Proyecto</th>
                   <th className="pb-2 text-left font-semibold">Medida</th>
                   <th className="pb-2 text-right font-semibold">Cantidad</th>
                   <th className="pb-2 text-right font-semibold">Precio unit.</th>
                   <th className="pb-2 text-right font-semibold">Subtotal</th>
                </tr>
             </thead>
             <tbody>
                {tarifas.map((t, i) => (
                   <tr key={i} className="border-t border-border/50">
                      {/* NULL = ciclo calculado antes de la migración 015. */}
                      <td className="py-2">
                         {t.categoria_equipo_nombre ?? (
                            <span
                               className="text-muted-foreground"
                               title="Este ciclo se calculó antes de que se guardara la categoría del equipo. Recalcúlalo para verla (los ciclos cerrados no se recalculan)."
                            >
                               —
                            </span>
                         )}
                      </td>
                      <td className="py-2">{t.categoria_equipo_tarifa_nombre}</td>
                      <td className="py-2">
                         {t.proyecto_nombre ?? (
                            <span className="text-muted-foreground" title="Conduce sin proyecto: se paga la tarifa general del empleado.">
                               Sin proyecto
                            </span>
                         )}
                      </td>
                      <td className="py-2 text-muted-foreground">{t.medida_cobro_nombre ?? "—"}</td>
                      <td className="py-2 text-right">{t.cantidad.toLocaleString("es-DO")}</td>
                      <td className="py-2 text-right">
                         {t.monto_pago === 0 ? (
                            <span className="text-amber-600" title="Este chofer no tiene tarifa asignada para este tipo de cobro">
                               sin tarifa
                            </span>
                         ) : (
                            money(t.monto_pago)
                         )}
                      </td>
                      <td className="py-2 text-right font-medium">{money(t.subtotal)}</td>
                   </tr>
                ))}
                <tr className="border-t border-border font-semibold">
                   <td className="py-2" colSpan={6}>
                      Devengado por producción
                   </td>
                   <td className="py-2 text-right">{money(empleado.devengado_tarifas)}</td>
                </tr>
                {empleado.complemento_minimo > 0 && (
                   <tr className="text-blue-600">
                      <td className="py-2" colSpan={6}>
                         Complemento para alcanzar el mínimo de{" "}
                         {money(empleado.minimo_garantizado)}
                      </td>
                      <td className="py-2 text-right font-semibold">
                         + {money(empleado.complemento_minimo)}
                      </td>
                   </tr>
                )}
             </tbody>
          </table>

         <DeduccionesExpandible empleado={empleado} readOnly={readOnly} />
      </div>
   );
}

export function NominaTable({
   readOnly = false,
   seleccionados,
   onToggle,
   onToggleTodos,
   empleados,
   totalSinFiltrar,
   onLimpiarFiltros,
   periodo,
}: {
   readOnly?: boolean;
   seleccionados: Set<string>;
   onToggle: (id: string) => void;
   /** Recibe los ids VISIBLES: con filtros activos no debe marcar los ocultos. */
   onToggleTodos: (marcar: boolean, ids: string[]) => void;
   /** Filas ya filtradas. Los totales se calculan sobre lo que se ve. */
   empleados: NominaEmpleado[];
   /** Cuántas había antes de filtrar, para distinguir "vacío" de "sin coincidencias". */
   totalSinFiltrar: number;
   onLimpiarFiltros?: () => void;
   /** Fechas del ciclo, para acotar el listado de conduces al mismo período. */
   periodo?: { fecha_inicio: string; fecha_fin: string };
}) {
   const { loading, UpdateSeguro } = useNominaStore();
   const [abierto, setAbierto] = useState<string | null>(null);
   const [editando, setEditando] = useState<Record<string, string>>({});
   const [agregandoA, setAgregandoA] = useState<NominaEmpleado | null>(null);
   const [viendoTarifasDe, setViendoTarifasDe] = useState<NominaEmpleado | null>(null);

   /*
      Se filtra por `empleado_id`, no por la fila de nómina: el backend resuelve
      ahí los conduces directos y los que cuelgan del operador, que es justo lo
      que se contó al calcular. El nombre viaja solo para poder rotular la otra
      pestaña sin ir de nuevo al servidor.
   */
   function enlaceConduces(e: NominaEmpleado): string {
      const params = new URLSearchParams({ empleado_id: e.empleado_id });
      if (e.empleado_nombre) params.set("empleado_nombre", e.empleado_nombre);
      if (periodo) {
         params.set("fecha_desde", periodo.fecha_inicio.slice(0, 10));
         params.set("fecha_hasta", periodo.fecha_fin.slice(0, 10));
      }
      return `/dashboard/conduces?${params.toString()}`;
   }

   if (loading) {
      return (
         <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
         </div>
      );
   }

   if (totalSinFiltrar === 0) {
      return (
         <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground">
            <p className="text-sm">Aún no se ha calculado la nómina de este ciclo.</p>
         </div>
      );
   }

   const filtrando = empleados.length !== totalSinFiltrar;

   if (empleados.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground">
            <p className="text-sm">Ningún empleado coincide con los filtros.</p>
            {onLimpiarFiltros && (
               <Button variant="outline" size="sm" onClick={onLimpiarFiltros}>
                  Limpiar filtros
               </Button>
            )}
         </div>
      );
   }

   const todosMarcados = empleados.length > 0 && empleados.every((e) => seleccionados.has(e.id));

   const totales = empleados.reduce(
      (acc, e) => ({
         devengado: acc.devengado + e.devengado_tarifas,
         complemento: acc.complemento + e.complemento_minimo,
         seguro: acc.seguro + e.seguro,
         deducciones: acc.deducciones + e.deducciones,
         neto: acc.neto + e.neto_pagar,
      }),
      {
         devengado: 0,
         complemento: 0,
         seguro: 0,
         deducciones: 0,
         neto: 0,
      }
   );

   async function guardarSeguro(emp: NominaEmpleado) {
      const valor = editando[emp.id];
      if (valor === undefined) return;
      const n = Number(valor);
      setEditando((prev) => {
         const copia = { ...prev };
         delete copia[emp.id];
         return copia;
      });
      if (!Number.isFinite(n) || n < 0 || n === emp.seguro) return;
      await UpdateSeguro(emp.id, n);
   }

   return (
      <div className="overflow-x-auto rounded-xl border">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <th className="w-9 px-3 py-3">
                     <Checkbox
                        aria-label="Seleccionar todos"
                        checked={todosMarcados}
                        onCheckedChange={(v) =>
                           onToggleTodos(v === true, empleados.map((e) => e.id))
                        }
                     />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold">Nombre</th>
                  <th className="px-3 py-3 text-right font-semibold">Precio viaje/hora</th>
                  <th className="px-3 py-3 text-right font-semibold">Seguro</th>
                  <th className="px-3 py-3 text-right font-semibold">Deuda</th>
                  <th className="px-3 py-3 text-right font-semibold">Se cobra</th>
                  <th className="px-3 py-3 text-right font-semibold">Pendiente</th>
                  <th className="px-3 py-3 text-right font-semibold">Neto</th>
               </tr>
            </thead>
            <tbody>
               {empleados.map((e) => {
                  const expandido = abierto === e.id;
                  return (
                     // La key va en el Fragment (hijo directo del map), no en
                     // el <tr>: cada empleado renderiza DOS filas.
                     <Fragment key={e.id}>
                        <tr
                           className="border-t hover:bg-muted/20 cursor-pointer"
                           onClick={() => setAbierto(expandido ? null : e.id)}
                        >
                           <td className="px-3 py-3" onClick={(ev) => ev.stopPropagation()}>
                              <Checkbox
                                 aria-label={`Seleccionar ${e.empleado_nombre ?? "empleado"}`}
                                 checked={seleccionados.has(e.id)}
                                 onCheckedChange={() => onToggle(e.id)}
                              />
                           </td>
                           <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                 {expandido ? (
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                 ) : (
                                    <ChevronRight className="size-4 text-muted-foreground" />
                                 )}
                                 <span className="font-medium">{e.empleado_nombre ?? "—"}</span>
                                 {e.conduces_inferidos > 0 && (
                                    <Badge
                                       className="border-0 bg-amber-100 text-amber-800 text-xs gap-1"
                                       title={`${e.conduces_inferidos} conduce(s) sin chofer registrado, atribuidos según el operador asignado al equipo. Verificar.`}
                                    >
                                       <TriangleAlert className="size-3" />
                                       {e.conduces_inferidos} inferido
                                       {e.conduces_inferidos > 1 ? "s" : ""}
                                    </Badge>
                                 )}
                              </div>
                              <div className="pl-6 text-xs text-muted-foreground">
                                 {e.modalidad === "FIJO" ? (
                                    <>Salario fijo{e.rol ? ` · ${e.rol}` : ""}</>
                                 ) : (
                                    <>
                                       {/*
                                          El conteo es el enlace al detalle: abre
                                          el registro de conduces ya filtrado por
                                          este chofer y por el período del ciclo,
                                          en otra pestaña para no perder la
                                          nómina que se está revisando.
                                       */}
                                       {e.total_conduces > 0 ? (
                                          <Link
                                             href={enlaceConduces(e)}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             onClick={(ev) => ev.stopPropagation()}
                                             className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                             title={`Ver los ${e.total_conduces} conduces de ${
                                                e.empleado_nombre ?? "este chofer"
                                             } en este período`}
                                          >
                                             {e.total_conduces} conduce
                                             {e.total_conduces === 1 ? "" : "s"}
                                             <ExternalLink className="size-3" />
                                          </Link>
                                       ) : (
                                          <>
                                             {e.total_conduces} conduce
                                             {e.total_conduces === 1 ? "" : "s"}
                                          </>
                                       )}
                                       {/*
                                          Lo que pide la revisión: cuánto generó
                                          por conduces y cuál es el piso. Si no
                                          llega, se le completa la diferencia — se
                                          paga el mínimo, pero se ve que llegó a lo
                                          que llegó.
                                       */}
                                       <span className="text-muted-foreground">
                                          {" "}
                                          · devengado {money(e.devengado_tarifas)} · mínimo{" "}
                                          {money(e.minimo_garantizado)}
                                       </span>
                                       {e.complemento_minimo > 0 && (
                                          <span className="text-blue-600">
                                             {" "}
                                             · se completa {money(e.complemento_minimo)}
                                          </span>
                                       )}
                                    </>
                                 )}
                              </div>
                           </td>

                           <td className="px-3 py-3 text-right whitespace-nowrap">
                              <PrecioUnitario
                                 empleado={e}
                                 onVerTarifas={() => setViendoTarifasDe(e)}
                              />
                           </td>

                           <td
                              className="px-3 py-3 text-right"
                              onClick={(ev) => ev.stopPropagation()}
                           >
                              {readOnly ? (
                                 money(e.seguro)
                              ) : (
                                 <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-8 w-28 text-right"
                                    value={editando[e.id] ?? String(e.seguro)}
                                    onChange={(ev) =>
                                       setEditando((p) => ({ ...p, [e.id]: ev.target.value }))
                                    }
                                    onBlur={() => guardarSeguro(e)}
                                    onKeyDown={(ev) => {
                                       if (ev.key === "Enter") ev.currentTarget.blur();
                                    }}
                                 />
                              )}
                            </td>

                            <td className="px-3 py-3 text-right whitespace-nowrap">
                               {money(e.deuda_total)}
                            </td>
                           {/*
                              El monto NO se edita: sale de sumar las
                              deducciones del período. Para descontar más se
                              agrega una deducción nueva, con su concepto.
                           */}
                           <td
                              className="px-3 py-3 text-right"
                              onClick={(ev) => ev.stopPropagation()}
                           >
                              <div className="flex items-center justify-end gap-1">
                                 <span className="text-destructive whitespace-nowrap">
                                    {e.deducciones > 0 ? `− ${money(e.deducciones)}` : "—"}
                                 </span>
                                 {!readOnly && (
                                    <Button
                                       type="button"
                                       variant="ghost"
                                       size="icon"
                                       className="size-6 text-muted-foreground hover:text-foreground"
                                       title="Agregar una deducción a este chofer"
                                       onClick={() => setAgregandoA(e)}
                                    >
                                       <Plus className="size-4" />
                                    </Button>
                                 )}
                              </div>
                              {e.deducciones_count > 0 && (
                                 <div className="text-[10px] text-muted-foreground">
                                    {e.deducciones_count} concepto
                                    {e.deducciones_count > 1 ? "s" : ""}
                                 </div>
                              )}
                           </td>
                           <td className="px-3 py-3 text-right whitespace-nowrap text-muted-foreground">
                              {money(e.deuda_pendiente)}
                           </td>
                           <td className="px-3 py-3 text-right whitespace-nowrap font-bold">
                              {money(e.neto_pagar)}
                           </td>
                        </tr>

                        {expandido && (
                           <tr className="bg-muted/10">
                              <td colSpan={8} className="p-0">
                                 <FilaDesglose
                                    empleado={e}
                                    readOnly={readOnly}
                                    onEditarTarifas={() => setViendoTarifasDe(e)}
                                 />
                              </td>
                           </tr>
                        )}
                     </Fragment>
                  );
               })}
            </tbody>
            <tfoot>
               <tr className="border-t-2 bg-muted/30 font-bold">
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3">
                     Totales ({empleados.length}
                     {filtrando ? ` de ${totalSinFiltrar}` : ""})
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                     Bruto {money(totales.devengado + totales.complemento)}
                  </td>
                   <td className="px-3 py-3 text-right">{money(totales.seguro)}</td>
                   <td className="px-3 py-3" />
                   <td className="px-3 py-3 text-right text-destructive">
                      {money(totales.deducciones)}
                   </td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right">{money(totales.neto)}</td>
               </tr>
            </tfoot>
         </table>

         {agregandoA && (
            <AgregarDeduccionDialog
               empleado={agregandoA}
               onClose={() => setAgregandoA(null)}
            />
         )}

         {viendoTarifasDe && (
            <TarifasDialog
               empleado={viendoTarifasDe}
               readOnly={readOnly}
               onClose={() => setViendoTarifasDe(null)}
            />
         )}
      </div>
   );
}
