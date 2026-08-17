"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, User as UserIcon, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { authClient } from "@/lib/auth-client";

interface UserRecord {
   id: string;
   name: string;
   email: string;
   role: string | null;
}

interface SelectBuscadorUserProps {
   value?: string | null;
   initialLabel?: string;
   onChange: (userId: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
}

export function SelectBuscadorUser({
   value,
   initialLabel = "",
   onChange,
   placeholder = "Buscar usuario por nombre o correo...",
   disabled = false,
}: SelectBuscadorUserProps) {
   const [users, setUsers] = useState<UserRecord[]>([]);
   const [loading, setLoading] = useState(false);
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

   const fetchUsers = async () => {
      setLoading(true);
      try {
         const { data } = await authClient.admin.listUsers({ query: { limit: 500 } });
         setUsers((data?.users as UserRecord[]) || []);
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      if (isOpen && users.length === 0) {
         fetchUsers();
      }
   }, [isOpen, users.length]);

   const handleSelect = (user: UserRecord) => {
      setInputValue(user.name);
      onChange(user.id);
      setIsOpen(false);
   };

   const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputValue("");
      onChange(null);
      setIsOpen(false);
   };

   const filteredUsers = users.filter((user) => {
      const query = debouncedSearch.trim().toLowerCase();
      if (!query) return true;
      return (
         user.name.toLowerCase().includes(query) ||
         user.email.toLowerCase().includes(query)
      );
   }).slice(0, 20);

   return (
      <div className="relative w-full" ref={containerRef}>
         <div className="relative flex items-center">
            <UserIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
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
            <div className="absolute z-50 mt-1 max-h-[50dvh] w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1">
               {loading && users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Buscando usuarios...</div>
               ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                     <div
                        key={user.id}
                        onClick={() => handleSelect(user)}
                        className="flex cursor-pointer flex-col gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                     >
                        <div className="flex justify-between items-center">
                           <span className="font-medium truncate">{user.name}</span>
                           <span className="text-[10px] uppercase font-semibold bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                              {user.role || "USUARIO"}
                           </span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                           {user.email}
                        </span>
                     </div>
                  ))
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron usuarios.</div>
               )}
            </div>
         )}
      </div>
   );
}