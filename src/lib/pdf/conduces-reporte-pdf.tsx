import React from "react";
import { pdf, StyleSheet } from "@react-pdf/renderer";
import type { ConduceDTO, ConduceFiltros } from "@/dtos/conduce.dto";
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
} from "./pdf-shared";

const c = StyleSheet.create({
   filtroChip: {
      backgroundColor: "#EEF3FC",
      borderRadius: 3,
      paddingVertical: 3,
      paddingHorizontal: 6,
      marginRight: 4,
      marginBottom: 4,
   },
   filtroText: { fontSize: 7.5, color: "#1E3A8A" },
   filtroLabel: { fontFamily: "Helvetica-Bold" },
   filtrosWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 2, marginBottom: 2 },

   grpEquipo: { flex: 1.4 },
   grpUnidad: { width: 60 },
   grpConduces: { width: 55, textAlign: "right" },
   grpCant: { width: 60, textAlign: "right" },
   grpSub: { width: 78, textAlign: "right" },

   detRef: { width: 48 },
   detFecha: { width: 45 },
   detCliente: { flex: 1 },
   detProyecto: { flex: 1 },
   detEquipo: { flex: 1 },
   detOperador: { width: 72 },
   detDetalle: { flex: 1.1 },
   detCant: { width: 42, textAlign: "right" },
   detPrecio: { width: 55, textAlign: "right" },
   detSub: { width: 62, textAlign: "right" },
});

/** Etiquetas legibles de los filtros aplicados, para dejarlos impresos en el PDF. */
export interface FiltrosEtiquetados {
   cliente?: string;
   proyecto?: string;
   empleado?: string;
   equipo?: string;
}

function describirFiltros(
   filtros: ConduceFiltros,
   etiquetas: FiltrosEtiquetados
): { label: string; value: string }[] {
   const out: { label: string; value: string }[] = [];

   if (etiquetas.cliente) out.push({ label: "Cliente", value: etiquetas.cliente });
   if (etiquetas.proyecto) out.push({ label: "Proyecto", value: etiquetas.proyecto });
   if (etiquetas.empleado) out.push({ label: "Operador", value: etiquetas.empleado });
   if (etiquetas.equipo) out.push({ label: "Equipo", value: etiquetas.equipo });

   if (filtros.tipo_conduce) {
      out.push({
         label: "Tipo",
         value: filtros.tipo_conduce === "CAMION" ? "Camión" : "Equipo pesado",
      });
   }
   if (filtros.es_cobrable !== undefined) {
      out.push({ label: "Cobrable", value: filtros.es_cobrable ? "Sí" : "No" });
   }
   if (filtros.fecha_desde || filtros.fecha_hasta) {
      const desde = filtros.fecha_desde ? fmtDate(filtros.fecha_desde) : "inicio";
      const hasta = filtros.fecha_hasta ? fmtDate(filtros.fecha_hasta) : "hoy";
      out.push({ label: "Período", value: `${desde} — ${hasta}` });
   }
   if (filtros.busqueda) out.push({ label: "Búsqueda", value: filtros.busqueda });

   return out;
}

/**
 * Reporte de conduces según los filtros activos en el listado. Imprime el
 * detalle línea por línea más un resumen agrupado por equipo.
 */
function ConducesReporteDocument({
   conduces,
   filtros,
   etiquetas,
}: {
   conduces: ConduceDTO[];
   filtros: ConduceFiltros;
   etiquetas: FiltrosEtiquetados;
}) {
   const chips = describirFiltros(filtros, etiquetas);
   const grupos = agruparConduces(conduces);

   const cobrables = conduces.filter((cc) => cc.es_cobrable);
   const noCobrables = conduces.filter((cc) => !cc.es_cobrable);
   const totalCobrable = sumaSubtotal(cobrables);
   const totalNoCobrable = sumaSubtotal(noCobrables);

   const camiones = conduces.filter((cc) => cc.tipo_conduce === "CAMION");
   const totalHoras = conduces.reduce(
      (acc, cc) => acc + (cc.tipo_conduce === "EQUIPO_PESADO" ? cc.total_horas : 0),
      0
   );

   // Se ordena por fecha para que el reporte lea como una bitácora.
   const ordenados = [...conduces].sort((a, b) => a.fecha.localeCompare(b.fecha));

   return (
      <Document>
         <Page size="A4" orientation="landscape" style={s.page}>
            <PdfHeader title="REPORTE DE CONDUCES" subtitle={fmtDate(new Date())} />

            <View style={s.body}>
               {/* Filtros aplicados — para que el papel diga de dónde salió */}
               <Text style={s.sectionTitle}>Filtros aplicados</Text>
               {chips.length > 0 ? (
                  <View style={c.filtrosWrap}>
                     {chips.map((chip) => (
                        <View key={chip.label} style={c.filtroChip}>
                           <Text style={c.filtroText}>
                              <Text style={c.filtroLabel}>{chip.label}: </Text>
                              {chip.value}
                           </Text>
                        </View>
                     ))}
                  </View>
               ) : (
                  <Text style={s.sectionNote}>Sin filtros — todos los conduces registrados.</Text>
               )}

               {/* Indicadores */}
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
                     <Text style={s.statLabel}>Total cobrable</Text>
                     <Text style={s.statValue}>{fmt(totalCobrable)}</Text>
                  </View>
               </View>

               {/* Resumen agrupado */}
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
                  {grupos.length === 0 && (
                     <Text style={s.emptyNote}>Ningún conduce coincide con estos filtros.</Text>
                  )}
               </View>

               {/* Detalle */}
               {ordenados.length > 0 && (
                  <>
                     <Text style={s.sectionTitle} break={grupos.length > 12}>
                        Detalle de conduces
                     </Text>
                     <View style={s.table}>
                        <View style={s.tableHead} fixed>
                           <Text style={[s.tableHeadCell, c.detRef]}>Ref.</Text>
                           <Text style={[s.tableHeadCell, c.detFecha]}>Fecha</Text>
                           <Text style={[s.tableHeadCell, c.detCliente]}>Cliente</Text>
                           <Text style={[s.tableHeadCell, c.detProyecto]}>Proyecto</Text>
                           <Text style={[s.tableHeadCell, c.detEquipo]}>Equipo</Text>
                           <Text style={[s.tableHeadCell, c.detOperador]}>Operador</Text>
                           <Text style={[s.tableHeadCell, c.detDetalle]}>Detalle</Text>
                           <Text style={[s.tableHeadCell, c.detCant]}>Cant.</Text>
                           <Text style={[s.tableHeadCell, c.detPrecio]}>P. Unit.</Text>
                           <Text style={[s.tableHeadCell, c.detSub]}>Subtotal</Text>
                        </View>

                        {ordenados.map((cc, i) => (
                           <View
                              key={cc.id}
                              style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                              wrap={false}
                           >
                              <Text style={[s.tableCell, c.detRef]}>{cc.numero_referencia}</Text>
                              <Text style={[s.tableCell, c.detFecha]}>{fmtDateShort(cc.fecha)}</Text>
                              <Text style={[s.tableCell, c.detCliente]}>{cc.cliente_nombre ?? "—"}</Text>
                              <Text style={[s.tableCell, c.detProyecto]}>
                                 {cc.proyecto_nombre ?? "Sin asignar"}
                              </Text>
                              <Text style={[s.tableCell, c.detEquipo]}>{cc.equipo_nombre ?? "—"}</Text>
                              <Text style={[s.tableCell, c.detOperador]}>{cc.operador_nombre ?? "—"}</Text>
                              <Text style={[s.tableCell, c.detDetalle]}>
                                 {cc.tipo_conduce === "CAMION"
                                    ? `${cc.procedencia} → ${cc.destino}`
                                    : `${fmtNum(cc.total_horas)} h`}
                              </Text>
                              <Text style={[s.tableCell, c.detCant]}>{fmtNum(cantidadDe(cc))}</Text>
                              <Text style={[s.tableCell, c.detPrecio]}>{fmt(cc.precio_unitario)}</Text>
                              <Text
                                 style={[
                                    s.tableCell,
                                    c.detSub,
                                    cc.es_cobrable ? {} : { color: "#9CA3AF" },
                                 ]}
                              >
                                 {fmt(cc.subtotal)}
                              </Text>
                           </View>
                        ))}

                        <View style={s.tableFoot}>
                           <Text style={[s.tableFootCell, { flex: 1 }]}>
                              {conduces.length} conduce{conduces.length === 1 ? "" : "s"}
                           </Text>
                           <Text style={[s.tableFootCell, c.detSub]}>
                              {fmt(totalCobrable + totalNoCobrable)}
                           </Text>
                        </View>
                     </View>
                  </>
               )}

               {/* Totales */}
               <View style={s.totalBox}>
                  <View style={s.totalRow}>
                     <Text style={s.totalLabel}>Cobrable ({cobrables.length})</Text>
                     <Text style={s.totalValue}>{fmt(totalCobrable)}</Text>
                  </View>
                  {noCobrables.length > 0 && (
                     <View style={s.totalRow}>
                        <Text style={s.totalLabel}>No cobrable ({noCobrables.length})</Text>
                        <Text style={s.totalValue}>{fmt(totalNoCobrable)}</Text>
                     </View>
                  )}
                  <View style={[s.totalRow, s.totalRowFinal]}>
                     <Text style={s.totalLabelFinal}>TOTAL</Text>
                     <Text style={s.totalValueFinal}>{fmt(totalCobrable + totalNoCobrable)}</Text>
                  </View>
               </View>
            </View>

            <PdfFooter nota="Reporte" />
         </Page>
      </Document>
   );
}

export async function generateConducesReportePDF(
   conduces: ConduceDTO[],
   filtros: ConduceFiltros,
   etiquetas: FiltrosEtiquetados = {}
): Promise<void> {
   const blob = await pdf(
      <ConducesReporteDocument conduces={conduces} filtros={filtros} etiquetas={etiquetas} />
   ).toBlob();

   const hoy = new Date().toISOString().slice(0, 10);
   descargar(blob, `reporte-conduces-${hoy}.pdf`);
}
