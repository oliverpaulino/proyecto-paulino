"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeduccionDetail } from "./components/deduccion-detail";
import type { Deduccion } from "@/dtos/deducciones.dto";
import { useDeduccionStore } from "@/stores/useDeduccionStore";

export default function DeduccionDetailPage() {
   const params = useParams();
   const router = useRouter();
   const [deduccion, setDeduccion] = useState<Deduccion | null>(null);
   const [loading, setLoading] = useState(true);
   const { setSelectedDeduccion, clearSelectedDeduccion } = useDeduccionStore();

   const fetchDeduccion = async () => {
      setLoading(true);
      try {
         const res = await fetch(`/api/deducciones/${params.id}`);
         if (res.ok) {
            const data = await res.json();
            setDeduccion(data);
            setSelectedDeduccion(data);
         }
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchDeduccion();
      return () => clearSelectedDeduccion();
   }, [params.id]);

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
      <div className="p-6 max-w-5xl mx-auto">
         <DeduccionDetail deduccion={deduccion} onRefresh={fetchDeduccion} />
      </div>
   );
}