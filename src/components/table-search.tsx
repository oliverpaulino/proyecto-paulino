// src/components/table-search.tsx
import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface TableSearchProps {
   /**
    * Current search value
    */
   value: string;

   /**
    * Callback invoked when search value changes (immediately)
    */
   onValueChange: (value: string) => void;

   /**
    * Callback invoked after debounce delay when user stops typing
    * Use this to trigger fetch/filter operations
    */
   onSearch?: (value: string) => void;

   /**
    * Placeholder text for the input
    */
   placeholder?: string;

   /**
    * Debounce delay in milliseconds
    * @default 500
    */
   debounceDelay?: number;

   /**
    * Custom className for styling
    */
   className?: string;

   loading?: boolean
}

/**
 * Reusable search input component for tables with built-in debounce.
 * 
 * Usage:
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState("");
 * 
 * <TableSearch
 *   value={searchTerm}
 *   onValueChange={setSearchTerm}
 *   onSearch={(value) => {
 *     // Trigger fetch or filter here
 *     getProducts({ search: value });
 *   }}
 *   placeholder="Buscar productos..."
 * />
 * ```
 */
export function TableSearch({
   value,
   onValueChange,
   onSearch,
   placeholder = "Buscar...",
   debounceDelay = 500,
   className = "",
   loading = false
}: TableSearchProps) {
   // Debounce the search value
   const debouncedValue = useDebounce(value, debounceDelay);
   const onSearchRef = React.useRef(onSearch)

   React.useEffect(() => {
      onSearchRef.current = onSearch;
   }, [onSearch]);

   // ✅ Remover onSearch de las dependencias
   React.useEffect(() => {
      if (onSearchRef.current) {
         onSearchRef.current(debouncedValue);
      }
   }, [debouncedValue]);

   return (
      <div
         className={`border w-[20vw] px-2 pl-4 rounded-lg flex flex-row justify-between py-1 items-center ${className}`}
      >
         <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full focus:ring-0 border-0 focus:border-0 outline-0 focus:outline-0"
         />
         {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}

      </div>
   );
}