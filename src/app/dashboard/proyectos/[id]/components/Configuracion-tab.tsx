import { Card } from "@/components/ui/card";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { useEffect } from "react";
import { ProyectoTarifasCard } from "./proyecto-tarifa-card";


export default function ConfiguracionTab({ proyectoId }: { proyectoId: string }) {
   const { proyecto, GetProyectoById } = useProyectoStore();
   useEffect(() => {
      GetProyectoById(proyectoId);
   }, [GetProyectoById, proyectoId]);

   if (!proyecto) return <div>Cargando...</div>;

   return (
      <div className="space-y-4">
         <ProyectoTarifasCard proyectoId={proyectoId} />
      </div>
   );
}