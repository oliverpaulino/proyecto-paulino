"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
   Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, FileText, Receipt } from "lucide-react";
import type { Proyecto, ProyectoExpressDTO } from "@/dtos/proyecto.dto";
import { generateProyectoInternoPDF } from "@/lib/pdf/proyecto-interno-pdf";
import { generateProyectoFacturaPDF } from "@/lib/pdf/proyecto-factura-pdf";

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency", currency: "DOP", minimumFractionDigits: 2,
   }).format(value);
}

const ESTADO_BADGE: Record<string, string> = {
   COMPLETADO: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
   BORRADOR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
   CANCELADO: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
   "EN PROGRESO": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function ProyectoDetailPage() {
   const params = useParams();
   const router = useRouter();
   const proyectoId = params.id as string;

   const [proyecto, setProyecto] = useState<ProyectoExpressDTO | null>(null);
   const [loading, setLoading] = useState(true);
   const [pdfLoading, setPdfLoading] = useState<"interno" | "factura" | null>(null);

   useEffect(() => {
      async function load() {
         setLoading(true);
         try {
            const res = await fetch(`/api/proyectos/${proyectoId}`);
            if (res.ok) {
               const data: Proyecto = await res.json();
               if (data.tipo_proyecto === "EXPRESS") setProyecto(data);
            }
         } finally {
            setLoading(false);
         }
      }
      load();
   }, [proyectoId]);

   async function handleGenerarPDF(tipo: "interno" | "factura") {
      if (!proyecto) return;
      setPdfLoading(tipo);
      try {
         if (tipo === "interno") await generateProyectoInternoPDF(proyecto);
         else await generateProyectoFacturaPDF(proyecto);
      } finally {
         setPdfLoading(null);
      }
   }

   if (loading) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!proyecto) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <p>Proyecto no encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/proyectos")}>
               <ArrowLeft className="mr-2 size-4" /> Volver
            </Button>
         </div>
      );
   }

   const cargosCobrables = proyecto.detalle.filter((d) => d.es_cobrable);
   const gastosInternos = proyecto.detalle.filter((d) => !d.es_cobrable);
   const equiposCobrables = proyecto.equiposDetalle?.filter((e) => e.es_cobrable);
   const equiposNoCobrables = proyecto.equiposDetalle?.filter((e) => !e.es_cobrable);

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
               <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/proyectos")}>
                  <ArrowLeft className="size-4" />
               </Button>
               <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                     <h1 className="text-2xl font-bold text-brand-blue dark:text-white">
                        {proyecto.cliente_nombre ?? "Cliente"}
                     </h1>
                     <Badge className={`border-0 text-xs font-medium ${ESTADO_BADGE[proyecto.estado] ?? ""}`}>
                        {proyecto.estado}
                     </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                     Proyecto Express · {new Date(proyecto.fecha_inicio).toLocaleDateString("es-DO")}
                  </p>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
               <Button
                  variant="outline"
                  onClick={() => handleGenerarPDF("interno")}
                  disabled={pdfLoading !== null}
               >
                  {pdfLoading === "interno" ? (
                     <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                     <FileText className="mr-2 size-4" />
                  )}
                  PDF Interno
               </Button>
               <Button
                  onClick={() => handleGenerarPDF("factura")}
                  disabled={pdfLoading !== null}
                  className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold border-0"
               >
                  {pdfLoading === "factura" ? (
                     <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                     <Receipt className="mr-2 size-4" />
                  )}
                  Factura para Cliente
               </Button>
            </div>
         </div>

         {/* Resumen financiero */}
         <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatBox label="Tarifa del servicio" value={formatMoney(proyecto.tarifa_servicio)} />
            <StatBox label="Total cobrable" value={formatMoney(proyecto.total_cobrable)} accent="text-green-600" />
            <StatBox label="Gastos internos" value={formatMoney(proyecto.total_gasto_interno)} accent="text-red-500" />
            <StatBox
               label="Rentabilidad"
               value={formatMoney(proyecto.rentabilidad)}
               accent={proyecto.rentabilidad >= 0 ? "text-green-700" : "text-red-600"}
            />
         </div>

         {/* Equipos usados */}
         <Card>
            <CardHeader>
               <CardTitle>Equipos utilizados</CardTitle>
               <CardDescription>
                  {equiposCobrables?.length} cobrables · {equiposNoCobrables?.length} solo historial
               </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <EquiposTable rows={proyecto.equiposDetalle} />
            </CardContent>
         </Card>

         {/* Cargos cobrables */}
         <Card>
            <CardHeader>
               <CardTitle>Cargos cobrables</CardTitle>
               <CardDescription>Se incluyen en la factura del cliente.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <DetalleTable rows={cargosCobrables} />
            </CardContent>
         </Card>

         {/* Gastos internos */}
         <Card>
            <CardHeader>
               <CardTitle>Gastos internos</CardTitle>
               <CardDescription>Solo afectan la rentabilidad interna.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <DetalleTable rows={gastosInternos} />
            </CardContent>
         </Card>

         {proyecto.notas && (
            <Card>
               <CardHeader>
                  <CardTitle>Notas</CardTitle>
               </CardHeader>
               <CardContent>
                  <p className="text-sm text-muted-foreground">{proyecto.notas}</p>
               </CardContent>
            </Card>
         )}
      </div>
   );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
   return (
      <div className="rounded-lg border bg-muted/20 p-4">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className={`mt-1 text-lg font-semibold ${accent ?? ""}`}>{value}</p>
      </div>
   );
}

function EquiposTable({ rows }: { rows: ProyectoExpressDTO["equiposDetalle"] }) {
   if (!rows || rows.length === 0) {
      return <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">Sin equipos registrados.</div>;
   }
   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Equipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Operador</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Cantidad</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">P. Unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Cobrable</th>
               </tr>
            </thead>
            <tbody>
               {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                     <td className="px-4 py-3 font-medium">{r.equipo_nombre ?? "—"}</td>
                     <td className="px-4 py-3 text-muted-foreground">{r.operador_nombre ?? "—"}</td>
                     <td className="px-4 py-3 text-right">{r.cantidad} {r.cobra_en_snapshot ?? ""}</td>
                     <td className="px-4 py-3 text-right">{formatMoney(r.precio_acordado)}</td>
                     <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.subtotal)}</td>
                     <td className="px-4 py-3 text-center">
                        {r.es_cobrable ? (
                           <Badge className="border-0 bg-green-100 text-green-800 text-xs">Sí</Badge>
                        ) : (
                           <Badge className="border-0 bg-gray-100 text-gray-600 text-xs">No</Badge>
                        )}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}

function DetalleTable({ rows }: { rows: ProyectoExpressDTO["detalle"] }) {
   if (rows.length === 0) {
      return <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">Sin registros.</div>;
   }
   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Cantidad</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">P. Unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
               </tr>
            </thead>
            <tbody>
               {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                     <td className="px-4 py-3">{r.descripcion}</td>
                     <td className="px-4 py-3 text-right">{r.cantidad}</td>
                     <td className="px-4 py-3 text-right">{formatMoney(r.precio_unitario)}</td>
                     <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.subtotal)}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}