"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { useCostoStore } from "@/stores/useCostoStore";
import type { CreateCostoForm } from "@/dtos/costos.dto";
import { CostoForm } from "./components/costo-form";
import { CostoTable } from "./components/costo-table";
import { CostoFilters } from "./components/costo-filters";

export default function CostosPage() {
   const { Costos, loading, pagination, CreateCosto, NextPage, PrevPage } = useCostoStore();

   const [formLoading, setFormLoading] = useState(false);
   const [createOpen, setCreateOpen] = useState(false);

   async function handleCreate(data: CreateCostoForm) {
      setFormLoading(true);
      try {
         const result = await CreateCosto(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Receipt className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Costos
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Registro y control de costos asociados a los proyectos operativos.
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Controles: Filtros (Búsqueda + Fechas) y Botón Nuevo */}
         <div className="ml-auto w-full sm:w-auto">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
               <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto font-semibold shadow-md border-0">
                     <Plus className="size-4 mr-2" />
                     Registrar Costo
                  </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                     <DialogTitle>Registrar Nuevo Costo</DialogTitle>
                     <DialogDescription>
                        Ingresa los detalles del costo y el proyecto correspondiente.
                     </DialogDescription>
                  </DialogHeader>
                  <CostoForm
                     onSubmit={handleCreate}
                     onCancel={() => setCreateOpen(false)}
                     loading={formLoading}
                  />
               </DialogContent>
            </Dialog>
         </div>

         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 shrink-0">
            <CostoFilters viewLimit={20} />
         </div>

         {/* Tabla */}
         {loading && Costos.length === 0 ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando costos…
            </div>
         ) : (
            <div className="flex flex-col gap-4">
               <CostoTable costos={Costos} />

               {/* Paginación */}
               <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">
                     Total: <strong>{pagination.total}</strong> costos registrados
                  </span>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" onClick={PrevPage} disabled={!pagination.hasPrev || loading}>
                        <ChevronLeft className="size-4 mr-1" /> Anterior
                     </Button>
                     <span className="text-xs font-medium px-2 text-foreground">
                        Pág. {pagination.page} / {pagination.totalPages || 1}
                     </span>
                     <Button variant="outline" size="sm" onClick={NextPage} disabled={!pagination.hasNext || loading}>
                        Siguiente <ChevronRight className="size-4 ml-1" />
                     </Button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}