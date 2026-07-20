"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CostoDetail } from "./components/costo-detail";
import type { Costo } from "@/dtos/costos.dto";
import { useCostoStore } from "@/stores/useCostoStore";

export default function CostoDetailPage() {
   const params = useParams();
   const router = useRouter();
   const [costo, setCosto] = useState<Costo | null>(null);
   const [loading, setLoading] = useState(true);
   const { setSelectedCosto, clearSelectedCosto } = useCostoStore();

   const fetchCosto = async () => {
      setLoading(true);
      try {
         const res = await fetch(`/api/costos/${params.id}`);
         if (res.ok) {
            const data = await res.json();
            setCosto(data);
            setSelectedCosto(data);
         }
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchCosto();
      return () => clearSelectedCosto();
   }, [params.id]);

   if (loading) {
      return (
         <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-brand-blue" />
            <p>Cargando detalle del costo...</p>
         </div>
      );
   }

   if (!costo) {
      return (
         <div className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Costo no encontrado</h2>
            <Button onClick={() => router.back()}>Volver</Button>
         </div>
      );
   }

   return (
      <div className="p-6 max-w-5xl mx-auto">
         <CostoDetail costo={costo} onRefresh={fetchCosto} />
      </div>
   );
}