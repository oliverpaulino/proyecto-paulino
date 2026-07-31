"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Receipt, Loader2 } from "lucide-react";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { ESTADO_BADGE } from "./formatMoney";

function formatFechaRD(iso: string | null | undefined): string {
   if (!iso) return "";
   const d = new Date(iso);
   if (isNaN(d.getTime())) return "";
   return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

export function ProyectoHeader({
   proyecto,
   pdfLoading,
   onPDF,
   onBack,
}: {
   proyecto: Proyecto;
   pdfLoading: "interno" | "factura" | null;
   onPDF: (tipo: "interno" | "factura") => void;
   onBack: () => void;
}) {
   const fechaInicioRD = formatFechaRD(proyecto.fecha_inicio);
   return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
         <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
               <ArrowLeft className="size-4" />
            </Button>
            <div className="space-y-1">
               <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-brand-blue dark:text-white">
                     {proyecto.nombre ?? "Proyecto sin nombre"}
                  </h2>
                  <Badge className={`border-0 text-xs font-medium ${ESTADO_BADGE[proyecto.estado] ?? ""}`}>
                     {proyecto.estado}
                  </Badge>
               </div>
               <p className="text-sm text-muted-foreground">
                  {proyecto.cliente_nombre ?? "Cliente"}
                  {fechaInicioRD ? ` · ${fechaInicioRD}` : ""}
               </p>
            </div>
         </div>

         <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
               variant="outline"
               onClick={() => onPDF("interno")}
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
               onClick={() => onPDF("factura")}
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
   );
}
