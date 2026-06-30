"use client";

import { useEffect, useState } from "react";
import { Zap, FolderOpen, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { ProyectoExpressForm } from "./components/proyecto-express-form";
import { ProyectoExpressTable } from "./components/proyecto-express-table";
import type { CreateProyectoExpressForm } from "@/dtos/proyecto.dto";

const STAT_STYLES = {
   blue: {
      card: "bg-brand-blue shadow-lg shadow-brand-blue/20",
      label: "text-blue-200",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
   yellow: {
      card: "bg-brand-yellow shadow-lg shadow-brand-yellow/30",
      label: "text-yellow-700",
      value: "text-brand-black",
      bar: "bg-brand-blue",
   },
   dark: {
      card: "bg-brand-black shadow-lg shadow-black/30",
      label: "text-gray-400",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
} as const;

export default function ProyectosPage() {
   const { proyectos, loading, GetProyectos, CreateExpressProyecto } = useProyectoStore();

   const [formLoading, setFormLoading] = useState(false);
   const [createOpen, setCreateOpen]   = useState(false);

   useEffect(() => {
      GetProyectos("EXPRESS");
   }, [GetProyectos]);

   const expressList   = proyectos.filter((p) => p.tipo_proyecto === "EXPRESS");
   const completados   = expressList.filter((p) => p.estado === "COMPLETADO").length;
   const rentabilidad  = expressList.reduce((s, p) => s + p.rentabilidad, 0);

   async function handleCreateExpress(data: CreateProyectoExpressForm) {
      setFormLoading(true);
      try {
         const result = await CreateExpressProyecto(data);
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
               <FolderOpen className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Proyectos
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestión de proyectos de construcción
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         <Tabs defaultValue="express">
            <TabsList className="mb-2">
               <TabsTrigger value="grandes">Proyectos Grandes</TabsTrigger>
               <TabsTrigger value="normales">Proyectos Normales</TabsTrigger>
               <TabsTrigger value="express" className="gap-1.5">
                  <Zap className="size-3.5" />
                  Proyectos Express
               </TabsTrigger>
            </TabsList>

            {/* ── Grandes ── */}
            <TabsContent value="grandes">
               <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed text-muted-foreground text-sm">
                  Módulo de Proyectos Grandes — próximamente
               </div>
            </TabsContent>

            {/* ── Normales ── */}
            <TabsContent value="normales">
               <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed text-muted-foreground text-sm">
                  Módulo de Proyectos Normales — próximamente
               </div>
            </TabsContent>

            {/* ── Express ── */}
            <TabsContent value="express" className="space-y-5">

               {/* Stats */}
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <StatCard label="Total Express"   value={expressList.length} accent="blue" />
                  <StatCard label="Completados"      value={completados}         accent="yellow" />
                  <StatCard
                     label="Rentabilidad Total"
                     value={`RD$ ${rentabilidad.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`}
                     accent="dark"
                  />
               </div>

               {/* Toolbar */}
               <div className="flex justify-end">
                  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                     <DialogTrigger asChild>
                        <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                           <Plus className="size-4 mr-2" />
                           Nueva Liquidación Express
                        </Button>
                     </DialogTrigger>
                     <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                           <DialogTitle className="flex items-center gap-2">
                              <Zap className="size-4 text-brand-yellow" />
                              Proyecto Express
                           </DialogTitle>
                           <DialogDescription>
                              Liquidación rápida — se registra como COMPLETADO al guardar.
                           </DialogDescription>
                        </DialogHeader>
                        <ProyectoExpressForm
                           onSubmit={handleCreateExpress}
                           onCancel={() => setCreateOpen(false)}
                           loading={formLoading}
                        />
                     </DialogContent>
                  </Dialog>
               </div>

               {/* Table */}
               {loading ? (
                  <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
                     <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
                     Cargando proyectos express…
                  </div>
               ) : (
                  <ProyectoExpressTable proyectos={expressList} />
               )}
            </TabsContent>
         </Tabs>
      </div>
   );
}

function StatCard({
   label,
   value,
   accent,
}: {
   label: string;
   value: number | string;
   accent: keyof typeof STAT_STYLES;
}) {
   const s = STAT_STYLES[accent];
   return (
      <div className={`rounded-xl ${s.card} p-5`}>
         <p className={`text-sm font-medium ${s.label}`}>{label}</p>
         <p className={`mt-1 text-3xl font-bold ${s.value}`}>{value}</p>
         <div className={`mt-3 h-1 w-10 rounded-full ${s.bar}`} />
      </div>
   );
}
