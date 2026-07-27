"use client";

import { useEffect, useMemo, useState } from "react";
import {
   Breadcrumb,
   BreadcrumbItem,
   BreadcrumbList,
   BreadcrumbPage,
   BreadcrumbSeparator,
   BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { PermissionGuard } from "@/components/permission-guard";
import { usePermissions } from "@/hooks/usePermissions";
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
import {
   EmpleadoFilters,
   filtrarEmpleados,
   filtrosEmpleadoVacios,
   type FiltrosEmpleado,
} from "./components/empleado-filters";
import { NominaTable } from "./components/nomina-table";
import { generateNominaPDF } from "@/lib/pdf/nomina-pdf";
import { CycleForm } from "./components/cycle-form";
import {
   NominaFilters,
   filtrarCiclos,
   FILTROS_CICLO_VACIOS,
   type FiltrosCiclo,
} from "./components/nomina-filters";

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
      HidratarDetalles,
   } = useNominaStore();

   // Editar montos (seguro, deducciones, precios) exige permiso de escritura,
   // no solo que el ciclo esté abierto.
   const { canPerform: puedeEditar } = usePermissions({
      resource: "payroll",
      action: "update",
   });

   const [dialogAbierto, setDialogAbierto] = useState(false);
   const [refrescando, setRefrescando] = useState(false);
   const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
   const [generandoPdf, setGenerandoPdf] = useState(false);
   const [avisoRefresco, setAvisoRefresco] = useState<string | null>(null);
   const [filtros, setFiltros] = useState<FiltrosCiclo>(FILTROS_CICLO_VACIOS);
   const [filtrosEmpleado, setFiltrosEmpleado] = useState<FiltrosEmpleado>(filtrosEmpleadoVacios);

   const empleadosFiltrados = useMemo(
      () => filtrarEmpleados(empleados, filtrosEmpleado),
      [empleados, filtrosEmpleado]
   );

   const ciclosFiltrados = useMemo(() => filtrarCiclos(cycles, filtros), [cycles, filtros]);

   /*
      El ciclo abierto puede quedar fuera del filtro. Se sigue mostrando su
      panel —esconderlo haría desaparecer la nómina que el usuario está
      mirando— pero se avisa de que ya no está en la lista de arriba.
   */
   const seleccionadoOculto = Boolean(
      selectedCycle && !ciclosFiltrados.some((c) => c.id === selectedCycle.id)
   );

   useEffect(() => {
      GetCycles();
   }, [GetCycles]);

   useEffect(() => {
      if (selectedCycle) GetEmpleados(selectedCycle.id);
      setSeleccionados(new Set());
      setFiltrosEmpleado(filtrosEmpleadoVacios());
   }, [selectedCycle, GetEmpleados]);

   const cerrado = selectedCycle?.estado === "CERRADO" || selectedCycle?.estado === "PAGADO";

   function toggle(id: string) {
      setSeleccionados((prev) => {
         const s = new Set(prev);
         s.has(id) ? s.delete(id) : s.add(id);
         return s;
      });
   }

   /** `ids` son las filas visibles: con búsqueda activa no se tocan las ocultas. */
   function toggleTodos(marcar: boolean, ids: string[]) {
      setSeleccionados((prev) => {
         const s = new Set(prev);
         ids.forEach((id) => (marcar ? s.add(id) : s.delete(id)));
         return s;
      });
   }

   /**
    * Con selección se exportan los marcados; sin selección, lo que está a la
    * vista. Exportar el ciclo entero con filtros puestos contradiría lo que el
    * usuario está mirando.
    */
   async function descargarPdf() {
      if (!selectedCycle) return;
      const elegidos =
         seleccionados.size > 0
            ? empleados.filter((e) => seleccionados.has(e.id))
            : empleadosFiltrados;
      if (elegidos.length === 0) return;

      setGenerandoPdf(true);
      try {
         // El volante imprime el desglose de deducciones de cada empleado, que
         // el listado del ciclo ya no trae (se carga por empleado, al abrir su
         // fila). Aquí se piden los de los que se van a imprimir.
         const conDetalle = await HidratarDetalles(selectedCycle.id, elegidos);
         await generateNominaPDF(selectedCycle, conDetalle);
      } finally {
         setGenerandoPdf(false);
      }
   }

   return (
      <PermissionGuard resource="payroll" action="read" mode="page">
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

               <PermissionGuard resource="payroll" action="create">
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
               </PermissionGuard>
            </div>

            {error && (
               <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {error}
               </div>
            )}

            {cycles.length > 0 && (
               <NominaFilters
                  filtros={filtros}
                  onChange={setFiltros}
                  resultados={ciclosFiltrados.length}
                  total={cycles.length}
               />
            )}

            {/* ── Selector de ciclo ── */}
            <div className="flex flex-wrap gap-2">
               {loading && cycles.length === 0 ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
               ) : cycles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                     No hay ciclos todavía. Crea el primero para calcular la nómina.
                  </p>
               ) : ciclosFiltrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                     Ningún ciclo coincide con los filtros.
                  </p>
               ) : (
                  ciclosFiltrados.map((c) => (
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
                  {seleccionadoOculto && (
                     <p className="text-xs text-muted-foreground">
                        El ciclo abierto no coincide con los filtros actuales.
                     </p>
                  )}

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
                        {/* Calcular reescribe los montos: es una edición. */}
                        <PermissionGuard resource="payroll" action="update">
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
                        </PermissionGuard>

                        {/*
                           Recoge las deducciones que se hayan creado a mano
                           después de calcular, sin rehacer la producción ni
                           perder los ajustes manuales.
                        */}
                        <PermissionGuard resource="payroll" action="update">
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
                        </PermissionGuard>

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
                              : empleadosFiltrados.length !== empleados.length
                                ? `PDF (${empleadosFiltrados.length} filtrados)`
                                : "PDF del ciclo"}
                        </Button>

                        {/*
                           Cerrar pesa más que editar: congela los montos y
                           genera el gasto contable de la nómina. Exige
                           `manage`, igual que el backend.
                        */}
                        <PermissionGuard resource="payroll" action="manage">
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
                        </PermissionGuard>
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

                  {empleados.length > 0 && (
                     <EmpleadoFilters
                        filtros={filtrosEmpleado}
                        onChange={setFiltrosEmpleado}
                        empleados={empleados}
                        resultados={empleadosFiltrados.length}
                     />
                  )}

                  <NominaTable
                     // Sin permiso de edición la tabla se ve pero no se toca,
                     // igual que si el ciclo estuviera cerrado.
                     readOnly={cerrado || !puedeEditar}
                     seleccionados={seleccionados}
                     onToggle={toggle}
                     onToggleTodos={toggleTodos}
                     empleados={empleadosFiltrados}
                     totalSinFiltrar={empleados.length}
                     onLimpiarFiltros={() => setFiltrosEmpleado(filtrosEmpleadoVacios())}
                     periodo={{
                        fecha_inicio: selectedCycle.fecha_inicio,
                        fecha_fin: selectedCycle.fecha_fin,
                     }}
                  />
               </>
            )}
         </div>
      </PermissionGuard>
   );
}
