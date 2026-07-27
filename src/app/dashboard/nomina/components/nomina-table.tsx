"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, TriangleAlert, Loader2, Plus } from "lucide-react";
import { useNominaStore, type NominaEmpleado } from "@/stores/useNominaStore";
import { AgregarDeduccionDialog } from "./agregar-deduccion-dialog";

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


/**
 * "Precio por viaje u hora" no es un solo número: un chofer puede tener varias
 * tarifas en el mismo ciclo. Si todas coinciden se muestra un único precio; si
 * no, se muestra "Varios" y se puede desplegar el desglose.
 */
function PrecioUnitario({ empleado }: { empleado: NominaEmpleado }) {
   const tarifas = empleado.tarifas ?? [];
   if (tarifas.length === 0) return <span className="text-muted-foreground">—</span>;

   const precios = [...new Set(tarifas.map((t) => t.monto_pago))];
   if (precios.length === 1) return <span>{money(precios[0])}</span>;

   return (
      <span className="text-muted-foreground">
         Varios <span className="text-xs">({precios.length})</span>
      </span>
   );
}

function FilaDesglose({ empleado }: { empleado: NominaEmpleado }) {
   const tarifas = empleado.tarifas ?? [];
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

   return (
      <div className="px-6 py-4">
         <table className="w-full text-sm">
            <thead>
               <tr className="text-xs uppercase text-muted-foreground">
                  <th className="pb-2 text-left font-semibold">Tarifa</th>
                  <th className="pb-2 text-left font-semibold">Medida</th>
                  <th className="pb-2 text-right font-semibold">Cantidad</th>
                  <th className="pb-2 text-right font-semibold">Precio unit.</th>
                  <th className="pb-2 text-right font-semibold">Subtotal</th>
               </tr>
            </thead>
            <tbody>
               {tarifas.map((t, i) => (
                  <tr key={i} className="border-t border-border/50">
                     <td className="py-2">{t.categoria_equipo_tarifa_nombre}</td>
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
                  <td className="py-2" colSpan={4}>
                     Devengado por producción
                  </td>
                  <td className="py-2 text-right">{money(empleado.devengado_tarifas)}</td>
               </tr>
               {empleado.complemento_minimo > 0 && (
                  <tr className="text-blue-600">
                     <td className="py-2" colSpan={4}>
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

         {(empleado.detalle_deducciones?.length ?? 0) > 0 && (
            <div className="mt-4 border-t pt-3">
               <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Deducciones del período
               </p>
               <table className="w-full text-sm">
                  <tbody>
                     {empleado.detalle_deducciones!.map((d) => (
                        <tr key={d.id} className="border-t border-border/50">
                           <td className="py-2 text-muted-foreground">
                              {new Date(`${String(d.fecha).slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO")}
                           </td>
                           <td className="py-2">{d.concepto}</td>
                           <td className="py-2 text-right font-medium text-destructive">
                              − {money(d.monto_total)}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>
   );
}

export function NominaTable({ readOnly = false }: { readOnly?: boolean }) {
   const { empleados, loading, UpdateSeguro } = useNominaStore();
   const [abierto, setAbierto] = useState<string | null>(null);
   const [editando, setEditando] = useState<Record<string, string>>({});
   const [agregandoA, setAgregandoA] = useState<NominaEmpleado | null>(null);

   if (loading) {
      return (
         <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
         </div>
      );
   }

   if (empleados.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground">
            <p className="text-sm">Aún no se ha calculado la nómina de este ciclo.</p>
         </div>
      );
   }

   const totales = empleados.reduce(
      (acc, e) => ({
         devengado: acc.devengado + e.devengado_tarifas,
         complemento: acc.complemento + e.complemento_minimo,
         seguro: acc.seguro + e.seguro,
         deducciones: acc.deducciones + e.deducciones,
         neto: acc.neto + e.neto_pagar,
      }),
      { devengado: 0, complemento: 0, seguro: 0, deducciones: 0, neto: 0 }
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
                                 {e.total_conduces} conduce{e.total_conduces === 1 ? "" : "s"}
                                 {e.complemento_minimo > 0 && (
                                    <span className="text-blue-600">
                                       {" "}
                                       · complementado al mínimo
                                    </span>
                                 )}
                              </div>
                           </td>

                           <td className="px-3 py-3 text-right whitespace-nowrap">
                              <PrecioUnitario empleado={e} />
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
                              {(e.detalle_deducciones?.length ?? 0) > 0 && (
                                 <div className="text-[10px] text-muted-foreground">
                                    {e.detalle_deducciones!.length} concepto
                                    {e.detalle_deducciones!.length > 1 ? "s" : ""}
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
                              <td colSpan={7} className="p-0">
                                 <FilaDesglose empleado={e} />
                              </td>
                           </tr>
                        )}
                     </Fragment>
                  );
               })}
            </tbody>
            <tfoot>
               <tr className="border-t-2 bg-muted/30 font-bold">
                  <td className="px-3 py-3">Totales ({empleados.length})</td>
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
      </div>
   );
}
