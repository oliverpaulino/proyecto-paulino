"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSearch } from "@/components/table-search";
import { RotateCcw } from "lucide-react";
import { ESTADOS_CICLO, type EstadoCiclo } from "@/stores/useNominaStore";

/**
 * Filtros del selector de ciclos. A diferencia de gastos o deducciones, aquí
 * se filtra en memoria: `GetCycles` trae la lista completa sin paginar, así
 * que ir al servidor por cada tecla no aportaría nada.
 */
export interface FiltrosCiclo {
   search: string;
   start: string;
   end: string;
   estados: Set<EstadoCiclo>;
}

export const FILTROS_CICLO_VACIOS: FiltrosCiclo = {
   search: "",
   start: "",
   end: "",
   estados: new Set(),
};

export function hayFiltrosActivos(f: FiltrosCiclo): boolean {
   return Boolean(f.search || f.start || f.end || f.estados.size > 0);
}

/**
 * Un ciclo entra si su período SE SOLAPA con el rango pedido, no si está
 * contenido en él: quien busca "julio" espera ver la quincena que arranca el
 * 28 de junio y termina el 12 de julio.
 */
export function filtrarCiclos<
   T extends { nombre: string; estado: EstadoCiclo; fecha_inicio: string; fecha_fin: string }
>(ciclos: T[], f: FiltrosCiclo): T[] {
   const texto = f.search.trim().toLowerCase();

   return ciclos.filter((c) => {
      if (texto && !c.nombre.toLowerCase().includes(texto)) return false;
      if (f.estados.size > 0 && !f.estados.has(c.estado)) return false;

      // Se comparan las fechas como texto ISO (YYYY-MM-DD) para no arrastrar
      // la zona horaria al construir un Date.
      const inicio = c.fecha_inicio.slice(0, 10);
      const fin = c.fecha_fin.slice(0, 10);
      if (f.start && fin < f.start) return false;
      if (f.end && inicio > f.end) return false;

      return true;
   });
}

const ESTADO_ACTIVO: Record<EstadoCiclo, string> = {
   ABIERTO: "bg-gray-200 text-gray-800 border-gray-300",
   CALCULADO: "bg-blue-100 text-blue-800 border-blue-300",
   CERRADO: "bg-green-100 text-green-800 border-green-300",
   PAGADO: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export function NominaFilters({
   filtros,
   onChange,
   resultados,
   total,
}: {
   filtros: FiltrosCiclo;
   onChange: (f: FiltrosCiclo) => void;
   resultados: number;
   total: number;
}) {
   const activos = hayFiltrosActivos(filtros);

   function toggleEstado(estado: EstadoCiclo) {
      const estados = new Set(filtros.estados);
      estados.has(estado) ? estados.delete(estado) : estados.add(estado);
      onChange({ ...filtros, estados });
   }

   return (
      <div className="flex flex-wrap items-center gap-3">
         <TableSearch
            value={filtros.search}
            onValueChange={(search) => onChange({ ...filtros, search })}
            placeholder="Buscar ciclo por nombre..."
            className="w-full sm:w-76"
         />

         <div className="flex items-center gap-1.5 bg-input/20 px-2.5 py-0.5 rounded-4xl border border-input">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Desde:</span>
            <Input
               type="date"
               value={filtros.start}
               onChange={(e) => onChange({ ...filtros, start: e.target.value })}
               max={filtros.end || undefined}
               className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none"
            />
            <span className="text-muted-foreground text-xs font-bold">—</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Hasta:</span>
            <Input
               type="date"
               value={filtros.end}
               onChange={(e) => onChange({ ...filtros, end: e.target.value })}
               min={filtros.start || undefined}
               className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none"
            />
         </div>

         <div className="flex flex-wrap items-center gap-1.5">
            {ESTADOS_CICLO.map((estado) => {
               const marcado = filtros.estados.has(estado);
               return (
                  <button
                     key={estado}
                     type="button"
                     aria-pressed={marcado}
                     onClick={() => toggleEstado(estado)}
                     className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase transition ${
                        marcado
                           ? ESTADO_ACTIVO[estado]
                           : "border-input text-muted-foreground hover:bg-muted/50"
                     }`}
                  >
                     {estado}
                  </button>
               );
            })}
         </div>

         {activos && (
            <>
               <span className="text-xs text-muted-foreground">
                  {resultados} de {total} ciclo{total === 1 ? "" : "s"}
               </span>
               <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...FILTROS_CICLO_VACIOS, estados: new Set() })}
                  className="h-9 px-2.5 text-xs text-muted-foreground"
               >
                  <RotateCcw className="size-3.5 mr-1" /> Limpiar
               </Button>
            </>
         )}
      </div>
   );
}
