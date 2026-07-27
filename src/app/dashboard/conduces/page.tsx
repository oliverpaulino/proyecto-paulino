"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileStack, Plus, ChevronLeft, ChevronRight, Trash2, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import type { ConduceFiltros, CreateConduceForm } from "@/dtos/conduce.dto";
import { useConduceStore } from "@/stores/useConduceStores";
import { ConduceForm } from "./components/conduce-form";
import { ConduceFiltrosBar } from "./components/conduce-filtro";
import { ConduceTable } from "./components/conduce-table";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { generateConducesReportePDF } from "@/lib/pdf/conduces-reporte-pdf";

/** Fija el mediodía para que la zona horaria no corra la fecha un día. */
const fecha = (s: string) =>
   new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO");

// `useSearchParams` obliga a un límite de Suspense para que el prerender no
// falle — misma estructura que las otras pantallas que leen la query.
export default function ConducesPage() {
   return (
      <Suspense
         fallback={
            <div className="flex items-center justify-center p-12">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
            </div>
         }
      >
         <ConducesPageContent />
      </Suspense>
   );
}

function ConducesPageContent() {
   const {
      conduces, total, page, pageSize, loading, filtros,
      SetFiltros, GetConduces, CreateConduce, DeleteConduce, FetchConducesParaReporte,
   } = useConduceStore();

   const searchParams = useSearchParams();
   const [createOpen, setCreateOpen] = useState(false);
   const [formLoading, setFormLoading] = useState(false);
   const [deletingId, setDeletingId] = useState<string | null>(null);
   const [printLoading, setPrintLoading] = useState(false);
   const [printError, setPrintError] = useState<string | null>(null);

   /*
      La nómina enlaza aquí con el chofer ya preseleccionado ("ver los conduces
      de este empleado"). Se acepta por URL para que abra en otra pestaña y siga
      siendo un enlace compartible; el nombre viene en la query solo para
      rotularlo sin tener que pedir el empleado al servidor.
   */
   const empleadoId = searchParams.get("empleado_id") ?? undefined;
   const empleadoNombre = searchParams.get("empleado_nombre") ?? undefined;

   useEffect(() => {
      document.title = empleadoNombre ? `Conduces · ${empleadoNombre}` : "Conduces";
   }, [empleadoNombre]);

   useEffect(() => {
      /*
         Se reemplazan los filtros en vez de fusionarlos: el store es global y
         puede traer lo que el usuario dejó puesto en otra visita, lo que haría
         que el listado del chofer apareciera vacío sin explicación.
      */
      const desdeUrl: ConduceFiltros = {
         page: 1,
         pageSize: filtros.pageSize ?? 25,
         empleado_id: empleadoId,
         fecha_desde: searchParams.get("fecha_desde") ?? undefined,
         fecha_hasta: searchParams.get("fecha_hasta") ?? undefined,
      };
      SetFiltros(desdeUrl);
      GetConduces(desdeUrl);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [searchParams]);

   function handleFiltrosChange(nuevos: ConduceFiltros) {
      GetConduces(nuevos);
   }

   async function handleCreate(data: CreateConduceForm) {
      setFormLoading(true);
      try {
         const result = await CreateConduce(data);
         if (result instanceof Error) throw result;
         // No cerramos el diálogo automáticamente: ConduceForm tiene su propio
         // botón "Guardar y Registrar Otro" para alta en volumen. Si el
         // registro vino del botón "Guardar y Cerrar", cerramos aquí.
      } finally {
         setFormLoading(false);
      }
   }

   /*
      Imprime lo que dicen los filtros, no lo que está en pantalla: el listado
      está paginado, así que se vuelve a pedir el conjunto completo. Los nombres
      de cliente/proyecto/operador se toman de los propios conduces —ya vienen
      resueltos en el DTO— para rotular los filtros en el PDF sin pedir nada más.
   */
   async function handlePrint() {
      setPrintLoading(true);
      setPrintError(null);
      try {
         const todos = await FetchConducesParaReporte(filtros);
         if (todos.length === 0) {
            setPrintError("Ningún conduce coincide con los filtros actuales.");
            return;
         }
         const primero = todos[0];
         await generateConducesReportePDF(todos, filtros, {
            cliente: filtros.cliente_id ? primero.cliente_nombre : undefined,
            proyecto: filtros.proyecto_id ? primero.proyecto_nombre : undefined,
            empleado: filtros.empleado_id ? empleadoNombre ?? primero.operador_nombre : undefined,
            equipo: filtros.equipo_id ? primero.equipo_nombre : undefined,
         });
      } catch (error) {
         console.error("Error al generar el reporte de conduces:", error);
         setPrintError("No se pudo generar el PDF. Intenta de nuevo.");
      } finally {
         setPrintLoading(false);
      }
   }

   async function handleDelete(id: string) {
      // if (!confirm("¿Eliminar este conduce? Esta acción no se puede deshacer.")) return;
      setDeletingId(id);
      try {
         await DeleteConduce(id);
      } finally {
         setDeletingId(null);
      }
   }

   const totalPages = Math.max(1, Math.ceil(total / pageSize));

   return (
      <div className="flex flex-col gap-6 p-6">
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <FileStack className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Conduces
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Registro de conduces de camión y equipo pesado — asignados o pendientes de asignar a un proyecto.
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
               variant="outline"
               onClick={handlePrint}
               disabled={printLoading || loading}
               title="Genera un PDF con todos los conduces que cumplen los filtros actuales"
            >
               {printLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
               ) : (
                  <Printer className="size-4 mr-2" />
               )}
               Imprimir PDF
            </Button>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
               <DialogTrigger asChild>
                  <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                     <Plus className="size-4 mr-2" />
                     Registrar Conduce
                  </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                     <DialogTitle>Registrar Conduce</DialogTitle>
                     <DialogDescription>
                        Camión (viaje/bote de material) o Equipo Pesado (horas trabajadas). El proyecto es opcional —
                        puedes dejarlo "sin asignar" y vincularlo después.
                     </DialogDescription>
                  </DialogHeader>
                  <ConduceForm
                     onSubmit={handleCreate}
                     onCancel={() => setCreateOpen(false)}
                     loading={formLoading}
                  />
               </DialogContent>
            </Dialog>
         </div>

         {filtros.empleado_id && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-3">
               <p className="text-sm">
                  Mostrando solo los conduces de{" "}
                  <strong>{empleadoNombre ?? "el empleado seleccionado"}</strong>
                  {filtros.fecha_desde && filtros.fecha_hasta && (
                     <span className="text-muted-foreground">
                        {" "}
                        · del {fecha(filtros.fecha_desde)} al {fecha(filtros.fecha_hasta)}
                     </span>
                  )}
                  .
               </p>
               <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/conduces">Ver todos los conduces</Link>
               </Button>
            </div>
         )}

         <ConduceFiltrosBar filtros={filtros} onChange={handleFiltrosChange} />

         {printError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
               {printError}
            </p>
         )}

         {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-xl border p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando conduces...
            </div>
         ) : (
            <div className="rounded-xl border overflow-hidden">
               <ConduceTable conduces={conduces} onDelete={handleDelete} deletingId={deletingId} />
            </div>
         )}

         {total > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
               <span>
                  Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
               </span>
               <div className="flex gap-2">
                  <Button
                     variant="outline"
                     size="sm"
                     disabled={page <= 1}
                     onClick={() => GetConduces({ ...filtros, page: page - 1 })}
                  >
                     <ChevronLeft className="size-4" /> Anterior
                  </Button>
                  <Button
                     variant="outline"
                     size="sm"
                     disabled={page >= totalPages}
                     onClick={() => GetConduces({ ...filtros, page: page + 1 })}
                  >
                     Siguiente <ChevronRight className="size-4" />
                  </Button>
               </div>
            </div>
         )}

         {useSession().data?.user?.role === "administrador" && (
            <Button asChild variant="outline" className="font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive">
               <Link href="/dashboard/conduces/eliminados">
                  <Trash2 className="size-4 mr-2" />
                  Conduces Eliminados
               </Link>
            </Button>
         )}
      </div>
   );
}