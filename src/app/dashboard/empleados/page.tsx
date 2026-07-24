"use client"
import { useEffect } from "react"
import EmpleadosView from "./components/EmpleadosView"


export default function EmpleadosPage() {
   useEffect(() => {
      document.title = "Empleados"
   }, [])
   return <EmpleadosView />
}
