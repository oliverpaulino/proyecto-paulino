import React from "react";
import { pdf, StyleSheet } from "@react-pdf/renderer";
import type { Proyecto } from "@/dtos/proyecto.dto";
import type { ConduceDTO } from "@/dtos/conduce.dto";
import {
   Document,
   Page,
   View,
   Text,
   PdfHeader,
   PdfFooter,
   s,
   fmt,
   fmtNum,
   fmtDate,
   fmtDateShort,
   cantidadDe,
   agruparConduces,
   descargar,
} from "./pdf-shared";

const c = StyleSheet.create({
   colDesc: { flex: 1 },
   colQty: { width: 70, textAlign: "right" },
   colPrice: { width: 75, textAlign: "right" },
   colSub: { width: 80, textAlign: "right" },

   // Anexo — detalle conduce por conduce
   anexoRef: { width: 52 },
   anexoFecha: { width: 48 },
   anexoEquipo: { flex: 1.2 },
   anexoOperador: { flex: 1 },
   anexoDetalle: { flex: 1.3 },
   anexoCant: { width: 50, textAlign: "right" },
   anexoPrecio: { width: 60, textAlign: "right" },
   anexoSub: { width: 68, textAlign: "right" },
});

/**
 * Factura para el cliente. Solo incluye lo cobrable: conduces cobrables
 * agrupados por equipo/tarifa, la tarifa del servicio y los cargos cobrables.
 * Los gastos internos nunca aparecen aquí — van en el PDF interno.
 */
function ProyectoFacturaDocument({
   proyecto,
   conduces,
   incluirAnexo,
}: {
   proyecto: Proyecto;
   conduces: ConduceDTO[];
   incluirAnexo: boolean;
}) {
   const cargosCobrables = proyecto.detalle.filter((d) => d.es_cobrable);
   const conducesCobrables = conduces.filter((cc) => cc.es_cobrable);
   const grupos = agruparConduces(conducesCobrables);

   const totalConduces = grupos.reduce((acc, g) => acc + g.subtotal, 0);
   const totalCargos = cargosCobrables.reduce((acc, d) => acc + d.subtotal, 0);
   const totalGeneral = proyecto.tarifa_servicio + totalConduces + totalCargos;

   return (
      <Document>
         <Page size="A4" style={s.page}>
            <PdfHeader title="FACTURA / COTIZACIÓN" subtitle={`#${proyecto.id.slice(0, 8)}`} />

            <View style={s.body}>
               <View style={s.metaGrid}>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Cliente:</Text>
                     <Text style={s.metaValue}>{proyecto.cliente_nombre ?? proyecto.cliente_id}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Proyecto:</Text>
                     <Text style={s.metaValue}>{proyecto.nombre}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Fecha inicio:</Text>
                     <Text style={s.metaValue}>{fmtDate(proyecto.fecha_inicio)}</Text>
                  </View>
                  <View style={s.metaCell}>
                     <Text style={s.metaLabel}>Fecha fin:</Text>
                     <Text style={s.metaValue}>
                        {proyecto.fecha_fin ? fmtDate(proyecto.fecha_fin) : "En curso"}
                     </Text>
                  </View>
               </View>

               <Text style={s.sectionTitle}>Detalle facturable</Text>
               <View style={s.table}>
                  <View style={s.tableHead}>
                     <Text style={[s.tableHeadCell, c.colDesc]}>Descripción</Text>
                     <Text style={[s.tableHeadCell, c.colQty]}>Cant.</Text>
                     <Text style={[s.tableHeadCell, c.colPrice]}>P. Unit.</Text>
                     <Text style={[s.tableHeadCell, c.colSub]}>Subtotal</Text>
                  </View>

                  {proyecto.tarifa_servicio > 0 && (
                     <View style={s.tableRow}>
                        <Text style={[s.tableCell, c.colDesc]}>Tarifa del servicio</Text>
                        <Text style={[s.tableCell, c.colQty]}>1</Text>
                        <Text style={[s.tableCell, c.colPrice]}>{fmt(proyecto.tarifa_servicio)}</Text>
                        <Text style={[s.tableCell, c.colSub]}>{fmt(proyecto.tarifa_servicio)}</Text>
                     </View>
                  )}

                  {/* Conduces agrupados: una línea por equipo + tarifa */}
                  {grupos.map((g, i) => (
                     <View key={g.clave} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                        <Text style={[s.tableCell, c.colDesc]}>
                           {g.equipo_nombre}
                           {g.tarifa_nombre ? ` — ${g.tarifa_nombre}` : ""} ({g.unidad})
                           {g.conduces.length > 1 ? `  ·  ${g.conduces.length} conduces` : ""}
                        </Text>
                        <Text style={[s.tableCell, c.colQty]}>{fmtNum(g.cantidad)}</Text>
                        <Text style={[s.tableCell, c.colPrice]}>
                           {g.precioVariable ? "Varios" : fmt(g.precio_unitario)}
                        </Text>
                        <Text style={[s.tableCell, c.colSub]}>{fmt(g.subtotal)}</Text>
                     </View>
                  ))}

                  {/* Cargos cobrables sueltos del proyecto */}
                  {cargosCobrables.map((cargo, i) => (
                     <View
                        key={cargo.id}
                        style={[s.tableRow, (grupos.length + i) % 2 !== 0 ? s.tableRowAlt : {}]}
                     >
                        <Text style={[s.tableCell, c.colDesc]}>{cargo.descripcion}</Text>
                        <Text style={[s.tableCell, c.colQty]}>{fmtNum(cargo.cantidad)}</Text>
                        <Text style={[s.tableCell, c.colPrice]}>{fmt(cargo.precio_unitario)}</Text>
                        <Text style={[s.tableCell, c.colSub]}>{fmt(cargo.subtotal)}</Text>
                     </View>
                  ))}

                  {proyecto.tarifa_servicio === 0 && grupos.length === 0 && cargosCobrables.length === 0 && (
                     <Text style={s.emptyNote}>Este proyecto aún no tiene renglones facturables.</Text>
                  )}
               </View>

               <View style={s.totalBox}>
                  {proyecto.tarifa_servicio > 0 && (
                     <View style={s.totalRow}>
                        <Text style={s.totalLabel}>Tarifa del servicio</Text>
                        <Text style={s.totalValue}>{fmt(proyecto.tarifa_servicio)}</Text>
                     </View>
                  )}
                  {totalConduces > 0 && (
                     <View style={s.totalRow}>
                        <Text style={s.totalLabel}>Equipos y transporte</Text>
                        <Text style={s.totalValue}>{fmt(totalConduces)}</Text>
                     </View>
                  )}
                  {totalCargos > 0 && (
                     <View style={s.totalRow}>
                        <Text style={s.totalLabel}>Otros cargos</Text>
                        <Text style={s.totalValue}>{fmt(totalCargos)}</Text>
                     </View>
                  )}
                  <View style={[s.totalRow, s.totalRowFinal]}>
                     <Text style={s.totalLabelFinal}>TOTAL A PAGAR</Text>
                     <Text style={s.totalValueFinal}>{fmt(totalGeneral)}</Text>
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

            <PdfFooter nota="Factura" />
         </Page>

         {/* Anexo: el respaldo conduce por conduce de las líneas agrupadas */}
         {incluirAnexo && conducesCobrables.length > 0 && (
            <Page size="A4" style={s.page}>
               <PdfHeader title="ANEXO — CONDUCES" subtitle={`#${proyecto.id.slice(0, 8)}`} />

               <View style={s.body}>
                  <Text style={s.sectionTitle}>Detalle de conduces facturados</Text>
                  <Text style={s.sectionNote}>
                     Respaldo de las líneas de equipos y transporte. {conducesCobrables.length} conduce
                     {conducesCobrables.length === 1 ? "" : "s"} · {proyecto.nombre}
                  </Text>

                  <View style={s.table}>
                     <View style={s.tableHead} fixed>
                        <Text style={[s.tableHeadCell, c.anexoRef]}>Ref.</Text>
                        <Text style={[s.tableHeadCell, c.anexoFecha]}>Fecha</Text>
                        <Text style={[s.tableHeadCell, c.anexoEquipo]}>Equipo</Text>
                        <Text style={[s.tableHeadCell, c.anexoOperador]}>Operador</Text>
                        <Text style={[s.tableHeadCell, c.anexoDetalle]}>Detalle</Text>
                        <Text style={[s.tableHeadCell, c.anexoCant]}>Cant.</Text>
                        <Text style={[s.tableHeadCell, c.anexoPrecio]}>P. Unit.</Text>
                        <Text style={[s.tableHeadCell, c.anexoSub]}>Subtotal</Text>
                     </View>

                     {conducesCobrables.map((cc, i) => (
                        <View key={cc.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]} wrap={false}>
                           <Text style={[s.tableCell, c.anexoRef]}>{cc.numero_referencia}</Text>
                           <Text style={[s.tableCell, c.anexoFecha]}>{fmtDateShort(cc.fecha)}</Text>
                           <Text style={[s.tableCell, c.anexoEquipo]}>{cc.equipo_nombre ?? "—"}</Text>
                           <Text style={[s.tableCell, c.anexoOperador]}>{cc.operador_nombre ?? "—"}</Text>
                           <Text style={[s.tableCell, c.anexoDetalle]}>
                              {cc.tipo_conduce === "CAMION"
                                 ? `${cc.procedencia} → ${cc.destino}`
                                 : `${fmtNum(cc.total_horas)} h trabajadas`}
                           </Text>
                           <Text style={[s.tableCell, c.anexoCant]}>{fmtNum(cantidadDe(cc))}</Text>
                           <Text style={[s.tableCell, c.anexoPrecio]}>{fmt(cc.precio_unitario)}</Text>
                           <Text style={[s.tableCell, c.anexoSub]}>{fmt(cc.subtotal)}</Text>
                        </View>
                     ))}

                     <View style={s.tableFoot}>
                        <Text style={[s.tableFootCell, { flex: 1 }]}>
                           Total ({conducesCobrables.length} conduces)
                        </Text>
                        <Text style={[s.tableFootCell, c.anexoSub]}>{fmt(totalConduces)}</Text>
                     </View>
                  </View>
               </View>

               <PdfFooter nota="Anexo" />
            </Page>
         )}
      </Document>
   );
}

export async function generateProyectoFacturaPDF(
   proyecto: Proyecto,
   conduces?: ConduceDTO[],
   opciones?: { incluirAnexo?: boolean }
): Promise<void> {
   // Los conduces pueden venir del store de la pantalla; si no, se usan los que
   // trae el propio proyecto.
   const lista = conduces ?? proyecto.conduces ?? [];
   const blob = await pdf(
      <ProyectoFacturaDocument
         proyecto={proyecto}
         conduces={lista}
         incluirAnexo={opciones?.incluirAnexo ?? true}
      />
   ).toBlob();

   const nombre = proyecto.nombre || proyecto.cliente_nombre || proyecto.id.slice(0, 8);
   descargar(blob, `factura-${nombre.replace(/[^\w\-]+/g, "-").toLowerCase()}.pdf`);
}
