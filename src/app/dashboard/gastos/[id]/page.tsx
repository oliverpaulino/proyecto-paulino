"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GastoDetail } from "./components/gasto-detail";
import { useGastoStore } from "@/stores/useGastoStore";

export default function GastoDetailPage() {
   const params = useParams();
   const router = useRouter();
   const { selectedGasto: gasto, loading, GetGastoById, clearSelectedGasto } = useGastoStore();

   useEffect(() => {
      GetGastoById(params.id as string);
      return () => clearSelectedGasto();
   }, [params.id, GetGastoById, clearSelectedGasto]);

   if (loading) {
      return (
         <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-brand-blue" />
            <p>Cargando detalle del gasto...</p>
         </div>
      );
   }

   if (!gasto) {
      return (
         <div className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Gasto no encontrado</h2>
            <Button onClick={() => router.back()}>Volver</Button>
         </div>
      );
   }

   return (
      <div className="p-6 max-w-5xl mx-auto w-full">
         <GastoDetail gasto={gasto} onRefresh={() => GetGastoById(params.id as string)} />
      </div>
   );
}