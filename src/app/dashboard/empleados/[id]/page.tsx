"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import EmployeeDetailView from "./components/EmployeeDetailView";

export default function EmployeeDetailPage() {
   const employee = useEmployeeStore((state) => state.selectedEmployee);

   useEffect(() => {
      // 1. Cambiamos el título
      if (employee && employee.empleado.nombre) {
         document.title = `${employee.empleado.nombre}`;
      } else {
         document.title = "Cargando Detalle...";
      }

      // 2. Función de limpieza: Se ejecuta al salir de la página
      return () => {
         document.title = "Empleados";

      };
   }, [employee]);

   return (
      <EmployeeDetailView />
   );
}