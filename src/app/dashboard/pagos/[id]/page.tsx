"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PagoDetail } from "./components/pago-detail";
import { usePagoStore } from "@/stores/usePagoStore";

export default function PagoDetailPage() {
   const params = useParams();
   const router = useRouter();
   const { selectedPago: pago, loading, GetPagoById, clearSelectedPago } = usePagoStore();

   useEffect(() => {
      GetPagoById(params.id as string);
      return () => clearSelectedPago();
   }, [params.id, GetPagoById, clearSelectedPago]);

   if (loading) {
      return (
         <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-brand-blue" />
            <p>Cargando detalle del pago...</p>
         </div>
      );
   }

   if (!pago) {
      return (
         <div className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Pago no encontrado</h2>
            <Button onClick={() => router.back()}>Volver</Button>
         </div>
      );
   }

   return (
      <div className="p-6 max-w-5xl mx-auto w-full">
         <PagoDetail pago={pago} onRefresh={() => GetPagoById(params.id as string)} />
      </div>
   );
}