"use client";

import { ConduceEntityConduces } from "./conduce-entity-conduces";



interface EmployeeConducesProps {
   empleadoId: string;
   ocultarProyecto?: boolean;
}

/** Historial de conduces de un empleado/operador (usado en su ficha). */
export function EmployeeConduces({ empleadoId, ocultarProyecto = false }: EmployeeConducesProps) {
   return (
      <ConduceEntityConduces filtroKey="empleado_id" filtroValue={empleadoId} ocultarProyecto={ocultarProyecto} />
   );
}