"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
   Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
   ArrowLeft, Loader2, FileText, Receipt, Plus, Search, ArrowRight,
   Trash2, Eye, Pencil, Truck, HardHat, Save, X,
   ChevronLeft,
   ChevronRight,
} from "lucide-react";
import type { Proyecto, ProyectoDetalle } from "@/dtos/proyecto.dto";
import type { CreateConduceForm, ConduceDTO } from "@/dtos/conduce.dto";
import { generateProyectoInternoPDF } from "@/lib/pdf/proyecto-interno-pdf";
import { generateProyectoFacturaPDF } from "@/lib/pdf/proyecto-factura-pdf";
import { generateConducesProyectoPDF } from "@/lib/pdf/conduces-proyecto-pdf";
import { useConduceStore } from "@/stores/useConduceStores";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { ConduceForm } from "../../conduces/components/conduce-form";
import { ConduceDetalleDialog } from "../../conduces/components/conduce-detalle-dialog";
import { ConduceEditDialog } from "../../conduces/components/conduce-edit-dialog";
import { ConduceDeleteDialog } from "../../conduces/components/conduce-delete-dialog";
import ConfiguracionTab from "./components/Configuracion-tab";
import { Switch } from "@/components/ui/switch";

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

   const { conduces, loading: conducesLoading, GetConducesByProyecto, CreateConduce, DeleteConduce, BulkToggleCobrable } = useConduceStore();
   const { ToggleDetalleCobrable } = useProyectoStore();

   const [proyecto, setProyecto] = useState<Proyecto | null>(null);
   const [loading, setLoading] = useState(true);
   const [pdfLoading, setPdfLoading] = useState<"interno" | "factura" | "conduces" | null>(null);
   const [conduceDialogOpen, setConduceDialogOpen] = useState(false);
   const [conduceLoading, setConduceLoading] = useState(false);
   const [deletingConduceId, setDeletingConduceId] = useState<string | null>(null);

   // ── Detalle: selección ────────────────────────────────────────────────
   const [selectedDetalleIds, setSelectedDetalleIds] = useState<Set<string>>(new Set());
   const [toggleDetalleLoading, setToggleDetalleLoading] = useState(false);

   // ── Conduces: selección + filtros ─────────────────────────────────────
   const [selectedConduceIds, setSelectedConduceIds] = useState<Set<string>>(new Set());
   const [toggleConduceLoading, setToggleConduceLoading] = useState(false);
   const [conduceSearch, setConduceSearch] = useState("");
   const [conduceFilterCategoria, setConduceFilterCategoria] = useState<string>("all");
   const [conduceFilterCobrable, setConduceFilterCobrable] = useState<string>("all");
   const [conduceFilterTipo, setConduceFilterTipo] = useState<string>("all");

   // ── Conduce dialogs ───────────────────────────────────────────────────
   const [conduceDetalle, setConduceDetalle] = useState<ConduceDTO | null>(null);
   const [conduceAEditar, setConduceAEditar] = useState<ConduceDTO | null>(null);
   const [conduceAEliminar, setConduceAEliminar] = useState<ConduceDTO | null>(null);

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

   async function handleGenerarPDF(tipo: "interno" | "factura" | "conduces") {
      if (!proyecto) return;
      setPdfLoading(tipo);
      try {
         if (tipo === "interno") {
            await generateProyectoInternoPDF(proyecto);
         } else if (tipo === "factura") {
            await generateProyectoFacturaPDF(proyecto);
         } else {
            // PDF de conduces: usar los seleccionados, o todos los cobrables si no hay selección
            const conducesParaPDF = selectedConduceIds.size > 0
               ? conduces.filter((c) => selectedConduceIds.has(c.id))
               : conducesCobrables;
            await generateConducesProyectoPDF(proyecto, conducesParaPDF);
         }
      } finally {
         setPdfLoading(null);
      }
   }

   async function handleCreateConduce(data: CreateConduceForm) {
      setConduceLoading(true);
      try {
         const result = await CreateConduce(data);
         if (result instanceof Error) throw result;
         await loadProyecto();
         await GetConducesByProyecto(proyectoId);
         setConduceDialogOpen(false);
      } finally {
         setConduceLoading(false);
      }
   }

   async function handleDeleteConduce(id: string) {
      setDeletingConduceId(id);
      try {
         const result = await DeleteConduce(id);
         if (result instanceof Error) throw result;
         await loadProyecto();
         await GetConducesByProyecto(proyectoId);
      } finally {
         setDeletingConduceId(null);
      }
   }

   // ── Detalle: toggle cobrable ──────────────────────────────────────────
   const handleToggleDetalle = useCallback(async (esCobrable: boolean) => {
      if (selectedDetalleIds.size === 0) return;
      setToggleDetalleLoading(true);
      try {
         const result = await ToggleDetalleCobrable([...selectedDetalleIds], esCobrable);
         if (result instanceof Error) throw result;
         setSelectedDetalleIds(new Set());
         await loadProyecto();
      } finally {
         setToggleDetalleLoading(false);
      }
   }, [selectedDetalleIds, ToggleDetalleCobrable, proyectoId]);

   // ── Conduces: toggle cobrable ─────────────────────────────────────────
   const handleToggleConduces = useCallback(async (esCobrable: boolean) => {
      if (selectedConduceIds.size === 0) return;
      setToggleConduceLoading(true);
      try {
         const result = await BulkToggleCobrable([...selectedConduceIds], esCobrable);
         if (result instanceof Error) throw result;
         setSelectedConduceIds(new Set());
         await loadProyecto();
      } finally {
         setToggleConduceLoading(false);
      }
   }, [selectedConduceIds, BulkToggleCobrable, proyectoId]);

   // ── Conduces: filtros ─────────────────────────────────────────────────
   const conducesFiltrados = useMemo(() => {
      return conduces.filter((c) => {
         if (conduceSearch) {
            const q = conduceSearch.toLowerCase();
            const match =
               c.numero_referencia.toLowerCase().includes(q) ||
               (c.equipo_nombre ?? "").toLowerCase().includes(q) ||
               (c.categoria_equipo_tarifa_nombre ?? "").toLowerCase().includes(q) ||
               (c.operador_nombre ?? "").toLowerCase().includes(q);
            if (!match) return false;
         }
         if (conduceFilterCategoria !== "all") {
            const catNombre = c.categoria_equipo_tarifa_nombre || "Sin categoría";
            if (catNombre !== conduceFilterCategoria) return false;
         }
         if (conduceFilterCobrable === "cobrable" && !c.es_cobrable) return false;
         if (conduceFilterCobrable === "no_cobrable" && c.es_cobrable) return false;
         if (conduceFilterTipo !== "all" && c.tipo_conduce !== conduceFilterTipo) return false;
         return true;
      });
   }, [conduces, conduceSearch, conduceFilterCategoria, conduceFilterCobrable, conduceFilterTipo]);

   const categorias = useMemo(() => {
      const cats = new Set(
         conduces
            .map((c) => c.categoria_equipo_tarifa_nombre || "Sin categoría")
      );
      return [...cats].sort();
   }, [conduces]);

   // Agrupar conduces filtrados por categoría
   const conducesGrouped = useMemo(() => {
      const groups: Record<string, ConduceDTO[]> = {};
      for (const c of conducesFiltrados) {
         const cat = c.categoria_equipo_tarifa_nombre || "Sin categoría";
         if (!groups[cat]) groups[cat] = [];
         groups[cat].push(c);
      }
      return groups;
   }, [conducesFiltrados]);

   const handleToggleCategory = useCallback((categoria: string, checked: boolean) => {
      setSelectedConduceIds((prev) => {
         const next = new Set(prev);
         for (const c of conducesFiltrados) {
            const cat = c.categoria_equipo_tarifa_nombre || "Sin categoría";
            if (cat === categoria) {
               if (checked) next.add(c.id);
               else next.delete(c.id);
            }
         }
         return next;
      });
   }, [conducesFiltrados]);

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
                  <CardContent className="space-y-4">
                     {/* Filtros */}
                     <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                           <Input
                              placeholder="Buscar por referencia, equipo, tarifa..."
                              value={conduceSearch}
                              onChange={(e) => setConduceSearch(e.target.value)}
                              className="pl-9"
                           />
                        </div>
                        <Select value={conduceFilterCategoria} onValueChange={setConduceFilterCategoria}>
                           <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Categoría" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="all">Todas las categorías</SelectItem>
                              {categorias.map((cat) => (
                                 <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                        <Select value={conduceFilterCobrable} onValueChange={setConduceFilterCobrable}>
                           <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Cobrable" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="cobrable">Cobrables</SelectItem>
                              <SelectItem value="no_cobrable">No Cobrables</SelectItem>
                           </SelectContent>
                        </Select>
                        <Select value={conduceFilterTipo} onValueChange={setConduceFilterTipo}>
                           <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Tipo" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="CAMION">Camión</SelectItem>
                              <SelectItem value="EQUIPO_PESADO">Equipo Pesado</SelectItem>
                           </SelectContent>
                        </Select>
                     </div>

                     {/* Barra de acciones batch */}
                     {selectedConduceIds.size > 0 && (
                        <div className="flex items-center gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3">
                           <span className="text-sm font-medium text-brand-blue">
                              {selectedConduceIds.size} seleccionado{selectedConduceIds.size > 1 ? "s" : ""}
                           </span>
                           <div className="flex gap-2 ml-auto">
                              <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleToggleConduces(true)}
                                 disabled={toggleConduceLoading}
                              >
                                 {toggleConduceLoading ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                                 Marcar Cobrable
                              </Button>
                              <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleToggleConduces(false)}
                                 disabled={toggleConduceLoading}
                              >
                                 {toggleConduceLoading ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                                 Marcar No Cobrable
                              </Button>
                              <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => setSelectedConduceIds(new Set())}
                              >
                                 <X className="size-3" />
                              </Button>
                           </div>
                        </div>
                     )}

                     {/* Botón PDF */}
                     <div className="flex justify-end">
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleGenerarPDF("conduces")}
                           disabled={pdfLoading !== null}
                        >
                           {pdfLoading === "conduces" ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                           ) : (
                              <FileText className="mr-2 size-4" />
                           )}
                           {selectedConduceIds.size > 0
                              ? `PDF Seleccionados (${selectedConduceIds.size})`
                              : "PDF Cobrables"}
                        </Button>
                     </div>

                     {/* Tabla de conduces agrupados */}
                     {conducesLoading ? (
                        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                           <Loader2 className="mr-2 size-4 animate-spin" /> Cargando conduces...
                        </div>
                     ) : conducesFiltrados.length === 0 ? (
                        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                           No hay conduces con los filtros actuales.
                        </div>
                     ) : (
                        <Accordion type="multiple" className="space-y-0">
                           {Object.entries(conducesGrouped).map(([categoria, items]) => (
                              <ConduceCategoryGroup
                                 key={categoria}
                                 categoria={categoria}
                                 items={items}
                                 selectedIds={selectedConduceIds}
                                 onSelectIds={setSelectedConduceIds}
                                 onToggleCategory={handleToggleCategory}
                                 onDetail={setConduceDetalle}
                                 onEdit={setConduceAEditar}
                                 onDelete={setConduceAEliminar} onToggleOne={function (id: string, esCobrable: boolean): void {
                                    throw new Error("Function not implemented.");
                                 }} toggleLoading={false} />
                           ))}
                        </Accordion>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>

            {/* TAB: COBRABLES */}
            <TabsContent value="cobrables" className="space-y-4">
               <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                     <div>
                        <CardTitle>Cargos cobrables</CardTitle>
                        <CardDescription>Se incluyen en la factura del cliente.</CardDescription>
                     </div>
                  </CardHeader>
                  <CardContent className="p-0">
                     <DetalleTable
                        rows={cargosCobrables}
                        selectedIds={selectedDetalleIds}
                        onSelectIds={setSelectedDetalleIds}
                        moveLabel="Mover a Incobrables"
                        onMove={() => handleToggleDetalle(false)}
                        moveLoading={toggleDetalleLoading}
                        canMove={selectedDetalleIds.size > 0}
                     />
                  </CardContent>
               </Card>
            </TabsContent>

            {/* TAB: INCOBRABLES */}
            <TabsContent value="incobrables" className="space-y-4">
               <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                     <div>
                        <CardTitle>Gastos incobrables / internos</CardTitle>
                        <CardDescription>Solo afectan la rentabilidad interna y no se facturan al cliente.</CardDescription>
                     </div>
                  </CardHeader>
                  <CardContent className="p-0">
                     <DetalleTable
                        rows={gastosInternos}
                        selectedIds={selectedDetalleIds}
                        onSelectIds={setSelectedDetalleIds}
                        moveLabel="Mover a Cobrables"
                        onMove={() => handleToggleDetalle(true)}
                        moveLoading={toggleDetalleLoading}
                        canMove={selectedDetalleIds.size > 0}
                     />
                  </CardContent>
               </Card>
            </TabsContent>
         </Tabs>

         {/* Conduce dialogs */}
         <ConduceDetalleDialog
            conduce={conduceDetalle}
            open={!!conduceDetalle}
            onOpenChange={(v) => !v && setConduceDetalle(null)}
         />
         <ConduceEditDialog
            conduce={conduceAEditar}
            open={!!conduceAEditar}
            onOpenChange={(v) => !v && setConduceAEditar(null)}
         />
         <ConduceDeleteDialog
            conduce={conduceAEliminar}
            open={!!conduceAEliminar}
            onOpenChange={(v) => !v && setConduceAEliminar(null)}
            onConfirm={handleDeleteConduce}
         />
      </div>
   );
}

// ── StatBox ───────────────────────────────────────────────────────────────
function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
   return (
      <div className="rounded-lg border bg-muted/20 p-4">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className={`mt-1 text-lg font-semibold ${accent ?? ""}`}>{value}</p>
      </div>
   );
}

// ── DetalleTable con selección ────────────────────────────────────────────
function DetalleTable({
   rows,
   selectedIds,
   onSelectIds,
   moveLabel,
   onMove,
   moveLoading,
   canMove,
}: {
   rows: ProyectoDetalle[];
   selectedIds: Set<string>;
   onSelectIds: (ids: Set<string>) => void;
   moveLabel: string;
   onMove: () => void;
   moveLoading: boolean;
   canMove: boolean;
}) {
   const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

   function toggleAll() {
      if (allSelected) onSelectIds(new Set());
      else onSelectIds(new Set(rows.map((r) => r.id)));
   }

   function toggleOne(id: string) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectIds(next);
   }

   if (rows.length === 0) {
      return <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">Sin registros.</div>;
   }

   return (
      <div>
         {canMove && (
            <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-4 py-2">
               <span className="text-sm font-medium">
                  {selectedIds.size} seleccionado{selectedIds.size > 1 ? "s" : ""}
               </span>
               <Button
                  size="sm"
                  variant="outline"
                  onClick={onMove}
                  disabled={moveLoading}
                  className="ml-auto"
               >
                  {moveLoading ? <Loader2 className="mr-1 size-3 animate-spin" /> : <ArrowRight className="mr-1 size-3" />}
                  {moveLabel}
               </Button>
            </div>
         )}
         <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr className="border-b border-border bg-muted/40">
                     <th className="px-4 py-3 w-10">
                        <Checkbox
                           checked={allSelected}
                           onCheckedChange={toggleAll}
                        />
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Descripción</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Cantidad</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">P. Unit.</th>
                     <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                  </tr>
               </thead>
               <tbody>
                  {rows.map((r) => (
                     <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">
                           <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={() => toggleOne(r.id)}
                           />
                        </td>
                        <td className="px-4 py-3">{r.descripcion}</td>
                        <td className="px-4 py-3 text-right">{r.cantidad}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(r.precio_unitario)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.subtotal)}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
}

// ── ConduceCategoryGroup (acordeón) ───────────────────────────────────────
const CAT_PAGE_SIZE = 20;

function ConduceCategoryGroup({
   categoria,
   items,
   selectedIds,
   onSelectIds,
   onToggleCategory,
   onToggleOne,
   toggleLoading,
   onDetail,
   onEdit,
   onDelete,
}: {
   categoria: string;
   items: ConduceDTO[];
   selectedIds: Set<string>;
   onSelectIds: (ids: Set<string>) => void;
   onToggleCategory: (categoria: string, checked: boolean) => void;
   onToggleOne: (id: string, esCobrable: boolean) => void;
   toggleLoading: boolean;
   onDetail: (c: ConduceDTO) => void;
   onEdit: (c: ConduceDTO) => void;
   onDelete: (c: ConduceDTO) => void;
}) {
   const [page, setPage] = useState(1);
   const totalPages = Math.ceil(items.length / CAT_PAGE_SIZE);
   const paginatedItems = items.slice((page - 1) * CAT_PAGE_SIZE, page * CAT_PAGE_SIZE);

   const allSelected = items.every((c) => selectedIds.has(c.id));
   const someSelected = items.some((c) => selectedIds.has(c.id)) && !allSelected;
   const subtotalCategoria = items.reduce((sum, c) => sum + c.subtotal, 0);
   const subtotalCobrables = items.filter((c) => c.es_cobrable).reduce((sum, c) => sum + c.subtotal, 0);

   return (
      <AccordionItem value={categoria} className="border rounded-lg mb-2">
         <div className="flex items-center bg-muted/30">
            <div className="pl-4 py-3">
               <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => onToggleCategory(categoria, checked === true)}
               />
            </div>
            <AccordionTrigger className="flex-1 py-3 pr-4 hover:no-underline [&[data-state=open]]:border-b">
               <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-semibold text-sm truncate">{categoria}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{items.length}</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                     {formatMoney(subtotalCategoria)}
                  </span>
                  {subtotalCobrables < subtotalCategoria && (
                     <span className="text-xs text-green-600 shrink-0">
                        Cobrables: {formatMoney(subtotalCobrables)}
                     </span>
                  )}
               </div>
            </AccordionTrigger>
         </div>
         <AccordionContent className="px-0 pb-0">
            <div className="overflow-x-auto">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="border-b border-border bg-muted/20">
                        <th className="px-4 py-2 w-10" />
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Referencia</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Equipo</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Operador</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Cant./Horas</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Subtotal</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Cobrable</th>
                        <th className="px-4 py-2" />
                     </tr>
                  </thead>
                  <tbody>
                     {paginatedItems.map((c) => (
                        <tr key={c.id} className="border-t border-border hover:bg-muted/10">
                           <td className="px-4 py-2">
                              <Checkbox
                                 checked={selectedIds.has(c.id)}
                                 onCheckedChange={() => {
                                    const next = new Set(selectedIds);
                                    if (next.has(c.id)) next.delete(c.id);
                                    else next.add(c.id);
                                    onSelectIds(next);
                                 }}
                              />
                           </td>
                           <td className="px-4 py-2">
                              {c.tipo_conduce === "CAMION" ? (
                                 <Badge className="border-0 bg-blue-100 text-blue-800 text-xs gap-1">
                                    <Truck className="size-3" /> Camión
                                 </Badge>
                              ) : (
                                 <Badge className="border-0 bg-orange-100 text-orange-800 text-xs gap-1">
                                    <HardHat className="size-3" /> Equipo
                                 </Badge>
                              )}
                           </td>
                           <td className="px-4 py-2">
                              <button
                                 type="button"
                                 onClick={() => onDetail(c)}
                                 className="font-medium text-left hover:underline hover:text-blue-600"
                              >
                                 {c.numero_referencia}
                              </button>
                           </td>
                           <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                              {new Date(c.fecha).toLocaleDateString("es-DO")}
                           </td>
                           <td className="px-4 py-2">{c.equipo_nombre ?? "—"}</td>
                           <td className="px-4 py-2">{c.operador_nombre ?? "—"}</td>
                           <td className="px-4 py-2 text-right whitespace-nowrap">
                              {c.tipo_conduce === "CAMION"
                                 ? `${c.categoria_equipo_tarifa_nombre ?? "S.T."} / ${c.cantidad}`
                                 : `${c.total_horas.toFixed(2)} h`}
                           </td>
                           <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">
                              RD$ {c.subtotal.toLocaleString("es-DO")}
                           </td>
                           <td className="px-4 py-2 text-center">
                              <Switch
                                 size="sm"
                                 checked={c.es_cobrable}
                                 disabled={toggleLoading}
                                 onCheckedChange={(checked) => onToggleOne(c.id, checked)}
                              />
                           </td>
                           <td className="px-4 py-2">
                              <div className="flex items-center justify-end gap-1">
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => onDetail(c)}
                                 >
                                    <Eye className="h-4 w-4" />
                                 </Button>
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => onEdit(c)}
                                 >
                                    <Pencil className="h-4 w-4" />
                                 </Button>
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => onDelete(c)}
                                 >
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {totalPages > 1 && (
               <div className="flex items-center justify-between border-t border-border bg-muted/10 px-4 py-2">
                  <span className="text-xs text-muted-foreground">
                     Mostrando {(page - 1) * CAT_PAGE_SIZE + 1}–{Math.min(page * CAT_PAGE_SIZE, items.length)} de {items.length}
                  </span>
                  <div className="flex items-center gap-1">
                     <Button
                        variant="outline"
                        size="icon"
                        className="size-7"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                     >
                        <ChevronLeft className="size-4" />
                     </Button>
                     {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                        .reduce<(number | "...")[]>((acc, p, i, arr) => {
                           if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                           acc.push(p);
                           return acc;
                        }, [])
                        .map((p, i) =>
                           p === "..." ? (
                              <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                           ) : (
                              <Button
                                 key={p}
                                 variant={p === page ? "default" : "outline"}
                                 size="icon"
                                 className="size-7 text-xs"
                                 onClick={() => setPage(p as number)}
                              >
                                 {p}
                              </Button>
                           )
                        )}
                     <Button
                        variant="outline"
                        size="icon"
                        className="size-7"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                     >
                        <ChevronRight className="size-4" />
                     </Button>
                  </div>
               </div>
            )}
         </AccordionContent>
      </AccordionItem>
   );
}
