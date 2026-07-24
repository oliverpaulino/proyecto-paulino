"use client";

import { ConduceEntityConduces } from "@/app/dashboard/empleados/[id]/components/conduce-entity-conduces";


interface EquipoConducesProps {
   equipoId: string;
   ocultarProyecto?: boolean;
}

/**
 * Historial de conduces de un equipo (para usar en su ficha), igual que
 * EmployeeConduces pero acotando por equipo_id en vez de empleado_id.
 */
export function EquipoConduces({ equipoId, ocultarProyecto = false }: EquipoConducesProps) {
   return (
      <ConduceEntityConduces filtroKey="equipo_id" filtroValue={equipoId} ocultarProyecto={ocultarProyecto} />
   );
}