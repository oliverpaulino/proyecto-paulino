"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
   Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
   ArrowLeft, Loader2, Lock,
} from "lucide-react";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { generateProyectoInternoPDF } from "@/lib/pdf/proyecto-interno-pdf";
import { generateProyectoFacturaPDF } from "@/lib/pdf/proyecto-factura-pdf";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { ProyectoHeader } from "./components/ProyectoHeader";
import { GeneralTab } from "./components/GeneralTab";
import { ConducesTab } from "./components/ConducesTab";
import { CobranzaTab } from "./components/CobranzaTab";
import { GastosProyectoTab } from "./components/GastosProyectoTab";
import ConfiguracionTab from "./components/Configuracion-tab";
import { ArchivosTab } from "./components/ArchivosTab";

export default function ProyectoDetailPage() {
   const params = useParams();
   const router = useRouter();
   const searchParams = useSearchParams();
   const proyectoId = params.id as string;

   const { proyecto: proyectoStore } = useProyectoStore();

   const [proyecto, setProyecto] = useState<Proyecto | null>(null);
   const [loading, setLoading] = useState(true);
   const [pdfLoading, setPdfLoading] = useState<"interno" | "factura" | null>(null);

   // Tab sincronizado con URL (?tab=)
   const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general");

   const handleTabChange = useCallback((value: string) => {
      setActiveTab(value);
      router.replace(`/dashboard/proyectos/${proyectoId}?tab=${value}`, { scroll: false });
   }, [proyectoId, router]);

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
            await loadProyecto();
         } finally {
            setLoading(false);
         }
      }
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [proyectoId]);

   useEffect(() => {
      if (proyecto && proyecto.nombre) {
         document.title = `${proyecto.nombre} - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;
      } else {
         document.title = "Cargando Proyecto...";
      }
   }, [proyecto, activeTab]);

   // El store es la fuente de verdad cuando cambia (p. ej. ChangeEstado desde Configuración);
   // así el header refleja el nuevo estado sin depender de refrescar la página.
   useEffect(() => {
      if (proyectoStore?.id === proyectoId) {
         setProyecto(proyectoStore);
      }
   }, [proyectoStore, proyectoId]);
   /*
      Los conduces se pasan explícitamente desde el store: `proyecto.conduces`
      puede venir vacío según el endpoint, y el store ya los tiene cargados y
      frescos para esta pantalla.
   */
   async function handleGenerarPDF(tipo: "interno" | "factura") {
      if (!proyecto) return;
      setPdfLoading(tipo);
      try {
         if (tipo === "interno") {
            await generateProyectoInternoPDF(proyecto);
         } else if (tipo === "factura") {
            await generateProyectoFacturaPDF(proyecto);
         }
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

   const locked = proyecto.estado === "COMPLETADO";

   return (
      <div className="flex flex-col gap-6 p-6">
         <ProyectoHeader proyecto={proyecto} pdfLoading={pdfLoading} onPDF={handleGenerarPDF} onBack={() => router.push("/dashboard/proyectos")} />

         {locked && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
               <Lock className="size-4 shrink-0" />
               <span>
                  Este proyecto está <strong>COMPLETADO</strong> y bloqueado. Para agregar o editar
                  conduces, gastos, archivos o tarifas, primero cámbialo a otro estado desde la
                  pestaña <strong>Configuración</strong>.
               </span>
            </div>
         )}

         <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent">
               <TabsTrigger value="general" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  General
               </TabsTrigger>
               <TabsTrigger value="configuracion" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Configuración
               </TabsTrigger>
               <TabsTrigger value="conduces" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Conduces
               </TabsTrigger>
               <TabsTrigger value="cobranza" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Cobranza
               </TabsTrigger>
               <TabsTrigger value="cobrables" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Cobrables
               </TabsTrigger>
               <TabsTrigger value="incobrables" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Incobrables
               </TabsTrigger>
               <TabsTrigger value="archivos" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Archivos
               </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
               <GeneralTab proyecto={proyecto} locked={locked} onProyectoChange={loadProyecto} />
            </TabsContent>

            <TabsContent value="configuracion" className="space-y-4">
               <ConfiguracionTab proyectoId={proyectoId} onProyectoChange={loadProyecto} locked={locked} />
            </TabsContent>

            <TabsContent value="conduces" className="space-y-4">
               <ConducesTab proyecto={proyecto} onProyectoChange={loadProyecto} locked={locked} />
            </TabsContent>

            <TabsContent value="cobranza" className="space-y-4">
               <CobranzaTab proyecto={proyecto} />
            </TabsContent>

            <TabsContent value="cobrables" className="space-y-4">
               <GastosProyectoTab proyecto={proyecto} cobrable onProyectoChange={loadProyecto} />
            </TabsContent>

            <TabsContent value="incobrables" className="space-y-4">
               <GastosProyectoTab proyecto={proyecto} cobrable={false} onProyectoChange={loadProyecto} />
            </TabsContent>

            <TabsContent value="archivos" className="space-y-4">
               <ArchivosTab proyectoId={proyectoId} locked={locked} />
            </TabsContent>
         </Tabs>
      </div>
   );
}
