import React from "react";
import {
   Document,
   Page,
   View,
   Text,
   Image,
   StyleSheet,
   pdf,
} from "@react-pdf/renderer";
import type { PurchaseOrder } from "@/dtos/purchase-order.dto";

const COMPANY_NAME = "Constructora Kissimmee";
const COMPANY_TAGLINE = "Construcción con Excelencia";
const BRAND_BLUE = "#003B96";
const BRAND_YELLOW = "#FBBF24";
const BRAND_BLUE_LIGHT = "#C8DCF";

function fmt(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function fmtDate(value: string | Date): string {
   return new Date(value).toLocaleDateString("es-DO", {
      year: "numeric",
      month: "long",
      day: "numeric",
   });
}

const s = StyleSheet.create({
   page: {
      fontFamily: "Helvetica",
      fontSize: 9,
      color: "#323232",
      paddingBottom: 60,
   },
   // ── Header
   header: {
      backgroundColor: BRAND_BLUE,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 12,
      height: 90,
   },
   headerLeft: {
      flexDirection: "column",
   },
   headerRight: {
      flexDirection: "column",
      alignItems: "flex-end",
   },
   logo: {
      width: 50,
      height: 26,
      objectFit: "contain",
      marginBottom: 2,
   },
   companyName: {
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      color: "#FFFFFF",
   },
   tagline: {
      fontSize: 8,
      color: "#C8DCF0",
   },
   docTitle: {
      fontSize: 13,
      fontFamily: "Helvetica-Bold",
      color: BRAND_YELLOW,
   },
   docId: {
      fontSize: 8,
      color: "#C8DCF0",
   },
   // ── Accent line
   accentLine: {
      backgroundColor: BRAND_YELLOW,
      height: 2,
      marginHorizontal: 15,
      marginTop: 8,
      marginBottom: 6,
   },
   // ── Body
   body: {
      paddingHorizontal: 15,
   },
   // ── Metadata grid
   metaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 4,
   },
   metaCell: {
      width: "50%",
      flexDirection: "row",
      marginBottom: 6,
   },
   metaLabel: {
      fontFamily: "Helvetica-Bold",
      color: BRAND_BLUE,
      marginRight: 4,
      minWidth: 70,
   },
   metaValue: {
      color: "#3C3C3C",
      flex: 1,
   },
   // ── Notes
   notesRow: {
      flexDirection: "row",
      marginBottom: 8,
   },
   notesLabel: {
      fontFamily: "Helvetica-Bold",
      color: BRAND_BLUE,
      marginRight: 4,
      minWidth: 70,
   },
   notesValue: {
      color: "#3C3C3C",
      flex: 1,
   },
   // ── Table
   table: {
      marginTop: 6,
   },
   tableHead: {
      flexDirection: "row",
      backgroundColor: BRAND_BLUE,
      paddingVertical: 5,
      paddingHorizontal: 4,
   },
   tableHeadCell: {
      fontFamily: "Helvetica-Bold",
      color: "#FFFFFF",
      fontSize: 8,
   },
   tableRow: {
      flexDirection: "row",
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: "#E0E0E0",
   },
   tableRowAlt: {
      backgroundColor: "#F8FAFF",
   },
   tableCell: {
      fontSize: 8,
      color: "#3C3C3C",
   },
   tableFoot: {
      flexDirection: "row",
      backgroundColor: "#F0F0F0",
      paddingVertical: 5,
      paddingHorizontal: 4,
   },
   tableFootCell: {
      fontFamily: "Helvetica-Bold",
      fontSize: 9,
      color: "#141414",
   },
   // Column widths
   colDesc: { flex: 1 },
   colQty: { width: 50, textAlign: "right" },
   colPrice: { width: 70, textAlign: "right" },
   colSub: { width: 70, textAlign: "right" },
   // ── Approval
   approvalRow: {
      flexDirection: "row",
      marginTop: 10,
   },
   approvalLabel: {
      fontFamily: "Helvetica-Bold",
      color: BRAND_BLUE,
      marginRight: 4,
   },
   approvalValue: {
      color: "#3C3C3C",
   },
   // ── Signatures
   signaturesRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 20,
   },
   signatureBlock: {
      alignItems: "center",
      width: 120,
   },
   signatureLine: {
      borderBottomWidth: 0.8,
      borderBottomColor: BRAND_BLUE,
      width: 100,
      marginBottom: 4,
   },
   signatureLabel: {
      fontSize: 8,
      color: "#505050",
   },
   // ── Footer
   footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: BRAND_BLUE,
      paddingVertical: 5,
      alignItems: "center",
   },
   footerText: {
      fontSize: 7,
      color: "#C8DCF0",
   },
});

function PurchaseOrderDocument({ order }: { order: PurchaseOrder }) {
   return (
      <Document>
         <Page size="A4" style={s.page}>
            {/* Header */}
            <View style={s.header}>
               <View style={s.headerLeft}>
                  <Image style={s.logo} src="/logo-kissimmee.png" />
                  <Text style={s.companyName}>{COMPANY_NAME}</Text>
                  <Text style={s.tagline}>{COMPANY_TAGLINE}</Text>
               </View>
               <View style={s.headerRight}>
                  <Text style={s.docTitle}>ORDEN DE COMPRA</Text>
                  <Text style={s.docId}>#{order.codigoReferencia}</Text>
               </View>
            </View>

            {/* Accent line */}
            <View style={s.accentLine} />

            <View style={s.body}>
               {/* Metadata grid */}
               <View style={s.metaGrid}>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Proveedor:</Text>
                     <Text style={s.metaValue}>{order.proveedor_nombre ?? order.proveedor_id}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Fecha de Orden:</Text>
                     <Text style={s.metaValue}>{fmtDate(order.fecha)}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Estado:</Text>
                     <Text style={s.metaValue}>{order.estado}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Fecha de Emisión:</Text>
                     <Text style={s.metaValue}>{fmtDate(new Date())}</Text>
                  </View>
               </View>

               {/* Notes */}
               {order.notas && (
                  <View style={s.notesRow}>
                     <Text style={s.notesLabel}>Notas:</Text>
                     <Text style={s.notesValue}>{order.notas}</Text>
                  </View>
               )}

               {/* Table */}
               <View style={s.table}>
                  {/* Head */}
                  <View style={s.tableHead}>
                     <Text style={[s.tableHeadCell, s.colDesc]}>Descripción</Text>
                     <Text style={[s.tableHeadCell, s.colQty]}>Cantidad</Text>
                     <Text style={[s.tableHeadCell, s.colPrice]}>P. Unitario</Text>
                     <Text style={[s.tableHeadCell, s.colSub]}>Subtotal</Text>
                  </View>
                  {/* Rows */}
                  {order.items.map((item, i) => (
                     <View
                        key={item.id ?? i}
                        style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                     >
                        <Text style={[s.tableCell, s.colDesc]}>{item.descripcion}</Text>
                        <Text style={[s.tableCell, s.colQty]}>{item.cantidad}</Text>
                        <Text style={[s.tableCell, s.colPrice]}>{fmt(item.precio_unitario)}</Text>
                        <Text style={[s.tableCell, s.colSub]}>{fmt(item.subtotal)}</Text>
                     </View>
                  ))}
                  {/* Footer */}
                  <View style={s.tableFoot}>
                     <Text style={[s.tableFootCell, s.colDesc]} />
                     <Text style={[s.tableFootCell, s.colQty]} />
                     <Text style={[s.tableFootCell, s.colPrice]}>TOTAL</Text>
                     <Text style={[s.tableFootCell, s.colSub]}>{fmt(order.total)}</Text>
                  </View>
               </View>

               {/* Approval */}
               {order.estado === "APROBADA" && order.approved_by_name && (
                  <View style={{ marginTop: 10 }}>
                     <View style={s.approvalRow}>
                        <Text style={s.approvalLabel}>Aprobado por:</Text>
                        <Text style={s.approvalValue}>{order.approved_by_name}</Text>
                     </View>
                     {order.approved_at && (
                        <View style={s.approvalRow}>
                           <Text style={s.approvalLabel}>Fecha:</Text>
                           <Text style={s.approvalValue}>{fmtDate(order.approved_at)}</Text>
                        </View>
                     )}
                  </View>
               )}

               {/* Signatures */}
               <View style={s.signaturesRow}>
                  <View style={s.signatureBlock}>
                     <View style={s.signatureLine} />
                     <Text style={s.signatureLabel}>Elaborado por</Text>
                  </View>
                  <View style={s.signatureBlock}>
                     <View style={s.signatureLine} />
                     <Text style={s.signatureLabel}>Aprobado por</Text>
                  </View>
               </View>
            </View>

            {/* Footer */}
            <View style={s.footer}>
               <Text style={s.footerText}>
                  {COMPANY_NAME} — Documento generado el {fmtDate(new Date())}
               </Text>
            </View>
         </Page>
      </Document>
   );
}

export async function generatePurchaseOrderPDF(order: PurchaseOrder): Promise<void> {
   const blob = await pdf(<PurchaseOrderDocument order={order} />).toBlob();
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `orden-compra-${order.codigoReferencia}.pdf`;
   a.click();
   URL.revokeObjectURL(url);
}
