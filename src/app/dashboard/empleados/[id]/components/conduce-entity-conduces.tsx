"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Loader2, CalendarSearch, X } from "lucide-react";
import { useConduceStore } from "@/stores/useConduceStores";
import { ConduceTable } from "../../../conduces/components/conduce-table";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";

interface Props {
   /** Cuál campo de ConduceFiltros se usa para acotar la lista a esta entidad. */
   filtroKey: "empleado_id" | "equipo_id";
   filtroValue: string;
   ocultarProyecto?: boolean;
}

export function ConduceEntityConduces({ filtroKey, filtroValue, ocultarProyecto = false }: Props) {
   const { conduces, loading, GetConduces } = useConduceStore();

   // Estados de filtros (Estilo ConduceFiltrosBar)
   const [fechaDesde, setFechaDesde] = useState<string>("");
   const [fechaHasta, setFechaHasta] = useState<string>("");
   const [busquedaLocal, setBusquedaLocal] = useState<string>("");
   const [busquedaDebounce, setBusquedaDebounce] = useState<string>("");

   const [proyectoId, setProyectoId] = useState<string | undefined>();
   const [proyectoNombre, setProyectoNombre] = useState("");
   const [tipoConduce, setTipoConduce] = useState<string>("all");
   const [esCobrable, setEsCobrable] = useState<string>("all");
   const [categoriaEquipo, setCategoriaEquipo] = useState<string>("all");

   // Llamada a la API con los nuevos filtros incluidos
   useEffect(() => {
      GetConduces({
         [filtroKey]: filtroValue,
         fecha_desde: fechaDesde || undefined,
         fecha_hasta: fechaHasta || undefined,
         proyecto_id: proyectoId || undefined,
         tipo_conduce: tipoConduce === "all" ? undefined : tipoConduce,
         es_cobrable: esCobrable === "all" ? undefined : esCobrable === "true",
         pageSize: 100, // Aumentado para asegurar traer historial completo
      } as any);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [filtroKey, filtroValue, fechaDesde, fechaHasta, proyectoId, tipoConduce, esCobrable]);

   // Debounce para la búsqueda local por texto
   useEffect(() => {
      const timeoutId = window.setTimeout(() => {
         setBusquedaDebounce(busquedaLocal.trim().toLowerCase());
      }, 350);

      return () => window.clearTimeout(timeoutId);
   }, [busquedaLocal]);

   /*
      Categorías de equipo que esta persona realmente manejó en el período.
      Se derivan de los conduces ya cargados en vez de pedir el catálogo
      completo: filtrar por una categoría que nunca condujo no sirve de nada.
   */
   const categoriasDisponibles = useMemo(() => {
      const nombres = new Set<string>();
      conduces.forEach((c: any) => {
         if (c.categoria_equipo_nombre) nombres.add(c.categoria_equipo_nombre);
      });
      return [...nombres].sort((a, b) => a.localeCompare(b, "es"));
   }, [conduces]);

   /*
      El select solo tiene sentido si hubo más de una categoría; con una sola
      sería un control que nunca cambia nada.
   */
   const mostrarFiltroCategoria = categoriasDisponibles.length > 1;

   // Si el filtro apunta a una categoría que ya no está en la lista (cambió el
   // rango de fechas, el proyecto, etc.), se vuelve a "todas" para no dejar la
   // tabla vacía sin explicación.
   useEffect(() => {
      if (categoriaEquipo !== "all" && !categoriasDisponibles.includes(categoriaEquipo)) {
         setCategoriaEquipo("all");
      }
   }, [categoriasDisponibles, categoriaEquipo]);

   const conducesFiltradas = useMemo(() => {
      const terminoBusqueda = busquedaDebounce;

      const porCategoria =
         categoriaEquipo === "all"
            ? conduces
            : conduces.filter((c: any) => c.categoria_equipo_nombre === categoriaEquipo);

      if (!terminoBusqueda) {
         return porCategoria;
      }

      return porCategoria.filter((c: any) => {
         const textoBusqueda = [
            c.codigo,
            c.referencia,
            !ocultarProyecto ? c.proyecto_nombre : "",
            c.equipo_nombre,
            c.operador_nombre,
            c.empleado_nombre,
            c.notas,
            c.estado
         ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

         return textoBusqueda.includes(terminoBusqueda);
      });
   }, [conduces, busquedaDebounce, ocultarProyecto, categoriaEquipo]);

   const resumen = useMemo(() => {
      let totalViajes = 0;
      let totalHoras = 0;
      let produccionBruta = 0;

      conducesFiltradas.forEach((c: any) => {
         if (c.tipo_conduce === "CAMION") {
            totalViajes += c.cantidad;
         } else {
            totalHoras += c.total_horas;
         }
         produccionBruta += c.subtotal;
      });

      return { totalViajes, totalHoras, produccionBruta };
   }, [conducesFiltradas]);

   const hayFiltrosActivos =
      proyectoId || tipoConduce !== "all" || esCobrable !== "all" || categoriaEquipo !== "all" || fechaDesde || fechaHasta || busquedaLocal;

   return (
      <div className="space-y-4">

         {/* ── BARRA DE FILTROS (Mismo diseño que ConduceFiltrosBar) ── */}
         <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-4">

            {/* Búsqueda de texto */}
            <div className="w-56 space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Buscar (proyecto, ref, equipo...)</label>
               <Input
                  value={busquedaLocal}
                  onChange={(e) => setBusquedaLocal(e.target.value)}
                  placeholder="Ej. Proyecto Central, 00234..."
               />
            </div>

            {/* Buscador de Proyecto (Opcional) */}
            {!ocultarProyecto && (
               <div className="w-56 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
                  <SelectBuscadorProyecto
                     value={proyectoId}
                     initialLabel={proyectoNombre}
                     placeholder="Todos los proyectos..."
                     onChange={(id) => setProyectoId(id || undefined)}
                  />
               </div>
            )}

            {/* Selector de Tipo */}
            <div className="w-40 space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Tipo</label>
               <Select value={tipoConduce} onValueChange={setTipoConduce}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">Todos</SelectItem>
                     <SelectItem value="CAMION">Camión</SelectItem>
                     <SelectItem value="EQUIPO_PESADO">Equipo Pesado</SelectItem>
                  </SelectContent>
               </Select>
            </div>

            {/* Categoría de equipo — solo si manejó más de una */}
            {mostrarFiltroCategoria && (
               <div className="w-48 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Categoría de equipo</label>
                  <Select value={categoriaEquipo} onValueChange={setCategoriaEquipo}>
                     <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categoriasDisponibles.map((nombre) => (
                           <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
            )}

            {/* Selector de Cobrable */}
            <div className="w-32 space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Cobrable</label>
               <Select value={esCobrable} onValueChange={setEsCobrable}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">Todos</SelectItem>
                     <SelectItem value="true">Sí</SelectItem>
                     <SelectItem value="false">No</SelectItem>
                  </SelectContent>
               </Select>
            </div>

            {/* Fechas */}
            <div className="w-36 space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Desde</label>
               <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="w-36 space-y-1">
               <label className="text-xs font-medium text-muted-foreground">Hasta</label>
               <Input type="date" value={fechaHasta} min={fechaDesde} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>

            {/* Botón de Limpiar */}
            {hayFiltrosActivos && (
               <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                     setFechaDesde("");
                     setFechaHasta("");
                     setBusquedaLocal("");
                     setProyectoId(undefined);
                     setProyectoNombre("");
                     setTipoConduce("all");
                     setEsCobrable("all");
                     setCategoriaEquipo("all");
                  }}
               >
                  <X className="size-4 mr-1" /> Limpiar filtros
               </Button>
            )}
         </div>

         {/* ── RESUMEN ── */}
         <div className="flex flex-wrap gap-6 rounded-lg bg-background p-3 shadow-sm border w-fit">
            <div>
               <p className="text-[10px] font-semibold uppercase text-muted-foreground">Viajes / Botes </p>
               <p className="text-lg font-bold">{resumen.totalViajes}</p>
            </div>
            <div>
               <p className="text-[10px] font-semibold uppercase text-muted-foreground">Horas Trabajadas</p>
               <p className="text-lg font-bold">{resumen.totalHoras.toFixed(2)}</p>
            </div>
            {/*
               OJO: esto es lo FACTURADO AL CLIENTE (conduce.subtotal =
               precio_unitario × cantidad), NO lo que se le paga al chofer.
               El pago al chofer usa `empleado_categoria_tarifa.monto_pago`
               y se calcula en Nómina (/dashboard/nomina).
            */}
            <div className="border-l pl-4">
               <p className="text-[10px] font-semibold uppercase text-brand-blue">
                  Facturado al cliente
               </p>
               <p className="text-lg font-bold text-brand-blue">
                  RD$ {resumen.produccionBruta.toLocaleString("es-DO")}
               </p>
               <p className="text-[10px] text-muted-foreground">
                  No es el pago al empleado
               </p>
            </div>
         </div>

         {/* ── TABLA DE CONDUCES ── */}
         {
            loading ? (
               <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-brand-blue" />
               </div>
            ) : conducesFiltradas.length === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground border rounded-xl border-dashed">
                  <CalendarSearch className="size-8 opacity-20" />
                  <p className="text-sm">
                     {busquedaDebounce ? "No hay conduces que coincidan con la búsqueda." : "No hay conduces registrados con estos filtros."}
                  </p>
               </div>
            ) : (
               <div className="rounded-xl border">
                  <ConduceTable conduces={conducesFiltradas} ocultarProyecto={ocultarProyecto} />
               </div>
            )
         }
      </div >
   );
}