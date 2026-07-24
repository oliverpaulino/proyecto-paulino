"use client"
import { Metadata } from "next";
import PurchaseOrderDetail from "./components/purchase-order-detail";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   ArrowLeft,
   Download,
   Loader2,
   Pencil,
   ShoppingCart,
   Trash2,
} from "lucide-react";
import type { PurchaseOrder, EstadoOrdenCompra } from "@/dtos/purchase-order.dto";
import { usePurchaseOrderStore } from "@/stores/usePurchaseOrderStore";
import { DeletePurchaseOrderDialog } from "../components/delete-purchase-order-dialog";
import { PurchaseOrderForm } from "../components/purchase-order-form";
import { generatePurchaseOrderPDF } from "./components/purchase-order-pdf";
import { PermissionGuard } from "@/components/permission-guard";

const ESTADO_BADGE: Record<string, string> = {
   BORRADOR:
      "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-600",
   PENDIENTE:
      "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
   APROBADA:
      "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   RECIBIDA:
      "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   CANCELADA:
      "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
};

const ESTADO_LABEL: Record<string, string> = {
   BORRADOR: "Borrador",
   PENDIENTE: "Pendiente",
   APROBADA: "Aprobada",
   RECIBIDA: "Recibida",
   CANCELADA: "Cancelada",
};

const TRANSITIONS: Record<EstadoOrdenCompra, EstadoOrdenCompra[]> = {
   BORRADOR: ["PENDIENTE", "CANCELADA"],
   PENDIENTE: ["APROBADA", "BORRADOR", "CANCELADA"],
   APROBADA: ["RECIBIDA", "CANCELADA"],
   RECIBIDA: [],
   CANCELADA: [],
};

const TRANSITION_BUTTON_LABEL: Record<EstadoOrdenCompra, string> = {
   BORRADOR: "Pasar a Borrador",
   PENDIENTE: "Enviar a Revisión",
   APROBADA: "Aprobar",
   RECIBIDA: "Marcar como Recibida",
   CANCELADA: "Cancelar",
};

function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
   }).format(value);
}

function formatDate(value: string | Date) {
   return new Date(value).toLocaleDateString("es-DO");
}

interface FormPayload {
   proveedor_id: string;
   fecha: string;
   notas: string;
   items: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      equipo_id?: string | null;
   }>;
}

export default function PurchaseOrderDetailPage() {
   useEffect(() => {
      document.title = "Detalle de Orden de Compra"
   }, [])
   return (
      <>
         <PurchaseOrderDetail />
      </>
   );
}
