"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
   Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, FileText, Receipt, Plus } from "lucide-react";
import type { Proyecto } from "@/dtos/proyecto.dto";
import type { CreateConduceForm } from "@/dtos/conduce.dto";
import { generateProyectoInternoPDF } from "@/lib/pdf/proyecto-interno-pdf";
import { generateProyectoFacturaPDF } from "@/lib/pdf/proyecto-factura-pdf";
import { useConduceStore } from "@/stores/useConduceStores";
import { ConduceForm } from "../../conduces/components/conduce-form";
import { ConduceTable } from "../../conduces/components/conduce-table";
import { ProyectoTarifasCard } from "./components/proyecto-tarifa-card";
import ConfiguracionTab from "./components/Configuracion-tab";

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

   const { conduces, loading: conducesLoading, GetConducesByProyecto, CreateConduce, DeleteConduce } = useConduceStore();

   const [proyecto, setProyecto] = useState<Proyecto | null>(null);
   const [loading, setLoading] = useState(true);
   const [pdfLoading, setPdfLoading] = useState<"interno" | "factura" | null>(null);
   const [conduceDialogOpen, setConduceDialogOpen] = useState(false);
   const [conduceLoading, setConduceLoading] = useState(false);
   const [deletingConduceId, setDeletingConduceId] = useState<string | null>(null);

   async function loadProyecto() {
      const res = await fetch(`/api/proyectos/${proyectoId}`);
      if (res.ok) {
         const data: Proyecto = await res.json();
         setProyecto(data);
      }
   }

   useEffect(() => {
      async function load() {
         setLoading(true);
         try {
            await Promise.all([loadProyecto(), GetConducesByProyecto(proyectoId)]);
         } finally {
            setLoading(false);
         }
      }
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [proyectoId]);

   async function handleGenerarPDF(tipo: "interno" | "factura") {
      // Lógica de PDF comentada originalmente
   }

   async function handleCreateConduce(data: CreateConduceForm) {
      setConduceLoading(true);
      try {
         const result = await CreateConduce(data);
         if (result instanceof Error) throw result;
         await loadProyecto();
         setConduceDialogOpen(false);
      } finally {
         setConduceLoading(false);
      }
   }

   async function handleDeleteConduce(id: string) {
      if (!confirm("¿Eliminar este conduce? Esta acción no se puede deshacer.")) return;
      setDeletingConduceId(id);
      try {
         const result = await DeleteConduce(id);
         if (result instanceof Error) throw result;
         await loadProyecto();
      } finally {
         setDeletingConduceId(null);
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
   const gastosInternos = proyecto.detalle.filter((d) => !d.es_cobrable); // Asumidos como incobrables / internos
   const conducesCobrables = conduces.filter((c) => c.es_cobrable);
   const conducesInternos = conduces.filter((c) => !c.es_cobrable);

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
                     Proyecto · {new Date(proyecto.fecha_inicio).toLocaleDateString("es-DO")}
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

         {/* Sistema de Tabs */}
         <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto">
               <TabsTrigger value="general">General</TabsTrigger>
               <TabsTrigger value="configuracion">Configuracion</TabsTrigger>
               <TabsTrigger value="conduces">Conduces</TabsTrigger>
               <TabsTrigger value="cobrables">Cobrables</TabsTrigger>
               <TabsTrigger value="incobrables">Incobrables</TabsTrigger>
            </TabsList>

            {/* TAB: GENERAL */}
            <TabsContent value="general" className="space-y-6">
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
            </TabsContent>

            {/* TAB: configuracion */}
            <TabsContent value="configuracion" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle>Tarifas del Proyecto</CardTitle>
                     <CardDescription>
                        Precios negociados para este proyecto. Tienen prioridad sobre el precio global al registrar un conduce.
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <ConfiguracionTab proyectoId={proyectoId} />
                  </CardContent>
               </Card>
            </TabsContent>

            {/* TAB: CONDUCES */}
            <TabsContent value="conduces" className="space-y-4">
               <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                     <div>
                        <CardTitle>Conduces</CardTitle>
                        <CardDescription>
                           {conducesCobrables.length} cobrables · {conducesInternos.length} solo historial
                        </CardDescription>
                     </div>

                     <Dialog open={conduceDialogOpen} onOpenChange={setConduceDialogOpen}>
                        <DialogTrigger asChild>
                           <Button size="sm" className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold border-0">
                              <Plus className="size-4 mr-2" />
                              Registrar Conduce
                           </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                           <DialogHeader>
                              <DialogTitle>Registrar Conduce</DialogTitle>
                              <DialogDescription>
                                 Queda asignado directamente a este proyecto.
                              </DialogDescription>
                           </DialogHeader>
                           <ConduceForm
                              fixedProyectoId={proyectoId}
                              onSubmit={handleCreateConduce}
                              onCancel={() => setConduceDialogOpen(false)}
                              loading={conduceLoading}
                           />
                        </DialogContent>
                     </Dialog>
                  </CardHeader>
                  <CardContent className="p-0">
                     {conducesLoading ? (
                        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                           <Loader2 className="mr-2 size-4 animate-spin" /> Cargando conduces...
                        </div>
                     ) : (
                        <ConduceTable
                           conduces={conduces}
                           onDelete={handleDeleteConduce}
                           deletingId={deletingConduceId}
                           ocultarProyecto
                        />
                     )}
                  </CardContent>
               </Card>
            </TabsContent>

            {/* TAB: COBRABLES */}
            <TabsContent value="cobrables" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle>Cargos cobrables</CardTitle>
                     <CardDescription>Se incluyen en la factura del cliente.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                     <DetalleTable rows={cargosCobrables} />
                  </CardContent>
               </Card>
            </TabsContent>

            {/* TAB: INCOBRABLES (Gastos internos / no cobrables) */}
            <TabsContent value="incobrables" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle>Gastos incobrables / internos</CardTitle>
                     <CardDescription>Solo afectan la rentabilidad interna y no se facturan al cliente.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                     <DetalleTable rows={gastosInternos} />
                  </CardContent>
               </Card>
            </TabsContent>
         </Tabs>
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

function DetalleTable({ rows }: { rows: Proyecto["detalle"] }) {
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