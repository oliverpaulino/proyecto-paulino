"use client";

import { useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export interface SerieLinea {
   key: string;
   label: string;
   color: string;
   valores: number[];
}

interface LineChartProps {
   /** Etiquetas del eje X, una por punto. */
   etiquetas: string[];
   series: SerieLinea[];
   /** Formateo del valor en el tooltip y en el eje Y. */
   formato: (v: number) => string;
   alto?: number;
   className?: string;
}

/*
   Paleta validada con el script de la skill `dataviz` contra las superficies
   reales del tema (claro oklch(1 0 0), oscuro oklch(0.145 0 0)):

     #0d9488 (teal)  ↔  #ef4444 (rojo)
     CVD deutan/protan ΔE 12.0 · visión normal ΔE 30.9 · contraste ≥ 3:1

   Los MISMOS dos hex pasan las seis pruebas en claro Y en oscuro, así que no
   hay que cambiarlos por modo. El verde esmeralda que se usaba antes en las
   barras quedaba en ΔE 8.1 (apenas sobre el piso) y reprobaba contraste.

   No se usa `--destructive` del tema para la línea de gastos: ese token cambia
   por modo y dejaría el par sin validar. Acá el color identifica una serie, no
   comunica un estado.
*/
export const COLOR_COBRADO = "#0d9488";
export const COLOR_GASTADO = "#ef4444";

/**
 * Gráfico de líneas en SVG.
 *
 * UN solo eje Y para las dos series: ambas son pesos, así que comparten escala
 * y la comparación es honesta. Dos ejes con escalas distintas dejarían cruzar
 * las líneas donde uno quiera y es el error clásico de este gráfico.
 *
 * Se dibuja a mano en vez de traer una librería de charts: son dos series de
 * seis puntos, y `recharts` pesa más que todo el panel.
 */
export function LineChart({
   etiquetas, series, formato, alto = 160, className,
}: LineChartProps) {
   const id = useId();
   const [activo, setActivo] = useState<number | null>(null);

   // Coordenadas en un viewBox fijo; el SVG escala solo con el contenedor.
   const ANCHO = 600;
   const PAD = { arriba: 12, derecha: 8, abajo: 22, izquierda: 52 };

   const { maximo, puntos } = useMemo(() => {
      const todos = series.flatMap((s) => s.valores);
      // El eje SIEMPRE arranca en 0: recortarlo exageraría cambios chicos y es
      // la forma más fácil de mentir con un gráfico de líneas.
      const max = Math.max(...todos, 1);
      // Techo "redondo" para que la etiqueta superior no sea un número raro.
      const magnitud = 10 ** Math.floor(Math.log10(max));
      const techo = Math.ceil(max / magnitud) * magnitud;

      const n = etiquetas.length;
      const anchoUtil = ANCHO - PAD.izquierda - PAD.derecha;
      const altoUtil = alto - PAD.arriba - PAD.abajo;

      const x = (i: number) =>
         n <= 1 ? PAD.izquierda + anchoUtil / 2 : PAD.izquierda + (i / (n - 1)) * anchoUtil;
      const y = (v: number) => PAD.arriba + altoUtil - (v / techo) * altoUtil;

      return {
         maximo: techo,
         puntos: series.map((s) => ({
            ...s,
            coords: s.valores.map((v, i) => ({ x: x(i), y: y(v), v })),
         })),
      };
   }, [series, etiquetas.length, alto]);

   const anchoUtil = ANCHO - PAD.izquierda - PAD.derecha;
   const altoUtil = alto - PAD.arriba - PAD.abajo;
   const xDe = (i: number) =>
      etiquetas.length <= 1
         ? PAD.izquierda + anchoUtil / 2
         : PAD.izquierda + (i / (etiquetas.length - 1)) * anchoUtil;

   /** Tres marcas: 0, mitad y techo. Más líneas serían ruido a este tamaño. */
   const marcasY = [0, maximo / 2, maximo];

   return (
      <figure className={cn("flex flex-col gap-2", className)}>
         <div className="relative">
            <svg
               viewBox={`0 0 ${ANCHO} ${alto}`}
               className="w-full overflow-visible"
               role="img"
               aria-label={`Gráfico de líneas: ${series.map((s) => s.label).join(" y ")}`}
               onMouseLeave={() => setActivo(null)}
            >
               {/* Rejilla recesiva: guía la lectura sin competir con los datos. */}
               {marcasY.map((m, i) => {
                  const y = PAD.arriba + altoUtil - (m / maximo) * altoUtil;
                  return (
                     <g key={i}>
                        <line
                           x1={PAD.izquierda} x2={ANCHO - PAD.derecha} y1={y} y2={y}
                           className="stroke-border" strokeWidth={1}
                           strokeDasharray={i === 0 ? undefined : "3 3"}
                        />
                        <text
                           x={PAD.izquierda - 8} y={y + 3} textAnchor="end"
                           className="fill-muted-foreground text-[9px]"
                        >
                           {formato(m)}
                        </text>
                     </g>
                  );
               })}

               {/* Banda de hover por punto: el blanco de click es toda la
                   columna, no la línea de 2px. */}
               {etiquetas.map((_, i) => (
                  <rect
                     key={i}
                     x={xDe(i) - anchoUtil / (etiquetas.length * 2)}
                     y={PAD.arriba}
                     width={anchoUtil / etiquetas.length}
                     height={altoUtil}
                     fill="transparent"
                     onMouseEnter={() => setActivo(i)}
                  />
               ))}

               {activo !== null ? (
                  <line
                     x1={xDe(activo)} x2={xDe(activo)}
                     y1={PAD.arriba} y2={PAD.arriba + altoUtil}
                     className="stroke-muted-foreground/40" strokeWidth={1}
                  />
               ) : null}

               {puntos.map((s) => (
                  <g key={s.key}>
                     <polyline
                        points={s.coords.map((c) => `${c.x},${c.y}`).join(" ")}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                     />
                     {s.coords.map((c, i) => (
                        <circle
                           key={i}
                           cx={c.x} cy={c.y}
                           r={activo === i ? 4.5 : 3}
                           fill={s.color}
                           // Anillo del color de la superficie: separa los
                           // marcadores cuando las dos series se cruzan.
                           className="stroke-background"
                           strokeWidth={2}
                        />
                     ))}
                  </g>
               ))}

               {etiquetas.map((etq, i) => (
                  <text
                     key={i}
                     x={xDe(i)} y={alto - 6} textAnchor="middle"
                     className={cn(
                        "text-[9px]",
                        activo === i ? "fill-foreground" : "fill-muted-foreground",
                     )}
                  >
                     {etq}
                  </text>
               ))}
            </svg>

            {activo !== null ? (
               <div
                  className="pointer-events-none absolute top-0 z-10 min-w-32 -translate-x-1/2 rounded-md border bg-popover p-2 shadow-md"
                  style={{ left: `${(xDe(activo) / ANCHO) * 100}%` }}
               >
                  <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                     {etiquetas[activo]}
                  </p>
                  {series.map((s) => (
                     <p key={s.key} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5">
                           <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                              aria-hidden
                           />
                           {s.label}
                        </span>
                        <span className="tabular-nums">{formato(s.valores[activo])}</span>
                     </p>
                  ))}
               </div>
            ) : null}
         </div>

         {/* Leyenda siempre presente con 2+ series: la identidad nunca puede
             depender solo del color. */}
         <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {series.map((s) => (
               <span
                  key={s.key}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
               >
                  <svg width="14" height="2" aria-hidden>
                     <line x1="0" y1="1" x2="14" y2="1" stroke={s.color} strokeWidth={2} />
                  </svg>
                  {s.label}
               </span>
            ))}
         </figcaption>
      </figure>
   );
}
