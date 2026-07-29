import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Gasto } from "@/dtos/gastos.dto";

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
   // Ancla al mediodía para que una fecha "YYYY-MM-DD" no retroceda un día al
   // interpretarse como UTC.
   const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
   return d.toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
}

function fmtDateShort(value: string | Date): string {
   const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
   return d.toLocaleDateString("es-DO", { year: "2-digit", month: "2-digit", day: "2-digit" });
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

   colRef: { width: 52 },
   colFecha: { width: 48 },
   colConcepto: { flex: 1.5 },
   colCategoria: { width: 78 },
   colNcf: { width: 62 },
   colMonto: { width: 68, textAlign: "right" },

   colGrupo: { flex: 1 },
   colGrupoCant: { width: 45, textAlign: "right" },
   colGrupoMonto: { width: 80, textAlign: "right" },

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

/** Exportado para poder renderizarlo fuera del navegador (pruebas). */
export function GastosReporteDocument({ gastos }: { gastos: Gasto[] }) {
   const total = gastos.reduce((a, g) => a + g.monto_total, 0);

   // Rango real de los gastos incluidos, no el filtro de pantalla: el reporte
   // debe describir lo que contiene.
   const fechas = gastos
      .map((g) => new Date(g.fecha).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b);
   const desde = fechas.length ? new Date(fechas[0]) : null;
   const hasta = fechas.length ? new Date(fechas[fechas.length - 1]) : null;

   // Agrupado por categoría, ordenado por monto: lo que más pesa arriba.
   const porCategoria = new Map<string, { cantidad: number; monto: number; grupo: string }>();
   for (const g of gastos) {
      const clave = g.categoria_gasto_nombre ?? "Sin categoría";
      const prev = porCategoria.get(clave) ?? {
         cantidad: 0,
         monto: 0,
         grupo: g.categoria_gasto_grupo ?? "—",
      };
      prev.cantidad += 1;
      prev.monto += g.monto_total;
      porCategoria.set(clave, prev);
   }
   const categorias = [...porCategoria.entries()].sort((a, b) => b[1].monto - a[1].monto);

   const conNcf = gastos.filter((g) => g.ncf && g.ncf.trim() !== "").length;

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
                  <Text style={s.docTitle}>REPORTE DE GASTOS</Text>
                  <Text style={s.docId}>
                     {gastos.length} gasto{gastos.length === 1 ? "" : "s"}
                  </Text>
               </View>
            </View>

            <View style={s.accentLine} />

            <View style={s.body}>
               <View style={s.metaGrid}>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Período:</Text>
                     <Text style={s.metaValue}>
                        {desde && hasta
                           ? desde.getTime() === hasta.getTime()
                              ? fmtDate(desde)
                              : `${fmtDate(desde)} — ${fmtDate(hasta)}`
                           : "—"}
                     </Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Total:</Text>
                     <Text style={s.metaValue}>{fmt(total)}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Categorías:</Text>
                     <Text style={s.metaValue}>{categorias.length}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Con NCF:</Text>
                     <Text style={s.metaValue}>
                        {conNcf} de {gastos.length}
                     </Text>
                  </View>
               </View>

               <Text style={s.sectionTitle}>Detalle</Text>
               <View style={s.table}>
                  <View style={s.tableHead} fixed>
                     <Text style={[s.tableHeadCell, s.colRef]}>Ref.</Text>
                     <Text style={[s.tableHeadCell, s.colFecha]}>Fecha</Text>
                     <Text style={[s.tableHeadCell, s.colConcepto]}>Concepto</Text>
                     <Text style={[s.tableHeadCell, s.colCategoria]}>Categoría</Text>
                     <Text style={[s.tableHeadCell, s.colNcf]}>NCF</Text>
                     <Text style={[s.tableHeadCell, s.colMonto]}>Monto</Text>
                  </View>

                  {gastos.map((g, i) => (
                     <View key={g.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]} wrap={false}>
                        <Text style={[s.tableCell, s.colRef]}>{g.codigoReferencia}</Text>
                        <Text style={[s.tableCell, s.colFecha]}>{fmtDateShort(g.fecha)}</Text>
                        <Text style={[s.tableCell, s.colConcepto]}>{g.concepto}</Text>
                        <Text style={[s.tableCell, s.colCategoria]}>
                           {g.categoria_gasto_nombre ?? "—"}
                        </Text>
                        <Text style={[s.tableCell, s.colNcf]}>{g.ncf?.trim() || "—"}</Text>
                        <Text style={[s.tableCell, s.colMonto]}>{fmt(g.monto_total)}</Text>
                     </View>
                  ))}

                  <View style={s.tableFoot}>
                     <Text style={[s.tableFootCell, { flex: 1 }]}>
                        Total ({gastos.length} gasto{gastos.length === 1 ? "" : "s"})
                     </Text>
                     <Text style={[s.tableFootCell, s.colMonto]}>{fmt(total)}</Text>
                  </View>
               </View>

               {categorias.length > 1 && (
                  <>
                     <Text style={s.sectionTitle}>Resumen por categoría</Text>
                     <View style={s.table}>
                        <View style={s.tableHead}>
                           <Text style={[s.tableHeadCell, s.colGrupo]}>Categoría</Text>
                           <Text style={[s.tableHeadCell, s.colCategoria]}>Grupo</Text>
                           <Text style={[s.tableHeadCell, s.colGrupoCant]}>Cant.</Text>
                           <Text style={[s.tableHeadCell, s.colGrupoMonto]}>Monto</Text>
                        </View>
                        {categorias.map(([nombre, d], i) => (
                           <View key={nombre} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                              <Text style={[s.tableCell, s.colGrupo]}>{nombre}</Text>
                              <Text style={[s.tableCell, s.colCategoria]}>{d.grupo}</Text>
                              <Text style={[s.tableCell, s.colGrupoCant]}>{d.cantidad}</Text>
                              <Text style={[s.tableCell, s.colGrupoMonto]}>{fmt(d.monto)}</Text>
                           </View>
                        ))}
                     </View>
                  </>
               )}

               <View style={s.resumenBox}>
                  <View style={s.resumenRow}>
                     <Text style={s.resumenLabel}>Cantidad de gastos</Text>
                     <Text style={s.resumenValue}>{gastos.length}</Text>
                  </View>
                  <View style={[s.resumenRow, s.resumenTotal]}>
                     <Text style={[s.resumenLabel, { fontFamily: "Helvetica-Bold" }]}>
                        Total del reporte
                     </Text>
                     <Text style={s.resumenValue}>{fmt(total)}</Text>
                  </View>
               </View>
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

/** Genera el reporte PDF de los gastos indicados. */
export async function generateGastosReportePDF(gastos: Gasto[]): Promise<void> {
   if (gastos.length === 0) throw new Error("No hay gastos seleccionados");

   // Más antiguo primero: se lee como un registro cronológico.
   const ordenados = [...gastos].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
   );

   const blob = await pdf(<GastosReporteDocument gastos={ordenados} />).toBlob();
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;

   const hoy = new Date();
   const stamp = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}${String(
      hoy.getDate()
   ).padStart(2, "0")}`;

   a.download = `reporte-gastos-${stamp}.pdf`;
   a.click();
   URL.revokeObjectURL(url);
}
