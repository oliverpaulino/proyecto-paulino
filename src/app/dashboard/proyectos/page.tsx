"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
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
import type { CreateProyectoForm } from "@/dtos/proyecto.dto";
import { ProyectoTable } from "./components/proyecto-table";
import { ProyectoForm } from "./components/proyecto-form";

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
   const {
      proyectos,
      loading,
      GetProyectos,
      CreateProyecto,
   } = useProyectoStore();

   const [formLoading, setFormLoading] = useState(false);
   const [createOpen, setCreateOpen] = useState(false);

   useEffect(() => {
      document.title = "Proyectos";
      GetProyectos();
   }, [GetProyectos]);

   const completados = proyectos.filter(
      (p) => p.estado === "COMPLETADO"
   ).length;

   const rentabilidad = proyectos.reduce(
      (s, p) => s + p.rentabilidad,
      0
   );

   async function handleCreate(data: CreateProyectoForm) {
      setFormLoading(true);

      try {
         // Convert date strings to Date objects to satisfy CreateProyecto DTO
         const payload = {
            ...data,
            fecha_inicio: data.fecha_inicio ? new Date(data.fecha_inicio) : undefined,
            fecha_fin: data.fecha_fin ? new Date(data.fecha_fin) : undefined,
         } as any;

         const result = await CreateProyecto(payload);

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
               Registro de trabajos realizados y su rentabilidad
            </p>

            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Estadísticas */}

         <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
               label="Total Proyectos"
               value={proyectos.length}
               accent="blue"
            />

            <StatCard
               label="Completados"
               value={completados}
               accent="yellow"
            />

            <StatCard
               label="Rentabilidad Total"
               value={`RD$ ${rentabilidad.toLocaleString("es-DO", {
                  maximumFractionDigits: 0,
               })}`}
               accent="dark"
            />
         </div>

         {/* Toolbar */}

         <div className="flex justify-end">
            <Dialog
               open={createOpen}
               onOpenChange={setCreateOpen}
            >
               <DialogTrigger asChild>
                  <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                     <Plus className="size-4 mr-2" />
                     Nuevo Proyecto
                  </Button>
               </DialogTrigger>

               <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                     <DialogTitle>
                        Nuevo Proyecto
                     </DialogTitle>

                     <DialogDescription>
                        Registre el trabajo realizado, los equipos utilizados,
                        cargos cobrables y gastos internos.
                     </DialogDescription>
                  </DialogHeader>

                  <ProyectoForm
                     onSubmit={handleCreate}
                     onCancel={() => setCreateOpen(false)}
                     loading={formLoading}
                  />
               </DialogContent>
            </Dialog>
         </div>
         {/* Tabla */}

         {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-xl border p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando proyectos...
            </div>
         ) : (
            <ProyectoTable proyectos={proyectos} />
         )}
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
         <p className={`text-sm font-medium ${s.label}`}>
            {label}
         </p>

         <p className={`mt-1 text-3xl font-bold ${s.value}`}>
            {value}
         </p>

         <div
            className={`mt-3 h-1 w-10 rounded-full ${s.bar}`}
         />
      </div>
   );
}