"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, ShoppingCart, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import type { PurchaseOrder } from "@/dtos/purchase-order.dto";

interface SelectBuscadorOrdenCompraProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (ordenId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscadorOrdenCompra({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar orden por código o proveedor...",
   disabled = false,
}: SelectBuscadorOrdenCompraProps) {
   const { PurchaseOrders, loading, GetPurchaseOrders } = usePurchaseOrderStore(); //[cite: 7]
   const [isOpen, setIsOpen] = useState(false);
   const [inputValue, setInputValue] = useState(initialLabel);
   const containerRef = useRef<HTMLDivElement>(null);

   const debouncedSearch = useDebounce(inputValue, 500);

   useEffect(() => {
      setInputValue(initialLabel);
   }, [initialLabel]);

   useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
         if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
            if (!value) setInputValue(""); 
         }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, [value]);

   useEffect(() => {
      if (!isOpen) return;
      GetPurchaseOrders({ force: true }); //[cite: 7]
   }, [isOpen, GetPurchaseOrders]);

   // Filtrado local al no tener endpoint de search text
   const ordenesFiltradas = useMemo(() => {
      if (!debouncedSearch.trim()) return PurchaseOrders; //[cite: 7]
      
      const searchLower = debouncedSearch.toLowerCase();
      return PurchaseOrders.filter((orden) => { //[cite: 7]
         const proveedor = orden.proveedor_nombre?.toLowerCase() || ""; //[cite: 6]
         const codigo = orden.codigoReferencia.toLowerCase(); //[cite: 6]
         const id = orden.id.toLowerCase(); //[cite: 6]
         
         return proveedor.includes(searchLower) || codigo.includes(searchLower) || id.includes(searchLower);
      });
   }, [PurchaseOrders, debouncedSearch]); //[cite: 7]

   const getOrdenLabel = (orden: PurchaseOrder) => {
      return `${orden.codigoReferencia} - ${orden.proveedor_nombre || "Sin proveedor"}`; //[cite: 6]
   };

   const handleSelect = (orden: PurchaseOrder) => {
      setInputValue(getOrdenLabel(orden));
      onChange(orden.id); //[cite: 6]
      setIsOpen(false);
   };

   const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputValue("");
      onChange(null);
      setIsOpen(false);
   };

   return (
      <div className="relative w-full" ref={containerRef}>
         <div className="relative flex items-center">
            <ShoppingCart className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
               type="text"
               value={inputValue}
               onChange={(e) => {
                  setInputValue(e.target.value);
                  if (e.target.value === "") onChange(null);
                  if (!isOpen) setIsOpen(true);
               }}
               onFocus={() => setIsOpen(true)}
               disabled={disabled}
               placeholder={placeholder}
               className="h-10 w-full rounded-md border border-input bg-input/30 pl-9 pr-9 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            
            <div className="absolute right-3 flex items-center gap-1">
               {loading && isOpen && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
               {value && !disabled && (
                  <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
                     <X className="h-4 w-4" />
                  </button>
               )}
            </div>
         </div>

         {isOpen && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1">
               {loading && ordenesFiltradas.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando órdenes...</div>
               ) : ordenesFiltradas.length > 0 ? (
                  ordenesFiltradas.map((orden) => (
                     <div
                        key={orden.id} //[cite: 6]
                        onClick={() => handleSelect(orden)}
                        className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-medium truncate">
                              {orden.proveedor_nombre || "Proveedor no especificado"} {/*[cite: 6] */}
                           </span>
                           <span className="text-[10px] font-semibold text-muted-foreground">
                              {orden.codigoReferencia} {/*[cite: 6] */}
                           </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-muted-foreground">
                              Total: ${orden.total.toFixed(2)} {/*[cite: 6] */}
                           </span>
                           <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              orden.estado === "APROBADA" ? "bg-green-500/10 text-green-500" : //[cite: 6]
                              orden.estado === "PENDIENTE" ? "bg-blue-500/10 text-blue-500" : //[cite: 6]
                              orden.estado === "RECIBIDA" ? "bg-purple-500/10 text-purple-500" : //[cite: 6]
                              "bg-gray-500/10 text-gray-500"
                           }`}>
                              {orden.estado} {/*[cite: 6] */}
                           </span>
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron órdenes de compra.</div>
               )}
            </div>
         )}
      </div>
   );
}