"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeduccionDetail } from "./components/deduccion-detail";
import { useDeduccionStore } from "@/stores/useDeduccionStore";

export default function DeduccionDetailPage() {
   const params = useParams();
   const router = useRouter();
   const { selectedDeduccion: deduccion, loading, GetDeduccionById, clearSelectedDeduccion } = useDeduccionStore();

   useEffect(() => {
      GetDeduccionById(params.id as string);
      return () => clearSelectedDeduccion();
   }, [params.id, GetDeduccionById, clearSelectedDeduccion]);

   if (loading) {
      return (
         <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-brand-blue" />
            <p>Cargando detalle de la deducción...</p>
         </div>
      );
   }

   if (!deduccion) {
      return (
         <div className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Deducción no encontrada</h2>
            <Button onClick={() => router.back()}>Volver</Button>
         </div>
      );
   }

   return (
      <div className="p-6 max-w-5xl mx-auto w-full">
         <DeduccionDetail deduccion={deduccion} onRefresh={() => GetDeduccionById(params.id as string)} />
      </div>
   );
}