"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Recurso } from "@/stores/useDashboardStore";

/** RD$ sin centavos: en el panel los centavos son ruido. */
export function money(v: number | null | undefined): string {
   if (v === null || v === undefined) return "—";
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      maximumFractionDigits: 0,
   }).format(v);
}

export function numero(v: number | null | undefined): string {
   if (v === null || v === undefined) return "—";
   return new Intl.NumberFormat("es-DO").format(v);
}

/** "12 feb" — las fechas del panel no necesitan año salvo que cambie. */
export function fechaCorta(iso: string): string {
   const d = new Date(iso);
   if (Number.isNaN(d.getTime())) return "—";
   return new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short" }).format(d);
}

interface WidgetShellProps {
   title: string;
   icon?: LucideIcon;
   /** Enlace al módulo completo, en el encabezado. */
   href?: string;
   hrefLabel?: string;
   children: ReactNode;
   className?: string;
}

/**
 * Marco común de las tarjetas del panel: mismo encabezado, mismo enlace, misma
 * altura mínima. Los widgets solo aportan su contenido.
 */
export function WidgetShell({
   title,
   icon: Icon,
   href,
   hrefLabel = "Ver todo",
   children,
   className,
}: WidgetShellProps) {
   return (
      <Card className={cn("flex h-full flex-col gap-0 py-4", className)}>
         <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
               {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
               <span className="truncate">{title}</span>
            </CardTitle>
            {href ? (
               <Link
                  href={href}
                  className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
               >
                  {hrefLabel}
                  <ArrowRight className="size-3" aria-hidden />
               </Link>
            ) : null}
         </CardHeader>
         <CardContent className="flex flex-1 flex-col px-4">{children}</CardContent>
      </Card>
   );
}

/**
 * Estados de carga/error/vacío de un `Recurso`.
 *
 * `denegado` NO se maneja acá: un widget sin permiso no se llega a renderizar
 * (lo filtra `visibleWidgetsFor`), y si el 403 llega igual, la tarjeta se
 * esconde entera en vez de anunciar lo que el usuario no puede ver.
 */
export function WidgetEstado<T>({
   recurso,
   vacioTexto = "Sin datos",
   children,
   skeleton,
}: {
   recurso: Recurso<T>;
   vacioTexto?: string;
   /** Se llama solo con datos presentes y no vacíos. */
   children: (data: T) => ReactNode;
   skeleton?: ReactNode;
}) {
   if (recurso.loading && recurso.data === null) {
      return (
         skeleton ?? (
            <div className="flex flex-col gap-2 py-1">
               <Skeleton className="h-7 w-28" />
               <Skeleton className="h-3 w-40" />
            </div>
         )
      );
   }

   if (recurso.error) {
      return (
         <div className="flex items-start gap-2 py-2 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
            <span>{recurso.error}</span>
         </div>
      );
   }

   const data = recurso.data;
   if (data === null || (Array.isArray(data) && data.length === 0)) {
      return (
         <p className="py-3 text-xs text-muted-foreground">{vacioTexto}</p>
      );
   }

   return <>{children(data)}</>;
}

/** Cifra grande de una tarjeta de resumen. */
export function BigStat({
   value,
   hint,
   tone = "default",
}: {
   value: string;
   hint?: ReactNode;
   tone?: "default" | "positive" | "negative" | "warning";
}) {
   return (
      <div className="flex flex-col gap-1">
         <span
            className={cn(
               "text-2xl font-semibold tabular-nums tracking-tight",
               tone === "positive" && "text-emerald-600 dark:text-emerald-400",
               tone === "negative" && "text-destructive",
               tone === "warning" && "text-amber-600 dark:text-amber-400",
            )}
         >
            {value}
         </span>
         {hint ? (
            <span className="text-xs text-muted-foreground">{hint}</span>
         ) : null}
      </div>
   );
}
