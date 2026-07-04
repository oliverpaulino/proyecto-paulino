"use client"
import { Metadata } from "next";
import PurchaseOrderDetail from "./components/purchase-order-detail";
import { useEffect } from "react";

export default function PurchaseOrderDetailPage() {
   useEffect(() => {
      document.title = "Detalle de Orden de Compra"
   }, [])
   return (
      <>
         <PurchaseOrderDetail />
      </>
   );
}
