import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { NominaEmpleado, PayrollCycle } from "@/stores/useNominaStore";

const COMPANY_NAME = "Constructora Kissimmee";
const COMPANY_TAGLINE = "Construcción con Excelencia";
const BRAND_BLUE = "#003B96";
const BRAND_YELLOW = "#FBBF24";

function fmt(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function fmtDate(value: string | Date): string {
   // Se ancla al mediodía para que una fecha "YYYY-MM-DD" no retroceda un día
   // al interpretarse como UTC.
   const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
   return d.toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
}

const s = StyleSheet.create({
   page: { fontFamily: "Helvetica", fontSize: 9, color: "#323232", paddingBottom: 60 },
   header: {
      backgroundColor: BRAND_BLUE, flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", paddingHorizontal: 15, paddingVertical: 12, height: 90,
   },
   headerLeft: { flexDirection: "row" },
   headerRight: { flexDirection: "column", alignItems: "flex-end" },
   logo: { width: 150, height: 100, objectFit: "contain", marginBottom: 2 },
   companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
   tagline: { fontSize: 8, color: "#C8DCF0" },
   docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND_YELLOW },
   docId: { fontSize: 8, color: "#C8DCF0" },
   accentLine: { backgroundColor: BRAND_YELLOW, height: 2, marginHorizontal: 15, marginTop: 8, marginBottom: 6 },
   body: { paddingHorizontal: 15 },
   sectionTitle: {
      fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND_BLUE,
      marginTop: 12, marginBottom: 4, textTransform: "uppercase",
   },
   metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
   metaCell: { width: "50%", flexDirection: "row", marginBottom: 6 },
   metaLabel: { fontFamily: "Helvetica-Bold", color: BRAND_BLUE, marginRight: 4, minWidth: 90 },
   metaValue: { color: "#3C3C3C", flex: 1 },
   table: { marginTop: 2 },
   tableHead: { flexDirection: "row", backgroundColor: BRAND_BLUE, paddingVertical: 5, paddingHorizontal: 4 },
   tableHeadCell: { fontFamily: "Helvetica-Bold", color: "#FFFFFF", fontSize: 8 },
   tableRow: {
      flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4,
      borderBottomWidth: 0.5, borderBottomColor: "#E0E0E0",
   },
   tableRowAlt: { backgroundColor: "#F8FAFF" },
   tableCell: { fontSize: 8, color: "#3C3C3C" },
   tableFoot: { flexDirection: "row", backgroundColor: "#F0F0F0", paddingVertical: 5, paddingHorizontal: 4 },
   tableFootCell: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#141414" },

   // Columnas de la tabla de nómina
   colNombre: { flex: 1.5 },
   colModalidad: { width: 60 },
   colMonto: { width: 62, textAlign: "right" },
   colNeto: { width: 68, textAlign: "right" },

   // Columnas del desglose por tarifa
   colTarifa: { flex: 1.4 },
   colMedida: { width: 60 },
   colQty: { width: 45, textAlign: "right" },
   colPrecio: { width: 62, textAlign: "right" },
   colSub: { width: 68, textAlign: "right" },

   resumenBox: { marginTop: 12, backgroundColor: "#F8FAFF", borderRadius: 4, padding: 10 },
   resumenRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
   resumenLabel: { fontSize: 9, color: "#505050" },
   resumenValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#141414" },
   resumenTotal: { borderTopWidth: 0.8, borderTopColor: "#C8DCF0", marginTop: 4, paddingTop: 4 },

   avisoBox: {
      marginTop: 8, backgroundColor: "#FFFBEB", borderRadius: 4, padding: 8,
      borderLeftWidth: 2, borderLeftColor: BRAND_YELLOW,
   },
   avisoText: { fontSize: 7.5, color: "#92400E" },

   detalleTitulo: {
      fontSize: 9, fontFamily: "Helvetica-Bold", color: BRAND_BLUE,
      marginTop: 10, marginBottom: 3,
   },
   detalleSub: { fontSize: 7.5, color: "#787878", marginBottom: 3 },
   firmaFila: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
   firmaLinea: { width: "45%", borderTopWidth: 0.8, borderTopColor: "#787878", paddingTop: 3 },
   firmaTexto: { fontSize: 7.5, color: "#505050", textAlign: "center" },

   footer: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: BRAND_BLUE, paddingVertical: 5, alignItems: "center",
   },
   footerText: { fontSize: 7, color: "#C8DCF0" },
});

const bruto = (e: NominaEmpleado) => e.devengado_tarifas + e.complemento_minimo;

/** Volante individual: el desglose de un empleado. */
function DetalleEmpleado({ e }: { e: NominaEmpleado }) {
   const esFijo = e.modalidad === "FIJO";
   const tarifas = e.tarifas ?? [];
   const deducciones = e.detalle_deducciones ?? [];

   return (
      <View wrap={false}>
         <Text style={s.detalleTitulo}>{e.empleado_nombre ?? "—"}</Text>
         <Text style={s.detalleSub}>
            {esFijo
               ? `Salario fijo${e.rol ? ` · ${e.rol}` : ""}`
               : `Chofer · ${e.total_conduces} conduce${e.total_conduces === 1 ? "" : "s"}`}
         </Text>

         {esFijo ? (
            <View style={s.table}>
               <View style={s.tableRow}>
                  <Text style={[s.tableCell, { flex: 1 }]}>Salario del período</Text>
                  <Text style={[s.tableCell, s.colSub, { fontFamily: "Helvetica-Bold" }]}>
                     {fmt(e.complemento_minimo)}
                  </Text>
               </View>
            </View>
         ) : (
            <View style={s.table}>
               <View style={s.tableHead}>
                  <Text style={[s.tableHeadCell, s.colTarifa]}>Tarifa</Text>
                  <Text style={[s.tableHeadCell, s.colMedida]}>Medida</Text>
                  <Text style={[s.tableHeadCell, s.colQty]}>Cant.</Text>
                  <Text style={[s.tableHeadCell, s.colPrecio]}>P. Unit.</Text>
                  <Text style={[s.tableHeadCell, s.colSub]}>Subtotal</Text>
               </View>

               {tarifas.length === 0 ? (
                  <View style={s.tableRow}>
                     <Text style={[s.tableCell, { flex: 1, color: "#787878" }]}>
                        Sin conduces en este período.
                     </Text>
                  </View>
               ) : (
                  tarifas.map((t, i) => (
                     <View key={i} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                        <Text style={[s.tableCell, s.colTarifa]}>
                           {t.categoria_equipo_tarifa_nombre}
                        </Text>
                        <Text style={[s.tableCell, s.colMedida]}>
                           {t.medida_cobro_nombre ?? "—"}
                        </Text>
                        <Text style={[s.tableCell, s.colQty]}>
                           {t.cantidad.toLocaleString("es-DO")}
                        </Text>
                        <Text style={[s.tableCell, s.colPrecio]}>
                           {t.monto_pago === 0 ? "sin tarifa" : fmt(t.monto_pago)}
                        </Text>
                        <Text style={[s.tableCell, s.colSub]}>{fmt(t.subtotal)}</Text>
                     </View>
                  ))
               )}

               <View style={s.tableFoot}>
                  <Text style={[s.tableFootCell, { flex: 1 }]}>Devengado por producción</Text>
                  <Text style={[s.tableFootCell, s.colSub]}>{fmt(e.devengado_tarifas)}</Text>
               </View>
            </View>
         )}

         {/* El complemento solo se explica en producción: para un asalariado
             el "complemento" ES su sueldo y ya se mostró arriba. */}
         {!esFijo && e.complemento_minimo > 0 && (
            <View style={[s.tableRow, { backgroundColor: "#F8FAFF" }]}>
               <Text style={[s.tableCell, { flex: 1, color: BRAND_BLUE }]}>
                  Complemento para alcanzar el mínimo de {fmt(e.minimo_garantizado)}
               </Text>
               <Text style={[s.tableCell, s.colSub, { color: BRAND_BLUE, fontFamily: "Helvetica-Bold" }]}>
                  {fmt(e.complemento_minimo)}
               </Text>
            </View>
         )}

         {deducciones.length > 0 && (
            <>
               <Text style={[s.detalleSub, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>
                  Deducciones del período
               </Text>
               {deducciones.map((d, i) => (
                  <View key={d.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                     <Text style={[s.tableCell, { width: 70 }]}>{fmtDate(d.fecha)}</Text>
                     <Text style={[s.tableCell, { flex: 1 }]}>
                        {d.concepto}
                        {d.cuotas_sugeridas > 1
                           ? ` · cuota ${d.cuotas_aplicadas} de ${d.cuotas_sugeridas}`
                           : ""}
                     </Text>
                     <Text style={[s.tableCell, s.colSub, { color: "#DC2626" }]}>
                        - {fmt(d.monto_periodo)}
                     </Text>
                  </View>
               ))}
            </>
         )}

         <View style={s.resumenBox}>
            <View style={s.resumenRow}>
               <Text style={s.resumenLabel}>Bruto</Text>
               <Text style={s.resumenValue}>{fmt(bruto(e))}</Text>
            </View>
            {e.seguro > 0 && (
               <View style={s.resumenRow}>
                  <Text style={s.resumenLabel}>Seguro</Text>
                  <Text style={[s.resumenValue, { color: "#DC2626" }]}>- {fmt(e.seguro)}</Text>
               </View>
            )}
            {/*
               Las deducciones se muestran como un solo total aquí y detalladas
               línea por línea arriba: el volante es el comprobante que recibe
               el empleado y debe poder cuadrar cada descuento.
            */}
            {e.deducciones > 0 && (
               <View style={s.resumenRow}>
                  <Text style={s.resumenLabel}>Deducciones</Text>
                  <Text style={[s.resumenValue, { color: "#DC2626" }]}>- {fmt(e.deducciones)}</Text>
               </View>
            )}
            <View style={[s.resumenRow, s.resumenTotal]}>
               <Text style={[s.resumenLabel, { fontFamily: "Helvetica-Bold" }]}>Neto a pagar</Text>
               <Text style={[s.resumenValue, { color: e.neto_pagar >= 0 ? "#15803D" : "#DC2626" }]}>
                  {fmt(e.neto_pagar)}
               </Text>
            </View>
            {e.deuda_pendiente > 0 && (
               <View style={s.resumenRow}>
                  <Text style={[s.resumenLabel, { fontSize: 7.5 }]}>
                     Deuda pendiente tras este pago
                  </Text>
                  <Text style={[s.resumenValue, { fontSize: 7.5, color: "#787878" }]}>
                     {fmt(e.deuda_pendiente)}
                  </Text>
               </View>
            )}
         </View>

         {e.conduces_inferidos > 0 && (
            <View style={s.avisoBox}>
               <Text style={s.avisoText}>
                  {e.conduces_inferidos} conduce{e.conduces_inferidos === 1 ? "" : "s"} sin chofer
                  registrado, atribuido{e.conduces_inferidos === 1 ? "" : "s"} según el operador
                  asignado al equipo. Verificar antes de pagar.
               </Text>
            </View>
         )}
      </View>
   );
}

/** Exportado para poder renderizarlo fuera del navegador (pruebas). */
export function NominaDocument({
   ciclo,
   empleados,
}: {
   ciclo: PayrollCycle;
   empleados: NominaEmpleado[];
}) {
   const totales = empleados.reduce(
      (a, e) => ({
         bruto: a.bruto + bruto(e),
         seguro: a.seguro + e.seguro,
         deducciones: a.deducciones + e.deducciones,
         neto: a.neto + e.neto_pagar,
      }),
      { bruto: 0, seguro: 0, deducciones: 0, neto: 0 }
   );

   const choferes = empleados.filter((e) => e.modalidad === "PRODUCCION").length;
   const asalariados = empleados.length - choferes;
   // Un PDF por empleado no necesita el resumen general: sería una tabla de
   // una fila repitiendo lo que ya dice el volante.
   const soloUno = empleados.length === 1;

   return (
      <Document>
         <Page size="A4" style={s.page}>
            <View style={s.header}>
               <View style={s.headerLeft}>
                  <Image style={s.logo} src="/logo-kissimmee.png" />
                  <View style={{ flexDirection: "column", marginLeft: 8, justifyContent: "center" }}>
                     <Text style={s.companyName}>{COMPANY_NAME}</Text>
                     <Text style={s.tagline}>{COMPANY_TAGLINE}</Text>
                  </View>
               </View>
               <View style={s.headerRight}>
                  <Text style={s.docTitle}>NÓMINA</Text>
                  <Text style={s.docId}>{ciclo.nombre}</Text>
               </View>
            </View>

            <View style={s.accentLine} />

            <View style={s.body}>
               <View style={s.metaGrid}>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Período:</Text>
                     <Text style={s.metaValue}>
                        {fmtDate(ciclo.fecha_inicio)} — {fmtDate(ciclo.fecha_fin)}
                     </Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Frecuencia:</Text>
                     <Text style={s.metaValue}>{ciclo.frecuencia}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Estado:</Text>
                     <Text style={s.metaValue}>{ciclo.estado}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Empleados:</Text>
                     <Text style={s.metaValue}>
                        {empleados.length} ({choferes} chofer{choferes === 1 ? "" : "es"},{" "}
                        {asalariados} asalariado{asalariados === 1 ? "" : "s"})
                     </Text>
                  </View>
               </View>

               {!soloUno && (
                  <>
                     <Text style={s.sectionTitle}>Resumen</Text>
                     <View style={s.table}>
                        <View style={s.tableHead}>
                           <Text style={[s.tableHeadCell, s.colNombre]}>Empleado</Text>
                           <Text style={[s.tableHeadCell, s.colModalidad]}>Modalidad</Text>
                            <Text style={[s.tableHeadCell, s.colMonto]}>Bruto</Text>
                            <Text style={[s.tableHeadCell, s.colMonto]}>Seguro</Text>
                            <Text style={[s.tableHeadCell, s.colMonto]}>Deducc.</Text>
                            <Text style={[s.tableHeadCell, s.colNeto]}>Neto</Text>
                        </View>

                        {empleados.map((e, i) => (
                           <View key={e.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                              <Text style={[s.tableCell, s.colNombre]}>
                                 {e.empleado_nombre ?? "—"}
                              </Text>
                              <Text style={[s.tableCell, s.colModalidad]}>
                                 {e.modalidad === "FIJO" ? "Fijo" : "Producción"}
                              </Text>
                              <Text style={[s.tableCell, s.colMonto]}>{fmt(bruto(e))}</Text>
                              <Text style={[s.tableCell, s.colMonto]}>
                                 {e.seguro > 0 ? fmt(e.seguro) : "—"}
                              </Text>
                              <Text style={[s.tableCell, s.colMonto]}>
                                 {e.deducciones > 0 ? fmt(e.deducciones) : "—"}
                              </Text>
                              <Text
                                 style={[s.tableCell, s.colNeto, { fontFamily: "Helvetica-Bold" }]}
                              >
                                 {fmt(e.neto_pagar)}
                              </Text>
                           </View>
                        ))}

                        <View style={s.tableFoot}>
                           <Text style={[s.tableFootCell, s.colNombre]}>Totales</Text>
                           <Text style={[s.tableFootCell, s.colModalidad]} />
                            <Text style={[s.tableFootCell, s.colMonto]}>{fmt(totales.bruto)}</Text>
                            <Text style={[s.tableFootCell, s.colMonto]}>{fmt(totales.seguro)}</Text>
                            <Text style={[s.tableFootCell, s.colMonto]}>
                               {fmt(totales.deducciones)}
                            </Text>
                            <Text style={[s.tableFootCell, s.colNeto]}>{fmt(totales.neto)}</Text>
                        </View>
                     </View>
                  </>
               )}

               <Text style={s.sectionTitle}>
                  {soloUno ? "Detalle" : "Detalle por empleado"}
               </Text>
               {empleados.map((e) => (
                  <DetalleEmpleado key={e.id} e={e} />
               ))}

               {soloUno && (
                  <View style={s.firmaFila}>
                     <View style={s.firmaLinea}>
                        <Text style={s.firmaTexto}>Recibí conforme</Text>
                     </View>
                     <View style={s.firmaLinea}>
                        <Text style={s.firmaTexto}>Entregado por</Text>
                     </View>
                  </View>
               )}
            </View>

            <View style={s.footer} fixed>
               <Text style={s.footerText}>
                  {COMPANY_NAME} — Documento interno generado el {fmtDate(new Date())}
               </Text>
            </View>
         </Page>
      </Document>
   );
}

/**
 * Genera el PDF de la nómina. Si `empleados` trae uno solo, sale como volante
 * individual (con línea de firma y sin la tabla de resumen); con varios, sale
 * el resumen del ciclo más el desglose de cada uno.
 */
export async function generateNominaPDF(
   ciclo: PayrollCycle,
   empleados: NominaEmpleado[]
): Promise<void> {
   if (empleados.length === 0) throw new Error("No hay empleados seleccionados");

   const blob = await pdf(<NominaDocument ciclo={ciclo} empleados={empleados} />).toBlob();
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;

   // NFD separa los acentos como diacríticos combinantes (U+0300–U+036F) para
   // poder quitarlos: "Nómina" → "nomina".
   const slug = (texto: string) =>
      texto
         .toLowerCase()
         .normalize("NFD")
         .replace(/[̀-ͯ]/g, "")
         .replace(/[^a-z0-9]+/g, "-")
         .replace(/^-|-$/g, "");

   a.download =
      empleados.length === 1
         ? `nomina-${slug(ciclo.nombre)}-${slug(empleados[0].empleado_nombre ?? "empleado")}.pdf`
         : `nomina-${slug(ciclo.nombre)}.pdf`;

   a.click();
   URL.revokeObjectURL(url);
}
