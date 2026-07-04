
import { Metadata } from "next";
import ClientView from "./components/client-view";

export const metadata: Metadata = {
   title: "Clientes",
   description: "Administra y organiza la información de tus clientes",
}
export default function ClientsPage() {

   return (
      <>
         <ClientView />
      </>
   );
}
