"use client"
import { Metadata } from "next";
import ComprasView from "./components/purchase-order-view";
import { useEffect } from "react";



export default function ComprasPage() {
   useEffect(() => {
      document.title = "Ordenes de Compra"
   }, [])
   return (
      <>
         <ComprasView />
      </>
   );
}
