import { Metadata } from "next";
import PurchaseOrderDetail from "./components/purchase-order-detail";

export const metadata: Metadata = {
   title: "Detalle de Orden de Compra",
   description: "Visualiza y gestiona los detalles de la orden de compra seleccionada",
}

export default function PurchaseOrderDetailPage() {
   return (
      <>
         <PurchaseOrderDetail />
      </>
   );
}
