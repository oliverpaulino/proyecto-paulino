"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import EmployeeDetailView from "./components/EmployeeDetailView";

export default function EmployeeDetailPage() {
   const params = useParams();
   const id = params?.id;

   // Usamos un ref para guardar el título original solo la primera vez que carga
   const originalTitle = useRef(typeof document !== 'undefined' ? document.title : "Constructora Kissimmee");

   const employee = useEmployeeStore((state) => state.selectedEmployee);
   const clearEmployee = useEmployeeStore((state) => state.clearSelectedEmployee); // Opcional, pero recomendado

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
   }, [employee, clearEmployee]);

   return (
      <EmployeeDetailView />
   );
}