"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GastoDetail } from "./components/gasto-detail";
import type { Gasto } from "@/dtos/gastos.dto";
import { useGastoStore } from "@/stores/useGastoStore";

export default function GastoDetailPage() {
   const params = useParams();
   const router = useRouter();
   const [gasto, setGasto] = useState<Gasto | null>(null);
   const [loading, setLoading] = useState(true);
   const { setSelectedGasto, clearSelectedGasto } = useGastoStore();

   const fetchGasto = async () => {
      setLoading(true);
      try {
         const res = await fetch(`/api/gastos/${params.id}`);
         if (res.ok) {
            const data = await res.json();
            setGasto(data);
            setSelectedGasto(data);
         }
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchGasto();
      return () => clearSelectedGasto();
   }, [params.id]);

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
         <GastoDetail gasto={gasto} onRefresh={fetchGasto} />
      </div>
   );
}