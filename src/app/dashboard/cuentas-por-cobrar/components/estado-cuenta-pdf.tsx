"use client";

import { useState } from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type {
   PagoCxc,
   CuentaPorCobrar,
   DetalleClienteCxc,
} from "@/stores/useCuentasPorCobrarStore";

const COMPANY_NAME = "Constructora Kissimmee";
const COMPANY_TAGLINE = "Construcción con Excelencia";
const BRAND_BLUE = "#003B96";
const BRAND_YELLOW = "#FBBF24";

export type EstadoCuentaDetalle = DetalleClienteCxc;

function fmtDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function money(n: number): string {
  return `RD$ ${n.toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#323232",
    paddingBottom: 60,
  },
  header: {
    backgroundColor: BRAND_BLUE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    height: 90,
  },
  headerLeft: { flexDirection: "column" },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  logo: { width: 50, height: 26, objectFit: "contain", marginBottom: 2 },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  tagline: { fontSize: 8, color: "#C8DCF0" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND_YELLOW },
  docId: { fontSize: 8, color: "#C8DCF0" },
  accentLine: {
    backgroundColor: BRAND_YELLOW,
    height: 2,
    marginHorizontal: 15,
    marginTop: 8,
    marginBottom: 6,
  },
  body: { paddingHorizontal: 15 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  metaCell: { width: "50%", flexDirection: "row", marginBottom: 6 },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
    marginRight: 4,
    minWidth: 70,
  },
  metaValue: { color: "#3C3C3C", flex: 1 },
  summaryRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 8,
    paddingVertical: 6,
  },
  summaryCell: { flex: 1, alignItems: "center" },
  summaryLabel: {
    fontSize: 7,
    color: "#6B7280",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  summaryValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  summaryPendiente: { color: "#DC2626" },
  summaryCobrado: { color: "#16A34A" },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
    marginBottom: 4,
    marginTop: 6,
  },
  table: { marginTop: 2 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: BRAND_BLUE,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeadCell: { color: "#C8DCF0", fontFamily: "Helvetica-Bold", fontSize: 7 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowAlt: { backgroundColor: "#F8FAFF" },
  tableCell: { fontSize: 8, color: "#3C3C3C" },
  colFolio: { width: 70 },
  colFecha: { width: 70 },
  colDetalle: { flex: 1 },
  colNum: { width: 75, textAlign: "right" },
  colPendiente: { width: 75, textAlign: "right", fontFamily: "Helvetica-Bold" },
  colMetodo: { width: 80 },
  emptyText: {
    marginTop: 8,
    fontSize: 8,
    color: "#6B7280",
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BRAND_BLUE,
    paddingVertical: 5,
    alignItems: "center",
  },
  footerText: { fontSize: 7, color: "#C8DCF0" },
});

interface EstadoCuentaDocumentProps {
  detalle: EstadoCuentaDetalle;
}

function EstadoCuentaDocument({ detalle }: EstadoCuentaDocumentProps) {
  const { cliente, resumen, cuentas, historial_pagos } = detalle;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image style={s.logo} src="/logo-kissimmee.png" />
            <Text style={s.companyName}>{COMPANY_NAME}</Text>
            <Text style={s.tagline}>{COMPANY_TAGLINE}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>ESTADO DE CUENTA</Text>
            <Text style={s.docId}>CUENTAS POR COBRAR</Text>
          </View>
        </View>

        <View style={s.accentLine} />

        <View style={s.body}>
          <View style={s.metaGrid}>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Cliente:</Text>
              <Text style={s.metaValue}>{cliente.nombre}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Identificación:</Text>
              <Text style={s.metaValue}>{cliente.identificacion || "—"}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Teléfono:</Text>
              <Text style={s.metaValue}>{cliente.telefono || "—"}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Email:</Text>
              <Text style={s.metaValue}>{cliente.email || "—"}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Generado:</Text>
              <Text style={s.metaValue}>{fmtDate(new Date())}</Text>
            </View>
          </View>

          <View style={s.summaryRow}>
            <View style={s.summaryCell}>
              <Text style={s.summaryLabel}>Facturado</Text>
              <Text style={s.summaryValue}>{money(resumen.facturado)}</Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryLabel}>Cobrado</Text>
              <Text style={[s.summaryValue, s.summaryCobrado]}>
                {money(resumen.pagado)}
              </Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryLabel}>Pendiente</Text>
              <Text style={[s.summaryValue, s.summaryPendiente]}>
                {money(resumen.pendiente)}
              </Text>
            </View>
            <View style={s.summaryCell}>
              <Text style={s.summaryLabel}>Folios</Text>
              <Text style={s.summaryValue}>
                {resumen.cantidad_documentos}
              </Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>FOLIOS ({cuentas.length})</Text>
          {cuentas.length === 0 ? (
            <Text style={s.emptyText}>Sin folios por cobrar.</Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.tableHeadCell, s.colFolio]}>Folio</Text>
                <Text style={[s.tableHeadCell, s.colFecha]}>Fecha</Text>
                <Text style={[s.tableHeadCell, s.colDetalle]}>Detalle</Text>
                <Text style={[s.tableHeadCell, s.colNum]}>Facturado</Text>
                <Text style={[s.tableHeadCell, s.colNum]}>Cobrado</Text>
                <Text style={[s.tableHeadCell, s.colPendiente]}>Pendiente</Text>
              </View>
              {cuentas.map((c, i) => {
                const desglose = c.tipo === "PROYECTO"
                  ? `Tarifa ${money(c.tarifa_servicio)} · Cargos ${money(c.cargos_cobrables)} · Conduces ${c.conduces_count} (${money(c.conduces_cobrables)})`
                  : `Conduce suelto${c.pendiente_tarifa_cargos > 0 ? "" : ""}`;
                return (
                  <View
                    key={c.id}
                    style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                  >
                    <Text style={[s.tableCell, s.colFolio]}>
                      {c.numero_referencia}
                    </Text>
                    <Text style={[s.tableCell, s.colFecha]}>
                      {fmtDate(c.fecha)}
                    </Text>
                    <Text style={[s.tableCell, s.colDetalle]}>
                      {c.nombre ?? "Conduce suelto"}
                      {"\n"}
                      {desglose}
                      {c.estado !== "PAGADO" ? "" : " · Saldado"}
                    </Text>
                    <Text style={[s.tableCell, s.colNum]}>
                      {money(c.monto_total)}
                    </Text>
                    <Text style={[s.tableCell, s.colNum]}>
                      {money(c.pagado)}
                    </Text>
                    <Text style={[s.tableCell, s.colPendiente]}>
                      {money(c.pendiente)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={s.sectionTitle}>
            HISTORIAL DE PAGOS ({historial_pagos.length})
          </Text>
          {historial_pagos.length === 0 ? (
            <Text style={s.emptyText}>Sin pagos registrados.</Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.tableHeadCell, s.colFolio]}>Referencia</Text>
                <Text style={[s.tableHeadCell, s.colFecha]}>Fecha</Text>
                <Text style={[s.tableHeadCell, s.colDetalle]}>Concepto</Text>
                <Text style={[s.tableHeadCell, s.colMetodo]}>Método</Text>
                <Text style={[s.tableHeadCell, s.colNum]}>Monto</Text>
              </View>
              {historial_pagos.map((p, i) => (
                <View
                  key={p.id}
                  style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                >
                  <Text style={[s.tableCell, s.colFolio]}>
                    {p.codigoReferencia}
                  </Text>
                  <Text style={[s.tableCell, s.colFecha]}>{fmtDate(p.fecha)}</Text>
                  <Text style={[s.tableCell, s.colDetalle]}>
                    {p.concepto}
                  </Text>
                  <Text style={[s.tableCell, s.colMetodo]}>{p.metodo_pago}</Text>
                  <Text style={[s.tableCell, s.colNum]}>
                    {money(p.monto_pagado)}
                  </Text>
                </View>
              ))}
            </View>
          )}
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

interface EstadoCuentaPdfButtonProps {
  detalle: EstadoCuentaDetalle;
  clienteNombre: string;
}

export function EstadoCuentaPdfButton({
  detalle,
  clienteNombre,
}: EstadoCuentaPdfButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <EstadoCuentaDocument detalle={detalle} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estado-cuenta-${clienteNombre
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating statement PDF:", err);
      toast.error("No se pudo generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleDownload}
      disabled={generating}
    >
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Estado de cuenta PDF
    </Button>
  );
}
