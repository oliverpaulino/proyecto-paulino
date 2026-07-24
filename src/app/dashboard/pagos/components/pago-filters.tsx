"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSearch } from "@/components/table-search";
import { usePagoStore } from "@/stores/usePagoStore";
import { RotateCcw } from "lucide-react";

export function PagoFilters({ viewLimit = 20 }: { viewLimit?: number }) {
   const { currentFilters, GetPagos } = usePagoStore();

   const [searchInput, setSearchInput] = useState(currentFilters.search || "");
   const [searchQuery, setSearchQuery] = useState(currentFilters.search || "");
   const [startDate, setStartDate] = useState(currentFilters.start || "");
   const [endDate, setEndDate] = useState(currentFilters.end || "");

   const hasActiveFilters = Boolean(searchQuery || startDate || endDate);

   useEffect(() => {
      GetPagos({
         search: searchQuery,
         start: startDate,
         end: endDate,
         limit: viewLimit,
         force: true,
         page: 1,
      });
   }, [searchQuery, startDate, endDate, viewLimit, GetPagos]);

   function handleResetFilters() {
      setSearchInput("");
      setSearchQuery("");
      setStartDate("");
      setEndDate("");
   }

   return (
      <div className="flex flex-wrap items-center gap-3">
         <TableSearch
            value={searchInput}
            onValueChange={setSearchInput}
            onSearch={setSearchQuery}
            placeholder="Buscar por concepto o método..."
            className="w-full sm:w-76"
         />

         <div className="flex items-center gap-1.5 bg-input/20 px-2.5 py-0.5 rounded-4xl border border-input">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Desde:</span>
            <Input
               type="date"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
               max={endDate}
               className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none"
            />
            <span className="text-muted-foreground text-xs font-bold">—</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Hasta:</span>
            <Input
               type="date"
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
               min={startDate}
               className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none"
            />
         </div>

         {hasActiveFilters && (
            <Button
               variant="ghost"
               size="sm"
               onClick={handleResetFilters}
               className="h-9 px-2.5 text-xs text-muted-foreground"
            >
               <RotateCcw className="size-3.5 mr-1" /> Limpiar
            </Button>
         )}
      </div>
   );
}