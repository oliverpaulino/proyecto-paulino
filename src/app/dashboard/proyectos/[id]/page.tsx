"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
   Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
   ArrowLeft, Loader2,
} from "lucide-react";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { generateProyectoInternoPDF } from "@/lib/pdf/proyecto-interno-pdf";
import { generateProyectoFacturaPDF } from "@/lib/pdf/proyecto-factura-pdf";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { ProyectoHeader } from "./components/ProyectoHeader";
import { GeneralTab } from "./components/GeneralTab";
import { ConducesTab } from "./components/ConducesTab";
import { CobrablesTab } from "./components/CobrablesTab";
import { IncobrablesTab } from "./components/IncobrablesTab";
import ConfiguracionTab from "./components/Configuracion-tab";

export default function ProyectoDetailPage() {
   const params = useParams();
   const router = useRouter();
   const searchParams = useSearchParams();
   const proyectoId = params.id as string;

   const { ToggleDetalleCobrable } = useProyectoStore();

   const [proyecto, setProyecto] = useState<Proyecto | null>(null);
   const [loading, setLoading] = useState(true);
   const [pdfLoading, setPdfLoading] = useState<"interno" | "factura" | null>(null);

   const [selectedDetalleIds, setSelectedDetalleIds] = useState<Set<string>>(new Set());
   const [toggleDetalleLoading, setToggleDetalleLoading] = useState(false);

   // Tab sincronizado con URL (?tab=)
   const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general");

   const handleTabChange = useCallback((value: string) => {
      setActiveTab(value);
      router.replace(`/dashboard/proyectos/${proyectoId}?tab=${value}`, { scroll: false });
   }, [proyectoId, router]);
   const [pdfError, setPdfError] = useState<string | null>(null);
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

   return (
      <div className="flex flex-col gap-6 p-6">
         <ProyectoHeader proyecto={proyecto} pdfLoading={pdfLoading} onPDF={handleGenerarPDF} onBack={() => router.push("/dashboard/proyectos")} />

         <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto">
               <TabsTrigger value="general">General</TabsTrigger>
               <TabsTrigger value="configuracion">Configuracion</TabsTrigger>
               <TabsTrigger value="conduces">Conduces</TabsTrigger>
               <TabsTrigger value="cobrables">Cobrables</TabsTrigger>
               <TabsTrigger value="incobrables">Incobrables</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
               <GeneralTab proyecto={proyecto} />
            </TabsContent>

            <TabsContent value="configuracion" className="space-y-4">
               <ConfiguracionTab proyectoId={proyectoId} />
            </TabsContent>

            <TabsContent value="conduces" className="space-y-4">
               <ConducesTab proyecto={proyecto} onProyectoChange={loadProyecto} />
            </TabsContent>

            <TabsContent value="cobrables" className="space-y-4">
               <CobrablesTab
                  rows={cargosCobrables}
                  selectedIds={selectedDetalleIds}
                  onSelectIds={setSelectedDetalleIds}
                  onMove={() => handleToggleDetalle(false)}
                  moveLoading={toggleDetalleLoading}
                  canMove={selectedDetalleIds.size > 0}
               />
            </TabsContent>

            <TabsContent value="incobrables" className="space-y-4">
               <IncobrablesTab
                  rows={gastosInternos}
                  selectedIds={selectedDetalleIds}
                  onSelectIds={setSelectedDetalleIds}
                  onMove={() => handleToggleDetalle(true)}
                  moveLoading={toggleDetalleLoading}
                  canMove={selectedDetalleIds.size > 0}
               />
            </TabsContent>
         </Tabs>
      </div>
   );
}
