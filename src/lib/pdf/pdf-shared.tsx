import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ConduceDTO } from "@/dtos/conduce.dto";

export const COMPANY_NAME = "Constructora Kissimmee";
export const COMPANY_TAGLINE = "Construcción con Excelencia";
export const BRAND_BLUE = "#003B96";
export const BRAND_YELLOW = "#FBBF24";

export function fmt(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

export function fmtNum(value: number): string {
   return new Intl.NumberFormat("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/**
 * Las fechas llegan como "YYYY-MM-DD" (o ISO). Se fija el mediodía antes de
 * construir el Date por la misma razón que en el listado: `new Date("2026-07-01")`
 * se interpreta como UTC y en RD (UTC-4) retrocede al 30 de junio.
 */
export function fmtDate(value: string | Date): string {
   const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
   return d.toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
}

export function fmtDateShort(value: string | Date): string {
   const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
   return d.toLocaleDateString("es-DO", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

/** La cantidad de un conduce depende del tipo: viajes/metros o horas. */
export function cantidadDe(c: ConduceDTO): number {
   return c.tipo_conduce === "CAMION" ? c.cantidad : c.total_horas;
}

/** Unidad legible para la columna de cantidad. */
export function unidadDe(c: ConduceDTO): string {
   return c.tipo_conduce === "CAMION" ? c.medida_cobro_nombre || "unidad" : "hora";
}

// ─── Agrupación de conduces para la factura ──────────────────────────────
export interface GrupoConduce {
   clave: string;
   equipo_nombre: string;
   tarifa_nombre: string;
   unidad: string;
   cantidad: number;
   precio_unitario: number;
   subtotal: number;
   /** Los precios pueden variar entre conduces del mismo grupo (tarifa negociada distinta). */
   precioVariable: boolean;
   conduces: ConduceDTO[];
}

/**
 * Agrupa por equipo + tarifa + precio de la línea. La factura muestra una fila
 * por grupo; el anexo conserva el detalle conduce por conduce.
 */
export function agruparConduces(conduces: ConduceDTO[]): GrupoConduce[] {
   const mapa = new Map<string, GrupoConduce>();

   for (const c of conduces) {
      const equipo = c.equipo_nombre ?? "Equipo";
      const tarifa = c.categoria_equipo_tarifa_nombre || "";
      const unidad = unidadDe(c);
      const clave = `${equipo}|${tarifa}|${unidad}`;

      const existente = mapa.get(clave);
      const cantidad = cantidadDe(c);

      if (!existente) {
         mapa.set(clave, {
            clave,
            equipo_nombre: equipo,
            tarifa_nombre: tarifa,
            unidad,
            cantidad,
            precio_unitario: c.precio_unitario,
            subtotal: c.subtotal,
            precioVariable: false,
            conduces: [c],
         });
         continue;
      }

      existente.cantidad += cantidad;
      existente.subtotal += c.subtotal;
      existente.conduces.push(c);
      if (existente.precio_unitario !== c.precio_unitario) existente.precioVariable = true;
   }

   return [...mapa.values()].sort((a, b) => b.subtotal - a.subtotal);
}

export function sumaSubtotal(conduces: ConduceDTO[]): number {
   return conduces.reduce((acc, c) => acc + c.subtotal, 0);
}

// ─── Estilos compartidos ─────────────────────────────────────────────────
export const s = StyleSheet.create({
   page: { fontFamily: "Helvetica", fontSize: 9, color: "#323232", paddingBottom: 55 },
   header: {
      backgroundColor: BRAND_BLUE,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 12,
      height: 90,
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
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: BRAND_BLUE,
      marginTop: 12,
      marginBottom: 4,
      textTransform: "uppercase",
   },
   sectionNote: { fontSize: 7.5, color: "#6B7280", marginBottom: 4 },

   metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
   metaCell: { width: "50%", flexDirection: "row", marginBottom: 6 },
   metaCellThird: { width: "33.33%", flexDirection: "row", marginBottom: 6 },
   metaLabel: { fontFamily: "Helvetica-Bold", color: BRAND_BLUE, marginRight: 4, minWidth: 78 },
   metaValue: { color: "#3C3C3C", flex: 1 },

   table: { marginTop: 2 },
   tableHead: {
      flexDirection: "row",
      backgroundColor: BRAND_BLUE,
      paddingVertical: 5,
      paddingHorizontal: 4,
   },
   tableHeadCell: { fontFamily: "Helvetica-Bold", color: "#FFFFFF", fontSize: 8 },
   tableRow: {
      flexDirection: "row",
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: "#E0E0E0",
   },
   tableRowAlt: { backgroundColor: "#F8FAFF" },
   tableCell: { fontSize: 8, color: "#3C3C3C" },
   tableFoot: {
      flexDirection: "row",
      backgroundColor: "#F0F0F0",
      paddingVertical: 5,
      paddingHorizontal: 4,
   },
   tableFootCell: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#141414" },

   emptyNote: { fontSize: 8, color: "#6B7280", fontStyle: "italic", paddingVertical: 6, paddingHorizontal: 4 },

   totalBox: {
      marginTop: 10,
      alignSelf: "flex-end",
      width: 240,
      backgroundColor: "#F8FAFF",
      borderRadius: 4,
      padding: 10,
   },
   totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
   totalLabel: { fontSize: 9, color: "#505050" },
   totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#141414" },
   totalRowFinal: { borderTopWidth: 0.8, borderTopColor: "#C8DCF0", marginTop: 4, paddingTop: 6 },
   totalLabelFinal: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND_BLUE },
   totalValueFinal: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#141414" },

   resumenBox: { marginTop: 12, backgroundColor: "#F8FAFF", borderRadius: 4, padding: 10 },
   resumenRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
   resumenLabel: { fontSize: 9, color: "#505050" },
   resumenValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#141414" },
   resumenTotal: { borderTopWidth: 0.8, borderTopColor: "#C8DCF0", marginTop: 4, paddingTop: 4 },

   statsRow: { flexDirection: "row", gap: 6, marginTop: 6 },
   statBox: { flex: 1, backgroundColor: "#F8FAFF", borderRadius: 4, padding: 8 },
   statLabel: { fontSize: 7, color: "#6B7280", textTransform: "uppercase" },
   statValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND_BLUE, marginTop: 2 },

   signaturesRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 30 },
   signatureBlock: { alignItems: "center", width: 130 },
   signatureLine: { borderBottomWidth: 0.8, borderBottomColor: BRAND_BLUE, width: 110, marginBottom: 4 },
   signatureLabel: { fontSize: 8, color: "#505050" },

   footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: BRAND_BLUE,
      paddingVertical: 5,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 15,
   },
   footerText: { fontSize: 7, color: "#C8DCF0" },
});

export function PdfHeader({ title, subtitle }: { title: string; subtitle?: string }) {
   return (
      <>
         <View style={s.header} fixed>
            <View style={s.headerLeft}>
               <Image style={s.logo} src="/logo-kissimmee.png" />
               <View style={{ flexDirection: "column", marginLeft: 8, justifyContent: "center" }}>
                  <Text style={s.companyName}>{COMPANY_NAME}</Text>
                  <Text style={s.tagline}>{COMPANY_TAGLINE}</Text>
               </View>
            </View>
            <View style={s.headerRight}>
               <Text style={s.docTitle}>{title}</Text>
               {subtitle && <Text style={s.docId}>{subtitle}</Text>}
            </View>
         </View>
         <View style={s.accentLine} fixed />
      </>
   );
}

export function PdfFooter({ nota }: { nota?: string }) {
   return (
      <View style={s.footer} fixed>
         <Text style={s.footerText}>
            {COMPANY_NAME} — {nota ?? "Documento"} generado el {fmtDate(new Date())}
         </Text>
         <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
         />
      </View>
   );
}

/** Descarga un blob ya renderizado con el nombre indicado. */
export function descargar(blob: Blob, filename: string): void {
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = filename;
   a.click();
   URL.revokeObjectURL(url);
}

export { Document, Page, View, Text };
