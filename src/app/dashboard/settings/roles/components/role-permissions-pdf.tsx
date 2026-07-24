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
import {
  PERMISSION_CATALOG,
  actionLabel,
  resourceLabel,
} from "@/lib/permission-catalog";

type PermissionMap = Record<string, string[]>;

const COMPANY_NAME = "Constructora Kissimmee";
const COMPANY_TAGLINE = "Construcción con Excelencia";
const BRAND_BLUE = "#003B96";
const BRAND_YELLOW = "#FBBF24";

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
  metaValue: { color: "#3C3C3C", flex: 1, textTransform: "capitalize" },
  // Table
  table: { marginTop: 6 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: BRAND_BLUE,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeadCell: {
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  tableRowAlt: { backgroundColor: "#F8FAFF" },
  tableCell: { fontSize: 8, color: "#3C3C3C" },
  colResource: { width: 150 },
  colActions: { flex: 1 },
  emptyText: {
    marginTop: 12,
    fontSize: 9,
    color: "#6B7280",
    fontStyle: "italic",
  },
  summary: { fontSize: 8, color: "#6B7280", marginTop: 4, marginBottom: 4 },
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

interface RolePermissionsDocumentProps {
  roleName: string;
  permission: PermissionMap;
  orgName?: string;
}

function RolePermissionsDocument({
  roleName,
  permission,
  orgName,
}: RolePermissionsDocumentProps) {
  // Preserve the catalog ordering; only include resources with granted actions.
  const rows = PERMISSION_CATALOG.map((entry) => {
    const granted = permission[entry.resource] ?? [];
    if (granted.length === 0) return null;
    const labels = entry.actions
      .filter((act) => granted.includes(act.action))
      .map((act) => act.label);
    // Include any granted actions not present in the catalog, just in case.
    const extra = granted
      .filter((g) => !entry.actions.some((act) => act.action === g))
      .map((g) => actionLabel(g));
    return { resource: entry.label, actions: [...labels, ...extra] };
  }).filter((r): r is { resource: string; actions: string[] } => r !== null);

  // Any granted resources not in the catalog (defensive).
  const catalogResources = new Set(PERMISSION_CATALOG.map((e) => e.resource));
  for (const [res, acts] of Object.entries(permission)) {
    if (!catalogResources.has(res) && (acts?.length ?? 0) > 0) {
      rows.push({
        resource: resourceLabel(res),
        actions: acts.map((act) => actionLabel(act)),
      });
    }
  }

  const totalGranted = rows.reduce((sum, r) => sum + r.actions.length, 0);

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
            <Text style={s.docTitle}>PERMISOS DE ROL</Text>
            <Text style={s.docId}>{roleName.toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.accentLine} />

        <View style={s.body}>
          <View style={s.metaGrid}>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Rol:</Text>
              <Text style={s.metaValue}>{roleName}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Generado:</Text>
              <Text style={s.metaValue}>{fmtDate(new Date())}</Text>
            </View>
            {orgName && (
              <View style={s.metaCell}>
                <Text style={s.metaLabel}>Organización:</Text>
                <Text style={s.metaValue}>{orgName}</Text>
              </View>
            )}
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Total:</Text>
              <Text style={s.metaValue}>
                {totalGranted} permiso{totalGranted === 1 ? "" : "s"} ·{" "}
                {rows.length} recurso{rows.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          {rows.length === 0 ? (
            <Text style={s.emptyText}>
              Este rol no tiene permisos asignados.
            </Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.tableHeadCell, s.colResource]}>Recurso</Text>
                <Text style={[s.tableHeadCell, s.colActions]}>Permisos</Text>
              </View>
              {rows.map((row, i) => (
                <View
                  key={row.resource}
                  style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                >
                  <Text style={[s.tableCell, s.colResource]}>
                    {row.resource}
                  </Text>
                  <Text style={[s.tableCell, s.colActions]}>
                    {row.actions.join(", ")}
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

interface RolePermissionsPdfButtonProps {
  roleName: string;
  permission: PermissionMap;
  orgName?: string;
}

export function RolePermissionsPdfButton({
  roleName,
  permission,
  orgName,
}: RolePermissionsPdfButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <RolePermissionsDocument
          roleName={roleName}
          permission={permission}
          orgName={orgName}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `permisos-${roleName.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating role PDF:", err);
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
      PDF
    </Button>
  );
}
