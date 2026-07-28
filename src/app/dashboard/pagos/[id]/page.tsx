"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PagoDetail } from "./components/pago-detail";
import type { Pago } from "@/dtos/pagos.dto";
import { usePagoStore } from "@/stores/usePagoStore";

export default function PagoDetailPage() {
   const params = useParams();
   const router = useRouter();
   const [pago, setPago] = useState<Pago | null>(null);
   const [loading, setLoading] = useState(true);
   const { setSelectedPago, clearSelectedPago } = usePagoStore();

   const fetchPago = async () => {
      setLoading(true);
      try {
         const res = await fetch(`/api/pagos/${params.id}`);
         if (res.ok) {
            const data = await res.json();
            setPago(data);
            setSelectedPago(data);
         }
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchPago();
      return () => clearSelectedPago();
   }, [params.id]);

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
         <PagoDetail pago={pago} onRefresh={fetchPago} />
      </div>
   );
}