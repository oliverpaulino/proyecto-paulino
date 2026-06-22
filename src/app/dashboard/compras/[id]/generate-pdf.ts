import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PurchaseOrder } from "@/dtos/purchase-order.dto";

const COMPANY_NAME = "Constructora Kissimmee";
const COMPANY_TAGLINE = "Construcción con Excelencia";
const BRAND_BLUE: [number, number, number] = [0, 59, 150];
const BRAND_YELLOW: [number, number, number] = [251, 191, 36];

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

export function generatePurchaseOrderPDF(order: PurchaseOrder): void {
   const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
   const pageW = doc.internal.pageSize.getWidth();
   const margin = 15;
   let y = margin;

   // ── Header background bar
   doc.setFillColor(...BRAND_BLUE);
   doc.rect(0, 0, pageW, 28, "F");

   // Company name
   doc.setFont("helvetica", "bold");
   doc.setFontSize(18);
   doc.setTextColor(255, 255, 255);
   doc.text(COMPANY_NAME, margin, 12);

   // Tagline
   doc.setFont("helvetica", "normal");
   doc.setFontSize(9);
   doc.setTextColor(200, 220, 255);
   doc.text(COMPANY_TAGLINE, margin, 19);

   // "ORDEN DE COMPRA" label on right
   doc.setFont("helvetica", "bold");
   doc.setFontSize(14);
   doc.setTextColor(251, 191, 36);
   doc.text("ORDEN DE COMPRA", pageW - margin, 12, { align: "right" });

   // Order ID on right
   doc.setFont("helvetica", "normal");
   doc.setFontSize(8);
   doc.setTextColor(200, 220, 255);
   doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, pageW - margin, 19, { align: "right" });

   y = 36;

   // ── Yellow accent line
   doc.setFillColor(...BRAND_YELLOW);
   doc.rect(margin, y, pageW - margin * 2, 1, "F");
   y += 5;

   // ── Order metadata grid
   doc.setTextColor(50, 50, 50);
   doc.setFontSize(9);

   const col1 = margin;
   const col2 = pageW / 2 + 5;

   const meta: [string, string][] = [
      ["Proveedor:", order.proveedor_nombre ?? order.proveedor_id],
      ["Fecha de Orden:", fmtDate(order.fecha)],
      ["Estado:", order.estado],
      ["Fecha de Emisión:", fmtDate(new Date())],
   ];

   meta.forEach(([label, value], i) => {
      const col = i % 2 === 0 ? col1 : col2;
      const row = y + Math.floor(i / 2) * 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_BLUE);
      doc.text(label, col, row);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(value, col + 30, row);
   });

   y += Math.ceil(meta.length / 2) * 8 + 4;

   if (order.notas) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_BLUE);
      doc.text("Notas:", col1, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(order.notas, pageW - margin * 2 - 30);
      doc.text(lines, col1 + 30, y);
      y += lines.length * 5 + 4;
   }

   y += 3;

   // ── Items table
   autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Descripción", "Cantidad", "P. Unitario", "Subtotal"]],
      body: order.items.map((item) => [
         item.descripcion,
         item.cantidad.toString(),
         fmt(item.precio_unitario),
         fmt(item.subtotal),
      ]),
      foot: [["", "", "TOTAL", fmt(order.total)]],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
         fillColor: BRAND_BLUE,
         textColor: [255, 255, 255],
         fontStyle: "bold",
      },
      footStyles: {
         fillColor: [240, 240, 240],
         textColor: [20, 20, 20],
         fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      columnStyles: {
         0: { cellWidth: "auto" },
         1: { halign: "right", cellWidth: 25 },
         2: { halign: "right", cellWidth: 35 },
         3: { halign: "right", cellWidth: 35 },
      },
   });

   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const finalY: number = (doc as any).lastAutoTable.finalY + 10;

   // ── Approval info
   if (order.estado === "APROBADA" && order.approved_by_name) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_BLUE);
      doc.text("Aprobado por:", margin, finalY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(order.approved_by_name, margin + 32, finalY);
      if (order.approved_at) {
         doc.text(`Fecha: ${fmtDate(order.approved_at)}`, margin + 32, finalY + 6);
      }
   }

   // ── Signature lines
   const sigY = finalY + (order.estado === "APROBADA" ? 20 : 10);
   const sigW = 60;
   const gap = (pageW - margin * 2 - sigW * 2) / 3;
   const sig1x = margin + gap;
   const sig2x = margin + gap * 2 + sigW;

   doc.setDrawColor(...BRAND_BLUE);
   doc.setLineWidth(0.4);
   doc.line(sig1x, sigY, sig1x + sigW, sigY);
   doc.line(sig2x, sigY, sig2x + sigW, sigY);

   doc.setFontSize(8);
   doc.setFont("helvetica", "normal");
   doc.setTextColor(80, 80, 80);
   doc.text("Elaborado por", sig1x + sigW / 2, sigY + 5, { align: "center" });
   doc.text("Aprobado por", sig2x + sigW / 2, sigY + 5, { align: "center" });

   // ── Footer
   const footerY = doc.internal.pageSize.getHeight() - 8;
   doc.setFillColor(...BRAND_BLUE);
   doc.rect(0, footerY - 4, pageW, 12, "F");
   doc.setFontSize(7);
   doc.setTextColor(200, 220, 255);
   doc.setFont("helvetica", "normal");
   doc.text(
      `${COMPANY_NAME} — Documento generado el ${fmtDate(new Date())}`,
      pageW / 2,
      footerY + 2,
      { align: "center" }
   );

   doc.save(`orden-compra-${order.id.slice(0, 8)}.pdf`);
}
