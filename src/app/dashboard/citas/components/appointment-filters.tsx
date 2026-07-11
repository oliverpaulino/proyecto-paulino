"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSearch } from "@/components/table-search";
import { useAppointmentStore } from "@/stores/useAppointmentStore";
import { RotateCcw } from "lucide-react";

export function AppointmentFilters({ viewLimit }: { viewLimit: number }) {
   const { currentFilters, GetAppointments } = useAppointmentStore();

   const [searchInput, setSearchInput] = useState(currentFilters.search || "");
   const [searchQuery, setSearchQuery] = useState(currentFilters.search || "");
   const [startDate, setStartDate] = useState(currentFilters.start || "");
   const [endDate, setEndDate] = useState(currentFilters.end || "");
   const [mine, setMine] = useState(currentFilters.mine || false);

   const hasActiveFilters = Boolean(searchQuery || startDate || endDate || mine);

   useEffect(() => {
      GetAppointments({
         search: searchQuery,
         start: startDate,
         end: endDate,
         mine,
         limit: viewLimit,
         force: true,
         page: 1,
      });
   }, [searchQuery, startDate, endDate, mine, viewLimit, GetAppointments]);

   function handleResetFilters() {
      setSearchInput("");
      setSearchQuery("");
      setStartDate("");
      setEndDate("");
      setMine(false);
   }

   return (
      <div className="flex flex-wrap items-center gap-3">
         <TableSearch value={searchInput} onValueChange={setSearchInput} onSearch={setSearchQuery} placeholder="Buscar cliente o motivo..." className="w-full sm:w-64" />

         <div className="flex items-center gap-1.5 bg-input/20 px-2.5 py-0.5 rounded-4xl border border-input">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Desde:</span>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate} className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none" />
            <span className="text-muted-foreground text-xs font-bold">—</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Hasta:</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="h-7 w-32 border-0 bg-transparent p-0 text-xs shadow-none" />
         </div>
        
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Solo mis citas:
            </span>

            <div className="relative">
                <input
                    type="checkbox"
                    checked={mine}
                    onChange={(e) => setMine(e.target.checked)}
                    className="peer sr-only"
                />

                <div className="h-6 w-11 rounded-full bg-input transition-colors peer-checked:bg-brand-blue"></div>

                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
            </div>
        </label>

         {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 px-2.5 text-xs text-muted-foreground">
               <RotateCcw className="size-3.5 mr-1" /> Limpiar
            </Button>
         )}
      </div>
   );
}