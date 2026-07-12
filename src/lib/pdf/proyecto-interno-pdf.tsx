import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { ProyectoExpressDTO } from "@/dtos/proyecto.dto";

const COMPANY_NAME = "Constructora Kissimmee";
const COMPANY_TAGLINE = "Construcción con Excelencia";
const BRAND_BLUE = "#003B96";
const BRAND_YELLOW = "#FBBF24";

function fmt(value: number): string {
   return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(value);
}
function fmtDate(value: string | Date): string {
   return new Date(value).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
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
   tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#E0E0E0" },
   tableRowAlt: { backgroundColor: "#F8FAFF" },
   tableCell: { fontSize: 8, color: "#3C3C3C" },
   tableFoot: { flexDirection: "row", backgroundColor: "#F0F0F0", paddingVertical: 5, paddingHorizontal: 4 },
   tableFootCell: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#141414" },
   colDesc: { flex: 1.4 },
   colOperador: { width: 90 },
   colQty: { width: 45, textAlign: "right" },
   colPrice: { width: 60, textAlign: "right" },
   colSub: { width: 65, textAlign: "right" },
   colCobrable: { width: 45, textAlign: "center" },
   resumenBox: { marginTop: 12, backgroundColor: "#F8FAFF", borderRadius: 4, padding: 10 },
   resumenRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
   resumenLabel: { fontSize: 9, color: "#505050" },
   resumenValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#141414" },
   resumenTotal: { borderTopWidth: 0.8, borderTopColor: "#C8DCF0", marginTop: 4, paddingTop: 4 },
   footer: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: BRAND_BLUE, paddingVertical: 5, alignItems: "center",
   },
   footerText: { fontSize: 7, color: "#C8DCF0" },
});

function ProyectoInternoDocument({ proyecto }: { proyecto: ProyectoExpressDTO }) {
   const cargosCobrables = proyecto.detalle.filter((d) => d.es_cobrable);
   const gastosInternos = proyecto.detalle.filter((d) => !d.es_cobrable);

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
                  <Text style={s.docTitle}>REGISTRO INTERNO</Text>
                  <Text style={s.docId}>Proyecto Express #{proyecto.id.slice(0, 8)}</Text>
               </View>
            </View>

            <View style={s.accentLine} />

            <View style={s.body}>
               <View style={s.metaGrid}>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Cliente:</Text>
                     <Text style={s.metaValue}>{proyecto.cliente_nombre ?? proyecto.cliente_id}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Fecha:</Text>
                     <Text style={s.metaValue}>{fmtDate(proyecto.fecha_inicio)}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Estado:</Text>
                     <Text style={s.metaValue}>{proyecto.estado}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Tarifa servicio:</Text>
                     <Text style={s.metaValue}>{fmt(proyecto.tarifa_servicio)}</Text>
                  </View>
               </View>

               {/* Equipos — todos, cobrables y no cobrables */}
               <Text style={s.sectionTitle}>Equipos utilizados</Text>
               <View style={s.table}>
                  <View style={s.tableHead}>
                     <Text style={[s.tableHeadCell, s.colDesc]}>Equipo</Text>
                     <Text style={[s.tableHeadCell, s.colOperador]}>Operador</Text>
                     <Text style={[s.tableHeadCell, s.colQty]}>Cant.</Text>
                     <Text style={[s.tableHeadCell, s.colPrice]}>P. Unit.</Text>
                     <Text style={[s.tableHeadCell, s.colSub]}>Subtotal</Text>
                     <Text style={[s.tableHeadCell, s.colCobrable]}>Cobrable</Text>
                  </View>
                  {proyecto.equiposDetalle?.map((e, i) => (
                     <View key={e.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                        <Text style={[s.tableCell, s.colDesc]}>{e.equipo_nombre ?? "—"}</Text>
                        <Text style={[s.tableCell, s.colOperador]}>{e.operador_nombre ?? "—"}</Text>
                        <Text style={[s.tableCell, s.colQty]}>{e.cantidad}</Text>
                        <Text style={[s.tableCell, s.colPrice]}>{fmt(e.precio_acordado)}</Text>
                        <Text style={[s.tableCell, s.colSub]}>{fmt(e.subtotal)}</Text>
                        <Text style={[s.tableCell, s.colCobrable]}>{e.es_cobrable ? "Sí" : "No"}</Text>
                     </View>
                  ))}
               </View>

               {/* Cargos cobrables */}
               {cargosCobrables.length > 0 && (
                  <>
                     <Text style={s.sectionTitle}>Cargos cobrables</Text>
                     <View style={s.table}>
                        <View style={s.tableHead}>
                           <Text style={[s.tableHeadCell, s.colDesc]}>Descripción</Text>
                           <Text style={[s.tableHeadCell, s.colQty]}>Cant.</Text>
                           <Text style={[s.tableHeadCell, s.colPrice]}>P. Unit.</Text>
                           <Text style={[s.tableHeadCell, s.colSub]}>Subtotal</Text>
                        </View>
                        {cargosCobrables.map((c, i) => (
                           <View key={c.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                              <Text style={[s.tableCell, s.colDesc]}>{c.descripcion}</Text>
                              <Text style={[s.tableCell, s.colQty]}>{c.cantidad}</Text>
                              <Text style={[s.tableCell, s.colPrice]}>{fmt(c.precio_unitario)}</Text>
                              <Text style={[s.tableCell, s.colSub]}>{fmt(c.subtotal)}</Text>
                           </View>
                        ))}
                     </View>
                  </>
               )}

               {/* Gastos internos */}
               {gastosInternos.length > 0 && (
                  <>
                     <Text style={s.sectionTitle}>Gastos internos (no cobrables)</Text>
                     <View style={s.table}>
                        <View style={s.tableHead}>
                           <Text style={[s.tableHeadCell, s.colDesc]}>Descripción</Text>
                           <Text style={[s.tableHeadCell, s.colQty]}>Cant.</Text>
                           <Text style={[s.tableHeadCell, s.colPrice]}>P. Unit.</Text>
                           <Text style={[s.tableHeadCell, s.colSub]}>Subtotal</Text>
                        </View>
                        {gastosInternos.map((g, i) => (
                           <View key={g.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                              <Text style={[s.tableCell, s.colDesc]}>{g.descripcion}</Text>
                              <Text style={[s.tableCell, s.colQty]}>{g.cantidad}</Text>
                              <Text style={[s.tableCell, s.colPrice]}>{fmt(g.precio_unitario)}</Text>
                              <Text style={[s.tableCell, s.colSub]}>{fmt(g.subtotal)}</Text>
                           </View>
                        ))}
                     </View>
                  </>
               )}

               {/* Resumen financiero completo */}
               <View style={s.resumenBox}>
                  <View style={s.resumenRow}>
                     <Text style={s.resumenLabel}>Tarifa del servicio</Text>
                     <Text style={s.resumenValue}>{fmt(proyecto.tarifa_servicio)}</Text>
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
                     <Text style={[s.resumenValue, { color: proyecto.rentabilidad >= 0 ? "#15803D" : "#DC2626" }]}>
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

            <View style={s.footer}>
               <Text style={s.footerText}>
                  {COMPANY_NAME} — Documento interno generado el {fmtDate(new Date())}
               </Text>
            </View>
         </Page>
      </Document>
   );
}

export async function generateProyectoInternoPDF(proyecto: ProyectoExpressDTO): Promise<void> {
   const blob = await pdf(<ProyectoInternoDocument proyecto={proyecto} />).toBlob();
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `proyecto-interno-${proyecto.id.slice(0, 8)}.pdf`;
   a.click();
   URL.revokeObjectURL(url);
}