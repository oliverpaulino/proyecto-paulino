"use client";

import { useEffect } from "react";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useEquipoStore } from "@/stores/useEquipoStore";
import { Equipo } from "@/dtos/equipo.dto";

interface SelectEquiposProps {
   value: string;
   onChange: (equipoId: string, equipo?: Equipo) => void;
   placeholder?: string;
   onlyActive?: boolean;
   disabled?: boolean;
}

export function SelectEquipos({
   value,
   onChange,
   placeholder = "Seleccione un equipo",
   onlyActive = true,
   disabled,
}: SelectEquiposProps) {
   const { Equipos, GetEquipos } = useEquipoStore();

   useEffect(() => {
      if (Equipos.length === 0) {
         GetEquipos();
      }
   }, [Equipos.length, GetEquipos]);

   const equipos = onlyActive
      ? Equipos.filter((e) => e.estado === "ACTIVO")
      : Equipos;

   return (
      <Select
         value={value}
         onValueChange={(id) => {
            const equipo = Equipos.find((e) => e.id === id);
            onChange(id, equipo);
         }}
         disabled={disabled}
      >
         <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
         </SelectTrigger>

         <SelectContent>
            {equipos.map((equipo) => (
               <SelectItem key={equipo.id} value={equipo.id}>
                  {equipo.nombre}
               </SelectItem>
            ))}
         </SelectContent>
      </Select>
   );
}