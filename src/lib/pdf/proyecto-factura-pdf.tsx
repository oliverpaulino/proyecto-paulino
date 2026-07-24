import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Proyecto } from "@/dtos/proyecto.dto";

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
   metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
   metaCell: { width: "50%", flexDirection: "row", marginBottom: 6 },
   metaLabel: { fontFamily: "Helvetica-Bold", color: BRAND_BLUE, marginRight: 4, minWidth: 90 },
   metaValue: { color: "#3C3C3C", flex: 1 },
   table: { marginTop: 6 },
   tableHead: { flexDirection: "row", backgroundColor: BRAND_BLUE, paddingVertical: 5, paddingHorizontal: 4 },
   tableHeadCell: { fontFamily: "Helvetica-Bold", color: "#FFFFFF", fontSize: 8 },
   tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#E0E0E0" },
   tableRowAlt: { backgroundColor: "#F8FAFF" },
   tableCell: { fontSize: 8, color: "#3C3C3C" },
   tableFoot: { flexDirection: "row", backgroundColor: "#F0F0F0", paddingVertical: 5, paddingHorizontal: 4 },
   tableFootCell: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#141414" },
   colDesc: { flex: 1 },
   colQty: { width: 55, textAlign: "right" },
   colPrice: { width: 75, textAlign: "right" },
   colSub: { width: 75, textAlign: "right" },
   totalBox: {
      marginTop: 10, alignSelf: "flex-end", width: 220,
      backgroundColor: "#F8FAFF", borderRadius: 4, padding: 10,
   },
   totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
   totalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND_BLUE },
   totalValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#141414" },
   signaturesRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 30 },
   signatureBlock: { alignItems: "center", width: 120 },
   signatureLine: { borderBottomWidth: 0.8, borderBottomColor: BRAND_BLUE, width: 100, marginBottom: 4 },
   signatureLabel: { fontSize: 8, color: "#505050" },
   footer: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: BRAND_BLUE, paddingVertical: 5, alignItems: "center",
   },
   footerText: { fontSize: 7, color: "#C8DCF0" },
});

function ProyectoFacturaDocument({ proyecto }: { proyecto: Proyecto }) {
   const equiposCobrables = proyecto.?.filter((e) => e.es_cobrable);
   const cargosCobrables = proyecto.detalle.filter((d) => d.es_cobrable);

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
                  <Text style={s.docTitle}>FACTURA / COTIZACIÓN</Text>
                  <Text style={s.docId}>#{proyecto.id.slice(0, 8)}</Text>
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
               </View>

               {/* Servicio + equipos + cargos, todo unificado como líneas facturables */}
               <View style={s.table}>
                  <View style={s.tableHead}>
                     <Text style={[s.tableHeadCell, s.colDesc]}>Descripción</Text>
                     <Text style={[s.tableHeadCell, s.colQty]}>Cant.</Text>
                     <Text style={[s.tableHeadCell, s.colPrice]}>P. Unit.</Text>
                     <Text style={[s.tableHeadCell, s.colSub]}>Subtotal</Text>
                  </View>

                  {proyecto.tarifa_servicio > 0 && (
                     <View style={s.tableRow}>
                        <Text style={[s.tableCell, s.colDesc]}>Tarifa del servicio</Text>
                        <Text style={[s.tableCell, s.colQty]}>1</Text>
                        <Text style={[s.tableCell, s.colPrice]}>{fmt(proyecto.tarifa_servicio)}</Text>
                        <Text style={[s.tableCell, s.colSub]}>{fmt(proyecto.tarifa_servicio)}</Text>
                     </View>
                  )}

                  {equiposCobrables?.map((e, i) => (
                     <View key={e.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                        <Text style={[s.tableCell, s.colDesc]}>
                           {e.equipo_nombre ?? "Equipo"} ({e.cobra_en_snapshot ?? "unidad"})
                        </Text>
                        <Text style={[s.tableCell, s.colQty]}>{e.cantidad}</Text>
                        <Text style={[s.tableCell, s.colPrice]}>{fmt(e.precio_acordado)}</Text>
                        <Text style={[s.tableCell, s.colSub]}>{fmt(e.subtotal)}</Text>
                     </View>
                  ))}

                  {cargosCobrables.map((c, i) => (
                     <View key={c.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                        <Text style={[s.tableCell, s.colDesc]}>{c.descripcion}</Text>
                        <Text style={[s.tableCell, s.colQty]}>{c.cantidad}</Text>
                        <Text style={[s.tableCell, s.colPrice]}>{fmt(c.precio_unitario)}</Text>
                        <Text style={[s.tableCell, s.colSub]}>{fmt(c.subtotal)}</Text>
                     </View>
                  ))}
               </View>

               <View style={s.totalBox}>
                  <View style={s.totalRow}>
                     <Text style={s.totalLabel}>TOTAL A PAGAR</Text>
                     <Text style={s.totalValue}>{fmt(proyecto.total_cobrable)}</Text>
                  </View>
               </View>

               <View style={s.signaturesRow}>
                  <View style={s.signatureBlock}>
                     <View style={s.signatureLine} />
                     <Text style={s.signatureLabel}>Elaborado por</Text>
                  </View>
                  <View style={s.signatureBlock}>
                     <View style={s.signatureLine} />
                     <Text style={s.signatureLabel}>Recibido por (Cliente)</Text>
                  </View>
               </View>
            </View>

            <View style={s.footer}>
               <Text style={s.footerText}>
                  {COMPANY_NAME} — Documento generado el {fmtDate(new Date())}
               </Text>
            </View>
         </Page>
      </Document>
   );
}

export async function generateProyectoFacturaPDF(proyecto: Proyecto): Promise<void> {
   const blob = await pdf(<ProyectoFacturaDocument proyecto={proyecto} />).toBlob();
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `factura-${proyecto.cliente_nombre ?? proyecto.id.slice(0, 8)}.pdf`;
   a.click();
   URL.revokeObjectURL(url);
}