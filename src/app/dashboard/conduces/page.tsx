"use client";

import { useEffect, useState } from "react";
import { FileStack, Plus, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function ConducesPage() {
   const {
      conduces, total, page, pageSize, loading, filtros,
      GetConduces, CreateConduce, DeleteConduce,
   } = useConduceStore();

   const [createOpen, setCreateOpen] = useState(false);
   const [formLoading, setFormLoading] = useState(false);
   const [deletingId, setDeletingId] = useState<string | null>(null);

   useEffect(() => {
      document.title = "Conduces";
      GetConduces();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

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

   async function handleDelete(id: string) {
      if (!confirm("¿Eliminar este conduce? Esta acción no se puede deshacer.")) return;
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

         <div className="flex justify-end">
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

         <ConduceFiltrosBar filtros={filtros} onChange={handleFiltrosChange} />

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
      </div>
   );
}