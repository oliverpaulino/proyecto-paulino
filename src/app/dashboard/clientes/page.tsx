"use client"
import { Metadata } from "next";
import ClientView from "./components/client-view";
import { useEffect } from "react";

export default function ClientsPage() {
   useEffect(() => {
      document.title = "Clientes"
   }, [])
   return (
      <>
         <ClientView />
      </>
   );
}
