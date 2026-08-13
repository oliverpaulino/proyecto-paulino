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
import { Plus, ArrowDownRight, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useDeduccionStore } from "@/stores/useDeduccionStore";
import type { CreateDeduccionForm } from "@/dtos/deducciones.dto";
import { DeduccionForm } from "./components/deduccion-form";
import { DeduccionTable } from "./components/deduccion-table";
import { DeduccionFilters } from "./components/deduccion-filters";

export default function DeduccionesPage() {
   const { Deducciones, loading, pagination, CreateDeduccion, NextPage, PrevPage } = useDeduccionStore();

   const [formLoading, setFormLoading] = useState(false);
   const [createOpen, setCreateOpen] = useState(false);

   async function handleCreate(data: CreateDeduccionForm) {
      setFormLoading(true);
      try {
         const result = await CreateDeduccion(data);
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
               <ArrowDownRight className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Deducciones
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Registro y control de deducciones aplicables a empleados y equipos.
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Controles */}
         <div className="ml-auto w-full sm:w-auto">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
               <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto font-semibold shadow-md border-0">
                     <Plus className="size-4 mr-2" />
                     Registrar Deducción
                  </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                     <DialogTitle>Registrar Nueva Deducción</DialogTitle>
                     <DialogDescription>
                        Ingresa los detalles del descuento, incluyendo empleado y montos correspondientes.
                     </DialogDescription>
                  </DialogHeader>
                  <DeduccionForm
                     onSubmit={handleCreate}
                     onCancel={() => setCreateOpen(false)}
                     loading={formLoading}
                  />
               </DialogContent>
            </Dialog>
         </div>

         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 shrink-0">
            <DeduccionFilters viewLimit={20} />
         </div>

         {/* Tabla */}
         {loading && Deducciones.length === 0 ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando deducciones…
            </div>
         ) : (
            <div className="flex flex-col gap-4">
               <DeduccionTable deducciones={Deducciones} />

               {/* Paginación */}
               <div className="flex flex-col gap-3 items-center justify-between border-t border-border pt-4 sm:flex-row">
                  <span className="text-sm text-muted-foreground">
                     Total: <strong>{pagination.total}</strong> deducciones registradas
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
 
          {useSession().data?.user?.role === "administrador" && (
             <Button asChild variant="outline" className="font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Link href="/dashboard/deducciones/anuladas">
                   <Trash2 className="size-4 mr-2" />
                   Deducciones Anuladas
                </Link>
             </Button>
          )}
      </div>
   );
}