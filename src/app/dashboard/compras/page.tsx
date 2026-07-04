import { Metadata } from "next";
import ComprasView from "./components/purchase-order-view";

export const metadata: Metadata = {
   title: "Compras",
   description: "Administra y organiza el flujo de compras de tus proveedores",
}

export default function ComprasPage() {

   return (
      <>
         <ComprasView />
      </>
   );
}
