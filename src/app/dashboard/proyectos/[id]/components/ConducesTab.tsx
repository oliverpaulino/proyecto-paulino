"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
   Accordion,
} from "@/components/ui/accordion";
import {
   Loader2, FileText, Plus, Search, X,
} from "lucide-react";
import type { Proyecto } from "@/dtos/proyecto.dto";
import type { CreateConduceForm, ConduceDTO } from "@/dtos/conduce.dto";
import { generateConducesProyectoPDF } from "@/lib/pdf/conduces-proyecto-pdf";
import { useConduceStore } from "@/stores/useConduceStores";
import { ConduceForm } from "../../../conduces/components/conduce-form";
import { ConduceDetalleDialog } from "../../../conduces/components/conduce-detalle-dialog";
import { ConduceEditDialog } from "../../../conduces/components/conduce-edit-dialog";
import { ConduceDeleteDialog } from "../../../conduces/components/conduce-delete-dialog";
import { ConduceCategoryGroup } from "./ConduceCategoryGroup";

export function ConducesTab({
   proyecto,
   onProyectoChange,
}: {
   proyecto: Proyecto;
   onProyectoChange: () => Promise<void>;
}) {
   const {
      categorias,
      categoriasLoading,
      conducesPorCategoria,
      categoriaLoading,
      GetCategoriasByProyecto,
      GetConducesByCategoria,
      CreateConduce,
      DeleteConduce,
      BulkToggleCobrable,
   } = useConduceStore();

   // Carga ligera de categorías al montar el componente
   useEffect(() => {
      GetCategoriasByProyecto(proyecto.id);
   }, [proyecto.id, GetCategoriasByProyecto]);

   // ── Filtros ─────────────────────────────────────────────────────────
   const [conduceSearch, setConduceSearch] = useState("");
   const [conduceFilterCategoria, setConduceFilterCategoria] = useState<string>("all");
   const [conduceFilterCobrable, setConduceFilterCobrable] = useState<string>("all");
   const [conduceFilterTipo, setConduceFilterTipo] = useState<string>("all");

   // ── Selección ────────────────────────────────────────────────────────
   const [selectedConduceIds, setSelectedConduceIds] = useState<Set<string>>(new Set());
   const [toggleConduceLoading, setToggleConduceLoading] = useState(false);

   // ── Acordeón ─────────────────────────────────────────────────────────
   const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

   const handleAccordionChange = useCallback((values: string[]) => {
      const newlyOpened = values.filter((v) => !expandedCategories.includes(v));
      for (const cat of newlyOpened) {
         const loaded = useConduceStore.getState().conducesPorCategoria[cat];
         if (!loaded) {
            GetConducesByCategoria(proyecto.id, cat);
         }
      }
      setExpandedCategories(values);
   }, [expandedCategories, GetConducesByCategoria, proyecto.id]);

   // ── Dialogos ─────────────────────────────────────────────────────────
   const [conduceDialogOpen, setConduceDialogOpen] = useState(false);
   const [conduceLoading, setConduceLoading] = useState(false);
   const [conduceDetalle, setConduceDetalle] = useState<ConduceDTO | null>(null);
   const [conduceAEditar, setConduceAEditar] = useState<ConduceDTO | null>(null);
   const [conduceAEliminar, setConduceAEliminar] = useState<ConduceDTO | null>(null);
   const [pdfLoading, setPdfLoading] = useState(false);

   // ── Conduces derivados ──────────────────────────────────────────────
   const allConduces = useMemo(() => Object.values(conducesPorCategoria).flat(), [conducesPorCategoria]);

   const conducesCobrables = allConduces.filter((c) => c.es_cobrable);
   const conducesInternos = allConduces.filter((c) => !c.es_cobrable);

   const handleToggleCategory = useCallback((categoria: string, checked: boolean) => {
      setSelectedConduceIds((prev) => {
         const next = new Set(prev);
         const items = conducesPorCategoria[categoria] ?? [];
         for (const c of items) {
            if (checked) next.add(c.id);
            else next.delete(c.id);
         }
         return next;
      });
   }, [conducesPorCategoria]);

   // ── Toggle cobrable (batch) ──────────────────────────────────────────
   const handleToggleConduces = useCallback(async (esCobrable: boolean) => {
      if (selectedConduceIds.size === 0) return;
      setToggleConduceLoading(true);
      try {
         const result = await BulkToggleCobrable([...selectedConduceIds], esCobrable);
         if (result instanceof Error) throw result;
         setSelectedConduceIds(new Set());
         await onProyectoChange();
      } finally {
         setToggleConduceLoading(false);
      }
   }, [selectedConduceIds, BulkToggleCobrable, onProyectoChange]);

   // ── Toggle cobrable (individual) ─────────────────────────────────────
   const handleToggleOneConduce = useCallback(async (conduceId: string, esCobrable: boolean) => {
      setToggleConduceLoading(true);
      try {
         const result = await BulkToggleCobrable([conduceId], esCobrable);
         if (result instanceof Error) throw result;
         await onProyectoChange();
      } finally {
         setToggleConduceLoading(false);
      }
   }, [BulkToggleCobrable, onProyectoChange]);

   // ── Crear ────────────────────────────────────────────────────────────
   async function handleCreateConduce(data: CreateConduceForm) {
      setConduceLoading(true);
      try {
         const result = await CreateConduce(data);
         if (result instanceof Error) throw result;
         await onProyectoChange();
         await GetCategoriasByProyecto(proyecto.id);
         setConduceDialogOpen(false);
      } finally {
         setConduceLoading(false);
      }
   }

   // ── Eliminar ─────────────────────────────────────────────────────────
   async function handleDeleteConduce(id: string) {
      try {
         const result = await DeleteConduce(id);
         if (result instanceof Error) throw result;
         await onProyectoChange();
         await GetCategoriasByProyecto(proyecto.id);
      } catch {
         // error handled by store
      }
   }

   // ── PDF ──────────────────────────────────────────────────────────────
   async function handlePDFConduces() {
      setPdfLoading(true);
      try {
         const conducesParaPDF = selectedConduceIds.size > 0
            ? allConduces.filter((c) => selectedConduceIds.has(c.id))
            : conducesCobrables;
         await generateConducesProyectoPDF(proyecto, conducesParaPDF);
      } finally {
         setPdfLoading(false);
      }
   }

   return (
      <>
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
                     fixedProyectoId={proyecto.id}
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
                      {categorias.map(({ nombre }) => (
                         <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>
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
                  onClick={handlePDFConduces}
                  disabled={pdfLoading}
               >
                  {pdfLoading ? (
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
            {categoriasLoading ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Cargando categorías...
               </div>
            ) : categorias.length === 0 ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  No hay conduces en este proyecto.
               </div>
             ) : (
                <Accordion
                   type="multiple"
                   value={expandedCategories}
                   onValueChange={handleAccordionChange}
                   className="space-y-0"
                >
                   {categorias.map(({ nombre, subtotal, subtotalCobrable, count }) => (
                      <ConduceCategoryGroup
                         key={nombre}
                         categoria={nombre}
                         items={conducesPorCategoria[nombre] ?? []}
                         loadingCategoria={categoriaLoading === nombre}
                         resumen={{ subtotal, subtotalCobrable, count }}
                         selectedIds={selectedConduceIds}
                         onSelectIds={setSelectedConduceIds}
                         onToggleCategory={handleToggleCategory}
                         onDetail={setConduceDetalle}
                         onEdit={setConduceAEditar}
                         onDelete={setConduceAEliminar}
                         onToggleOne={handleToggleOneConduce}
                         toggleLoading={toggleConduceLoading}
                      />
                   ))}
                </Accordion>
             )}
         </CardContent>
      </Card>

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
      </>
   );
}
