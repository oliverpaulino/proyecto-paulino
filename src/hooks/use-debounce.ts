// src/hooks/use-debounce.ts
import { useEffect, useState } from "react";

/**
 * Hook that returns a debounced value.
 * The value will only be updated after the specified delay has passed
 * since the last change.
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
   const [debouncedValue, setDebouncedValue] = useState<T>(value);

   useEffect(() => {
      // Set up the timeout to update debounced value
      const handler = setTimeout(() => {
         setDebouncedValue(value);
      }, delay);

      // Cleanup function to cancel the timeout if value changes
      // or component unmounts
      return () => {
         clearTimeout(handler);
      };
   }, [value, delay]);

   return debouncedValue;
}