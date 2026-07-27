"use client";

import { useEffect, useState } from "react";
import {
   Breadcrumb,
   BreadcrumbItem,
   BreadcrumbList,
   BreadcrumbPage,
   BreadcrumbSeparator,
   BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Calculator, Plus, Lock, Loader2, TriangleAlert, RefreshCw, Receipt, FileDown } from "lucide-react";
import Link from "next/link";
import { useNominaStore, type EstadoCiclo } from "@/stores/useNominaStore";
import { NominaTable } from "./components/nomina-table";
import { generateNominaPDF } from "@/lib/pdf/nomina-pdf";
import { CycleForm } from "./components/cycle-form";

const ESTADO_STYLE: Record<EstadoCiclo, string> = {
   ABIERTO: "bg-gray-100 text-gray-700",
   CALCULADO: "bg-blue-100 text-blue-800",
   CERRADO: "bg-green-100 text-green-800",
   PAGADO: "bg-emerald-100 text-emerald-800",
};

const money = (n: number) =>
   `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fecha = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("es-DO");

export default function NominaPage() {
   const {
      cycles,
      selectedCycle,
      empleados,
      loading,
      calculando,
      error,
      ultimoCalculo,
      GetCycles,
      SelectCycle,
      GetEmpleados,
      CalcularCiclo,
      CerrarCiclo,
      RefrescarDeducciones,
   } = useNominaStore();

   const [dialogAbierto, setDialogAbierto] = useState(false);
   const [refrescando, setRefrescando] = useState(false);
   const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
   const [generandoPdf, setGenerandoPdf] = useState(false);
   const [avisoRefresco, setAvisoRefresco] = useState<string | null>(null);

   useEffect(() => {
      GetCycles();
   }, [GetCycles]);

   useEffect(() => {
      if (selectedCycle) GetEmpleados(selectedCycle.id);
      setSeleccionados(new Set());
   }, [selectedCycle, GetEmpleados]);

   const cerrado = selectedCycle?.estado === "CERRADO" || selectedCycle?.estado === "PAGADO";

   function toggle(id: string) {
      setSeleccionados((prev) => {
         const s = new Set(prev);
         s.has(id) ? s.delete(id) : s.add(id);
         return s;
      });
   }

   function toggleTodos(marcar: boolean) {
      setSeleccionados(marcar ? new Set(empleados.map((e) => e.id)) : new Set());
   }

   /** Sin selección se exporta el ciclo completo; con selección, solo esos. */
   async function descargarPdf() {
      if (!selectedCycle) return;
      const elegidos =
         seleccionados.size > 0 ? empleados.filter((e) => seleccionados.has(e.id)) : empleados;
      if (elegidos.length === 0) return;

      setGenerandoPdf(true);
      try {
         await generateNominaPDF(selectedCycle, elegidos);
      } finally {
         setGenerandoPdf(false);
      }
   }

   return (
      <>
         <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
               <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
               <Breadcrumb>
                  <BreadcrumbList>
                     <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                     </BreadcrumbItem>
                     <BreadcrumbSeparator className="hidden md:block" />
                     <BreadcrumbItem>
                        <BreadcrumbPage>Nómina</BreadcrumbPage>
                     </BreadcrumbItem>
                  </BreadcrumbList>
               </Breadcrumb>
            </div>
         </header>

         <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
               <div>
                  <h1 className="text-xl font-bold">Nómina</h1>
                  <p className="text-sm text-muted-foreground">
                     Los choferes cobran la producción de sus conduces, con el salario como
                     mínimo garantizado. El resto del personal cobra su salario del período.
                  </p>
               </div>

               <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
                  <DialogTrigger asChild>
                     <Button className="gap-2">
                        <Plus className="size-4" /> Nuevo ciclo
                     </Button>
                  </DialogTrigger>
                  <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Nuevo ciclo de nómina</DialogTitle>
                     </DialogHeader>
                     <CycleForm onDone={() => setDialogAbierto(false)} />
                  </DialogContent>
               </Dialog>
            </div>

            {error && (
               <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {error}
               </div>
            )}

            {/* ── Selector de ciclo ── */}
            <div className="flex flex-wrap gap-2">
               {loading && cycles.length === 0 ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
               ) : cycles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                     No hay ciclos todavía. Crea el primero para calcular la nómina.
                  </p>
               ) : (
                  cycles.map((c) => (
                     <button
                        key={c.id}
                        onClick={() => SelectCycle(c)}
                        className={`rounded-lg border px-3 py-2 text-left transition ${
                           selectedCycle?.id === c.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/40"
                        }`}
                     >
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-medium">{c.nombre}</span>
                           <Badge className={`border-0 text-[10px] ${ESTADO_STYLE[c.estado]}`}>
                              {c.estado}
                           </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                           {fecha(c.fecha_inicio)} — {fecha(c.fecha_fin)}
                        </div>
                     </button>
                  ))
               )}
            </div>

            {selectedCycle && (
               <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
                     <div>
                        <p className="font-semibold">{selectedCycle.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                           {fecha(selectedCycle.fecha_inicio)} — {fecha(selectedCycle.fecha_fin)} ·{" "}
                           {selectedCycle.frecuencia}
                        </p>
                        {selectedCycle.gasto_id && (
                           <Link
                              href={`/dashboard/gastos/${selectedCycle.gasto_id}`}
                              className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                           >
                              <Receipt className="size-3" />
                              Ver el gasto generado
                           </Link>
                        )}
                     </div>

                     <div className="flex gap-2">
                        <Button
                           onClick={() => CalcularCiclo(selectedCycle.id)}
                           disabled={calculando || cerrado}
                           className="gap-2"
                        >
                           {calculando ? (
                              <Loader2 className="size-4 animate-spin" />
                           ) : (
                              <Calculator className="size-4" />
                           )}
                           {calculando ? "Calculando..." : "Calcular nómina"}
                        </Button>

                        {/*
                           Recoge las deducciones que se hayan creado a mano
                           después de calcular, sin rehacer la producción ni
                           perder los ajustes manuales.
                        */}
                        <Button
                           variant="outline"
                           className="gap-2"
                           disabled={cerrado || empleados.length === 0 || refrescando}
                           onClick={async () => {
                              setRefrescando(true);
                              const n = await RefrescarDeducciones(selectedCycle.id);
                              setRefrescando(false);
                              setAvisoRefresco(
                                 n === 0
                                    ? "Las deducciones ya estaban al día."
                                    : `${n} chofer(es) actualizados.`
                              );
                              setTimeout(() => setAvisoRefresco(null), 4000);
                           }}
                        >
                           <RefreshCw
                              className={`size-4 ${refrescando ? "animate-spin" : ""}`}
                           />
                           Refrescar deducciones
                        </Button>

                        {/* Sin selección exporta el ciclo entero; con
                            selección, solo los marcados. */}
                        <Button
                           variant="outline"
                           className="gap-2"
                           disabled={empleados.length === 0 || generandoPdf}
                           onClick={descargarPdf}
                        >
                           {generandoPdf ? (
                              <Loader2 className="size-4 animate-spin" />
                           ) : (
                              <FileDown className="size-4" />
                           )}
                           {seleccionados.size > 0
                              ? `PDF (${seleccionados.size})`
                              : "PDF del ciclo"}
                        </Button>

                        <Button
                           variant="outline"
                           className="gap-2"
                           disabled={cerrado || empleados.length === 0}
                           onClick={() => {
                              const total = empleados.reduce((s, e) => s + e.neto_pagar, 0);
                              if (
                                 confirm(
                                    `¿Cerrar el ciclo?\n\n` +
                                       `Los montos quedarán congelados y se creará un gasto de ` +
                                       `${money(total)} por la nómina.`
                                 )
                              ) {
                                 CerrarCiclo(selectedCycle.id);
                              }
                           }}
                        >
                           <Lock className="size-4" /> Cerrar
                        </Button>
                     </div>
                  </div>

                  {avisoRefresco && (
                     <div className="rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-800">
                        {avisoRefresco}
                     </div>
                  )}

                  {ultimoCalculo && (
                     <div className="flex flex-wrap gap-4 rounded-lg border bg-background p-3 text-sm">
                        <span>
                           <strong>{ultimoCalculo.empleados_procesados}</strong> empleados
                           {" ("}
                           {ultimoCalculo.choferes} chofer
                           {ultimoCalculo.choferes === 1 ? "" : "es"}
                           {", "}
                           {ultimoCalculo.asalariados} asalariado
                           {ultimoCalculo.asalariados === 1 ? "" : "s"}
                           {")"}
                        </span>
                        <span>
                           Neto total: <strong>{money(ultimoCalculo.total_neto)}</strong>
                        </span>
                        {ultimoCalculo.conduces_sin_tarifa > 0 && (
                           <span className="flex items-center gap-1 text-amber-600">
                              <TriangleAlert className="size-4" />
                              {ultimoCalculo.conduces_sin_tarifa} conduce(s) sin tarifa asignada al
                              chofer — se contaron en 0
                           </span>
                        )}
                        {ultimoCalculo.empleados_con_inferencia > 0 && (
                           <span className="flex items-center gap-1 text-amber-600">
                              <TriangleAlert className="size-4" />
                              {ultimoCalculo.empleados_con_inferencia} chofer(es) con conduces
                              atribuidos por inferencia
                           </span>
                        )}
                     </div>
                  )}

                  <NominaTable
                     readOnly={cerrado}
                     seleccionados={seleccionados}
                     onToggle={toggle}
                     onToggleTodos={toggleTodos}
                  />
               </>
            )}
         </div>
      </>
   );
}
