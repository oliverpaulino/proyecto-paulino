import React from "react";
import { pdf, StyleSheet } from "@react-pdf/renderer";
import type { Proyecto } from "@/dtos/proyecto.dto";
import type { ConduceDTO } from "@/dtos/conduce.dto";
import {
   Document,
   Page,
   View,
   Text,
   PdfHeader,
   PdfFooter,
   s,
   fmt,
   fmtNum,
   fmtDate,
   fmtDateShort,
   cantidadDe,
   agruparConduces,
   sumaSubtotal,
   descargar,
   BRAND_BLUE,
} from "./pdf-shared";

const c = StyleSheet.create({
   colDesc: { flex: 1 },
   colQty: { width: 60, textAlign: "right" },
   colPrice: { width: 70, textAlign: "right" },
   colSub: { width: 75, textAlign: "right" },

   grpEquipo: { flex: 1.4 },
   grpUnidad: { width: 65 },
   grpConduces: { width: 55, textAlign: "right" },
   grpCant: { width: 60, textAlign: "right" },
   grpSub: { width: 75, textAlign: "right" },

   detRef: { width: 50 },
   detFecha: { width: 46 },
   detEquipo: { flex: 1.1 },
   detOperador: { flex: 1 },
   detDetalle: { flex: 1.2 },
   detCant: { width: 46, textAlign: "right" },
   detSub: { width: 62, textAlign: "right" },
   detCobrable: { width: 42, textAlign: "center" },
});

/**
 * Registro interno del proyecto: incluye TODO — lo cobrable, lo no cobrable,
 * la rentabilidad y el detalle completo de conduces. No se le entrega al cliente.
 */
function ProyectoInternoDocument({
   proyecto,
   conduces,
}: {
   proyecto: Proyecto;
   conduces: ConduceDTO[];
}) {
   const cargosCobrables = (proyecto.gastos ?? []).filter((g) => g.cobrable_proyecto);
   const gastosInternos = (proyecto.gastos ?? []).filter((g) => !g.cobrable_proyecto);

   const conducesCobrables = conduces.filter((cc) => cc.es_cobrable);
   const conducesNoCobrables = conduces.filter((cc) => !cc.es_cobrable);
   const grupos = agruparConduces(conduces);

   const totalConducesCobrables = sumaSubtotal(conducesCobrables);
   const totalConducesNoCobrables = sumaSubtotal(conducesNoCobrables);

   // Métricas operativas: viajes/metros de camión y horas de equipo pesado no
   // son la misma unidad, así que se cuentan por separado.
   const camiones = conduces.filter((cc) => cc.tipo_conduce === "CAMION");
   const equiposPesados = conduces.filter((cc) => cc.tipo_conduce === "EQUIPO_PESADO");
   const totalHoras = equiposPesados.reduce(
      (acc, cc) => acc + (cc.tipo_conduce === "EQUIPO_PESADO" ? cc.total_horas : 0),
      0
   );

   const fechas = conduces
      .map((cc) => cc.fecha)
      .sort((a, b) => a.localeCompare(b));

   return (
      <Document>
         <Page size="A4" style={s.page}>
            <PdfHeader title="REGISTRO INTERNO" subtitle={`Proyecto #${proyecto.id.slice(0, 8)}`} />

            <View style={s.body}>
               {/* ── Información general del proyecto ── */}
               <Text style={s.sectionTitle}>Información general</Text>
               <View style={s.metaGrid}>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Proyecto:</Text>
                     <Text style={s.metaValue}>{proyecto.nombre}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Cliente:</Text>
                     <Text style={s.metaValue}>{proyecto.cliente_nombre ?? proyecto.cliente_id}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Estado:</Text>
                     <Text style={s.metaValue}>{proyecto.estado}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Tarifa servicio:</Text>
                     <Text style={s.metaValue}>{fmt(proyecto.tarifa_servicio)}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Fecha inicio:</Text>
                     <Text style={s.metaValue}>{fmtDate(proyecto.fecha_inicio)}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Fecha fin:</Text>
                     <Text style={s.metaValue}>
                        {proyecto.fecha_fin ? fmtDate(proyecto.fecha_fin) : "En curso"}
                     </Text>
                  </View>
                  {fechas.length > 0 && (
                     <View style={s.metaCell}>
                        <Text style={s.metaLabel}>Actividad:</Text>
                        <Text style={s.metaValue}>
                           {fmtDate(fechas[0])} — {fmtDate(fechas[fechas.length - 1])}
                        </Text>
                     </View>
                  )}
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Registrado:</Text>
                     <Text style={s.metaValue}>{fmtDate(proyecto.created_at)}</Text>
                  </View>
               </View>

               {/* ── Indicadores operativos ── */}
               <View style={s.statsRow}>
                  <View style={s.statBox}>
                     <Text style={s.statLabel}>Conduces</Text>
                     <Text style={s.statValue}>{conduces.length}</Text>
                  </View>
                  <View style={s.statBox}>
                     <Text style={s.statLabel}>Viajes de camión</Text>
                     <Text style={s.statValue}>{camiones.length}</Text>
                  </View>
                  <View style={s.statBox}>
                     <Text style={s.statLabel}>Horas equipo pesado</Text>
                     <Text style={s.statValue}>{fmtNum(totalHoras)}</Text>
                  </View>
                  <View style={s.statBox}>
                     <Text style={s.statLabel}>No cobrables</Text>
                     <Text style={s.statValue}>{conducesNoCobrables.length}</Text>
                  </View>
               </View>

               {/* ── Resumen por equipo ── */}
               <Text style={s.sectionTitle}>Resumen por equipo</Text>
               <View style={s.table}>
                  <View style={s.tableHead}>
                     <Text style={[s.tableHeadCell, c.grpEquipo]}>Equipo / Tarifa</Text>
                     <Text style={[s.tableHeadCell, c.grpUnidad]}>Unidad</Text>
                     <Text style={[s.tableHeadCell, c.grpConduces]}>Conduces</Text>
                     <Text style={[s.tableHeadCell, c.grpCant]}>Cant.</Text>
                     <Text style={[s.tableHeadCell, c.grpSub]}>Subtotal</Text>
                  </View>
                  {grupos.map((g, i) => (
                     <View key={g.clave} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                        <Text style={[s.tableCell, c.grpEquipo]}>
                           {g.equipo_nombre}
                           {g.tarifa_nombre ? ` — ${g.tarifa_nombre}` : ""}
                        </Text>
                        <Text style={[s.tableCell, c.grpUnidad]}>{g.unidad}</Text>
                        <Text style={[s.tableCell, c.grpConduces]}>{g.conduces.length}</Text>
                        <Text style={[s.tableCell, c.grpCant]}>{fmtNum(g.cantidad)}</Text>
                        <Text style={[s.tableCell, c.grpSub]}>{fmt(g.subtotal)}</Text>
                     </View>
                  ))}
                  {grupos.length === 0 && <Text style={s.emptyNote}>Sin conduces registrados.</Text>}
                  {grupos.length > 0 && (
                     <View style={s.tableFoot}>
                        <Text style={[s.tableFootCell, { flex: 1 }]}>Total</Text>
                        <Text style={[s.tableFootCell, c.grpSub]}>
                           {fmt(totalConducesCobrables + totalConducesNoCobrables)}
                        </Text>
                     </View>
                  )}
               </View>

               {/* ── Cargos cobrables ── */}
               {cargosCobrables.length > 0 && (
                  <>
                     <Text style={s.sectionTitle}>Cargos cobrables</Text>
                     <View style={s.table}>
                        <View style={s.tableHead}>
                           <Text style={[s.tableHeadCell, c.colDesc]}>Descripción</Text>
                           <Text style={[s.tableHeadCell, c.colQty]}>Cant.</Text>
                           <Text style={[s.tableHeadCell, c.colPrice]}>P. Unit.</Text>
                           <Text style={[s.tableHeadCell, c.colSub]}>Subtotal</Text>
                        </View>
                         {cargosCobrables.map((cargo, i) => (
                            <View key={cargo.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                               <Text style={[s.tableCell, c.colDesc]}>{cargo.concepto}</Text>
                               <Text style={[s.tableCell, c.colQty]}>{fmtNum(cargo.cantidad ?? 1)}</Text>
                               <Text style={[s.tableCell, c.colPrice]}>
                                  {fmt(cargo.monto_unitario ?? cargo.cobrable_monto ?? cargo.monto_total)}
                               </Text>
                               <Text style={[s.tableCell, c.colSub]}>
                                  {fmt(Number(cargo.cobrable_monto ?? cargo.monto_total))}
                               </Text>
                            </View>
                         ))}
                     </View>
                  </>
               )}

               {/* ── Gastos internos ── */}
               {gastosInternos.length > 0 && (
                  <>
                     <Text style={s.sectionTitle}>Gastos internos (no cobrables)</Text>
                     <View style={s.table}>
                        <View style={s.tableHead}>
                           <Text style={[s.tableHeadCell, c.colDesc]}>Descripción</Text>
                           <Text style={[s.tableHeadCell, c.colQty]}>Cant.</Text>
                           <Text style={[s.tableHeadCell, c.colPrice]}>P. Unit.</Text>
                           <Text style={[s.tableHeadCell, c.colSub]}>Subtotal</Text>
                        </View>
                         {gastosInternos.map((g, i) => (
                            <View key={g.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                               <Text style={[s.tableCell, c.colDesc]}>{g.concepto}</Text>
                               <Text style={[s.tableCell, c.colQty]}>{fmtNum(g.cantidad ?? 1)}</Text>
                               <Text style={[s.tableCell, c.colPrice]}>
                                  {fmt(g.monto_unitario ?? g.monto_total)}
                               </Text>
                               <Text style={[s.tableCell, c.colSub]}>{fmt(Number(g.monto_total))}</Text>
                            </View>
                         ))}
                     </View>
                  </>
               )}

               {/* ── Resumen financiero ── */}
               <View style={s.resumenBox}>
                  <View style={s.resumenRow}>
                     <Text style={s.resumenLabel}>Tarifa del servicio</Text>
                     <Text style={s.resumenValue}>{fmt(proyecto.tarifa_servicio)}</Text>
                  </View>
                  <View style={s.resumenRow}>
                     <Text style={s.resumenLabel}>Conduces cobrables</Text>
                     <Text style={s.resumenValue}>{fmt(totalConducesCobrables)}</Text>
                  </View>
                  <View style={s.resumenRow}>
                     <Text style={s.resumenLabel}>Conduces no cobrables (solo historial)</Text>
                     <Text style={s.resumenValue}>{fmt(totalConducesNoCobrables)}</Text>
                  </View>
                  <View style={s.resumenRow}>
                     <Text style={s.resumenLabel}>Total cobrable</Text>
                     <Text style={s.resumenValue}>{fmt(proyecto.total_cobrable)}</Text>
                  </View>
                  <View style={s.resumenRow}>
                     <Text style={s.resumenLabel}>Total gasto interno</Text>
                     <Text style={s.resumenValue}>{fmt(proyecto.total_gasto_interno)}</Text>
                  </View>
                  <View style={[s.resumenRow, s.resumenTotal]}>
                     <Text style={[s.resumenLabel, { fontFamily: "Helvetica-Bold" }]}>Rentabilidad</Text>
                     <Text
                        style={[
                           s.resumenValue,
                           { color: proyecto.rentabilidad >= 0 ? "#15803D" : "#DC2626" },
                        ]}
                     >
                        {fmt(proyecto.rentabilidad)}
                     </Text>
                  </View>
               </View>

               {proyecto.notas && (
                  <View style={{ marginTop: 10 }}>
                     <Text style={s.sectionTitle}>Notas</Text>
                     <Text style={{ fontSize: 8, color: "#3C3C3C" }}>{proyecto.notas}</Text>
                  </View>
               )}
            </View>

            <PdfFooter nota="Documento interno" />
         </Page>

         {/* ── Detalle completo de conduces ── */}
         {conduces.length > 0 && (
            <Page size="A4" style={s.page}>
               <PdfHeader title="DETALLE DE CONDUCES" subtitle={`Proyecto #${proyecto.id.slice(0, 8)}`} />

               <View style={s.body}>
                  <Text style={s.sectionTitle}>Todos los conduces del proyecto</Text>
                  <Text style={s.sectionNote}>
                     Incluye cobrables y no cobrables. {conduces.length} registro
                     {conduces.length === 1 ? "" : "s"}.
                  </Text>

                  <View style={s.table}>
                     <View style={s.tableHead} fixed>
                        <Text style={[s.tableHeadCell, c.detRef]}>Ref.</Text>
                        <Text style={[s.tableHeadCell, c.detFecha]}>Fecha</Text>
                        <Text style={[s.tableHeadCell, c.detEquipo]}>Equipo</Text>
                        <Text style={[s.tableHeadCell, c.detOperador]}>Operador</Text>
                        <Text style={[s.tableHeadCell, c.detDetalle]}>Detalle</Text>
                        <Text style={[s.tableHeadCell, c.detCant]}>Cant.</Text>
                        <Text style={[s.tableHeadCell, c.detSub]}>Subtotal</Text>
                        <Text style={[s.tableHeadCell, c.detCobrable]}>Cobr.</Text>
                     </View>

                     {conduces.map((cc, i) => (
                        <View key={cc.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]} wrap={false}>
                           <Text style={[s.tableCell, c.detRef]}>{cc.numero_referencia}</Text>
                           <Text style={[s.tableCell, c.detFecha]}>{fmtDateShort(cc.fecha)}</Text>
                           <Text style={[s.tableCell, c.detEquipo]}>{cc.equipo_nombre ?? "—"}</Text>
                           <Text style={[s.tableCell, c.detOperador]}>{cc.operador_nombre ?? "—"}</Text>
                           <Text style={[s.tableCell, c.detDetalle]}>
                              {cc.tipo_conduce === "CAMION"
                                 ? `${cc.procedencia} → ${cc.destino}`
                                 : `${fmtNum(cc.total_horas)} h`}
                           </Text>
                           <Text style={[s.tableCell, c.detCant]}>{fmtNum(cantidadDe(cc))}</Text>
                           <Text style={[s.tableCell, c.detSub]}>{fmt(cc.subtotal)}</Text>
                           <Text
                              style={[
                                 s.tableCell,
                                 c.detCobrable,
                                 { color: cc.es_cobrable ? "#15803D" : "#DC2626" },
                              ]}
                           >
                              {cc.es_cobrable ? "Sí" : "No"}
                           </Text>
                        </View>
                     ))}

                     <View style={s.tableFoot}>
                        <Text style={[s.tableFootCell, { flex: 1 }]}>Total general</Text>
                        <Text style={[s.tableFootCell, c.detSub]}>
                           {fmt(totalConducesCobrables + totalConducesNoCobrables)}
                        </Text>
                        <Text style={[s.tableFootCell, c.detCobrable]} />
                     </View>
                  </View>

                  <Text style={[s.sectionNote, { marginTop: 8, color: BRAND_BLUE }]}>
                     Solo los conduces marcados como cobrables se incluyen en la factura del cliente.
                  </Text>
               </View>

               <PdfFooter nota="Documento interno" />
            </Page>
         )}
      </Document>
   );
}

export async function generateProyectoInternoPDF(
   proyecto: Proyecto,
   conduces?: ConduceDTO[]
): Promise<void> {
   const lista = conduces ?? proyecto.conduces ?? [];
   const blob = await pdf(
      <ProyectoInternoDocument proyecto={proyecto} conduces={lista} />
   ).toBlob();

   const nombre = proyecto.nombre || proyecto.id.slice(0, 8);
   descargar(blob, `proyecto-interno-${nombre.replace(/[^\w\-]+/g, "-").toLowerCase()}.pdf`);
}
