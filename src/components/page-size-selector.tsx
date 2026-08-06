"use client";

import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";

interface PageSizeSelectorProps {
   value: number;
   onChange: (value: number) => void;
   options?: number[];
   className?: string;
}

const DEFAULT_OPTIONS = [10, 25, 50];

/**
 * Selector de cuántos registros traer por página (10 / 25 / 50). El valor
 * cambia la paginación del listado que lo use.
 */
export function PageSizeSelector({
   value,
   onChange,
   options = DEFAULT_OPTIONS,
   className,
}: PageSizeSelectorProps) {
   return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className ?? ""}`}>
         <span>Mostrar</span>
         <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger className="h-8 w-[74px]">
               <SelectValue />
            </SelectTrigger>
            <SelectContent>
               {options.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                     {opt}
                  </SelectItem>
               ))}
            </SelectContent>
         </Select>
         <span>por página</span>
      </div>
   );
}
