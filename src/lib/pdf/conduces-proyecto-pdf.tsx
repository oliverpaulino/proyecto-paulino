import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Proyecto } from "@/dtos/proyecto.dto";
import type { ConduceDTO } from "@/dtos/conduce.dto";

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
   sectionTitle: {
      fontFamily: "Helvetica-Bold", fontSize: 10, color: BRAND_BLUE,
      marginTop: 10, marginBottom: 4, paddingBottom: 3,
      borderBottomWidth: 0.5, borderBottomColor: BRAND_BLUE,
   },
   table: { marginTop: 4 },
   tableHead: { flexDirection: "row", backgroundColor: BRAND_BLUE, paddingVertical: 5, paddingHorizontal: 4 },
   tableHeadCell: { fontFamily: "Helvetica-Bold", color: "#FFFFFF", fontSize: 7.5 },
   tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#E0E0E0" },
   tableRowAlt: { backgroundColor: "#F8FAFF" },
   tableCell: { fontSize: 8, color: "#3C3C3C" },
   tableFoot: { flexDirection: "row", backgroundColor: "#F0F0F0", paddingVertical: 5, paddingHorizontal: 4 },
   tableFootCell: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#141414" },
   colRef: { width: 65 },
   colFecha: { width: 60 },
   colEquipo: { width: 80 },
   colOperador: { width: 70 },
   colDetalle: { flex: 1 },
   colCant: { width: 45, textAlign: "right" },
   colPrecio: { width: 60, textAlign: "right" },
   colSub: { width: 65, textAlign: "right" },
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

interface Props {
   proyecto: Proyecto;
   conduces: ConduceDTO[];
}

function ConducesPDFDocument({ proyecto, conduces }: Props) {
   // Agrupar por categoría
   const groups: Record<string, ConduceDTO[]> = {};
   for (const c of conduces) {
      const cat = c.categoria_equipo_tarifa_nombre || "Sin categoría";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
   }

   const totalGeneral = conduces.reduce((sum, c) => sum + c.subtotal, 0);

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
                  <Text style={s.docTitle}>CONDUCES COBRABLES</Text>
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
                     <Text style={s.metaValue}>{fmtDate(new Date())}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Proyecto:</Text>
                     <Text style={s.metaValue}>{proyecto.nombre}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Total conduces:</Text>
                     <Text style={s.metaValue}>{conduces.length}</Text>
                  </View>
               </View>

               {Object.entries(groups).map(([categoria, items]) => {
                  const subtotalCat = items.reduce((sum, c) => sum + c.subtotal, 0);
                  return (
                     <View key={categoria}>
                        <Text style={s.sectionTitle}>{categoria}</Text>
                        <View style={s.table}>
                           <View style={s.tableHead}>
                              <Text style={[s.tableHeadCell, s.colRef]}>Referencia</Text>
                              <Text style={[s.tableHeadCell, s.colFecha]}>Fecha</Text>
                              <Text style={[s.tableHeadCell, s.colEquipo]}>Equipo</Text>
                              <Text style={[s.tableHeadCell, s.colOperador]}>Operador</Text>
                              <Text style={[s.tableHeadCell, s.colDetalle]}>Detalle</Text>
                              <Text style={[s.tableHeadCell, s.colCant]}>Cant.</Text>
                              <Text style={[s.tableHeadCell, s.colPrecio]}>P. Unit.</Text>
                              <Text style={[s.tableHeadCell, s.colSub]}>Subtotal</Text>
                           </View>

                           {items.map((c, i) => (
                              <View key={c.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                                 <Text style={[s.tableCell, s.colRef]}>{c.numero_referencia}</Text>
                                 <Text style={[s.tableCell, s.colFecha]}>
                                    {new Date(c.fecha).toLocaleDateString("es-DO")}
                                 </Text>
                                 <Text style={[s.tableCell, s.colEquipo]}>{c.equipo_nombre ?? "—"}</Text>
                                 <Text style={[s.tableCell, s.colOperador]}>{c.operador_nombre ?? "—"}</Text>
                                 <Text style={[s.tableCell, s.colDetalle]}>
                                    {c.tipo_conduce === "CAMION"
                                       ? `${c.procedencia} → ${c.destino}`
                                       : `${c.total_horas}h`}
                                 </Text>
                                 <Text style={[s.tableCell, s.colCant]}>
                                    {c.tipo_conduce === "CAMION" ? c.cantidad : `${c.total_horas}h`}
                                 </Text>
                                 <Text style={[s.tableCell, s.colPrecio]}>{fmt(c.precio_unitario)}</Text>
                                 <Text style={[s.tableCell, s.colSub]}>{fmt(c.subtotal)}</Text>
                              </View>
                           ))}

                           <View style={s.tableFoot}>
                              <Text style={[s.tableFootCell, { flex: 1 }]}>Subtotal {categoria}</Text>
                              <Text style={[s.tableFootCell, s.colSub]}>{fmt(subtotalCat)}</Text>
                           </View>
                        </View>
                     </View>
                  );
               })}

               <View style={s.totalBox}>
                  <View style={s.totalRow}>
                     <Text style={s.totalLabel}>TOTAL A PAGAR</Text>
                     <Text style={s.totalValue}>{fmt(totalGeneral)}</Text>
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

export async function generateConducesProyectoPDF(
   proyecto: Proyecto,
   conducesCobrables: ConduceDTO[]
): Promise<void> {
   const blob = await pdf(
      <ConducesPDFDocument proyecto={proyecto} conduces={conducesCobrables} />
   ).toBlob();
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `conduces-${proyecto.cliente_nombre ?? proyecto.id.slice(0, 8)}.pdf`;
   a.click();
   URL.revokeObjectURL(url);
}
