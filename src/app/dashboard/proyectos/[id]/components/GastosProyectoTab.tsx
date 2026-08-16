"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Link2, Loader2, ReceiptText } from "lucide-react";
import type { Gasto } from "@/dtos/gastos.dto";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { useGastoStore } from "@/stores/useGastoStore";
import { GastoTable } from "../../../gastos/components/gasto-table";
import { GastoForm } from "../../../gastos/components/gasto-form";
import { MoverCobrabilidadDialog } from "./MoverCobrabilidadDialog";
import { AsociarGastoDialog } from "./AsociarGastoDialog";
import { formatMoney } from "./formatMoney";

export function GastosProyectoTab({
   proyecto,
   cobrable,
   onProyectoChange,
}: {
   proyecto: Proyecto;
   /** true = tab Cobrables, false = tab Incobrables */
   cobrable: boolean;
   onProyectoChange?: () => void;
}) {
   const { CreateGasto, MoveCobrable, GetGastosByProyecto } = useGastoStore();
   const proyectoId = proyecto.id;

   const [gastos, setGastos] = useState<Gasto[]>([]);
   const [loading, setLoading] = useState(true);
   const [createOpen, setCreateOpen] = useState(false);
   const [asociarOpen, setAsociarOpen] = useState(false);
   const [formLoading, setFormLoading] = useState(false);
   const [moverGasto, setMoverGasto] = useState<Gasto | null>(null);
   const [moveLoading, setMoveLoading] = useState(false);
   const [loadError, setLoadError] = useState<string | null>(null);

   const loadGastos = useCallback(async () => {
      setLoading(true);
      setLoadError(null);
      try {
         const data = await GetGastosByProyecto(proyectoId, cobrable);
         setGastos(data);
      } catch (err) {
         setLoadError(err instanceof Error ? err.message : "Error al cargar los gastos");
      } finally {
         setLoading(false);
      }
   }, [proyectoId, cobrable, GetGastosByProyecto]);

   useEffect(() => {
      loadGastos();
   }, [loadGastos]);

   async function handleCreate(data: any) {
      setFormLoading(true);
      try {
         const result = await CreateGasto(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
         await loadGastos();
         onProyectoChange?.();
      } finally {
         setFormLoading(false);
      }
   }

   async function handleMoveConfirm(monto: number | null) {
      if (!moverGasto) return;
      setMoveLoading(true);
      try {
         const result = await MoveCobrable(moverGasto.id, {
            cobrable_proyecto: !cobrable,
            cobrable_monto: monto,
         });
         if (result instanceof Error) throw result;
         setMoverGasto(null);
         await loadGastos();
         onProyectoChange?.();
      } finally {
         setMoveLoading(false);
      }
   }

   const totalMonto = gastos.reduce(
      (acc, g) => acc + (cobrable ? (g.cobrable_monto ?? g.monto_total) : g.monto_total),
      0
   );

   return (
      <Card>
         <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div>
               <CardTitle>{cobrable ? "Gastos cobrables" : "Gastos incobrables"}</CardTitle>
               <CardDescription>
                  {cobrable
                     ? "Gastos del proyecto que se le cobrarán al cliente."
                     : "Gastos del proyecto que corren por cuenta de la empresa."}
               </CardDescription>
               <p className="mt-2 text-sm font-medium text-brand-blue">
                  {gastos.length} gasto{gastos.length === 1 ? "" : "s"} · {formatMoney(totalMonto)}
               </p>
            </div>
            <div className="flex items-center gap-2">
               <Button
                  className="font-semibold shadow-md border-0"
                  onClick={() => setAsociarOpen(true)}
                  disabled={formLoading}
                  variant="outline"
               >
                  <Link2 className="size-4 mr-2" />
                  Asociar gasto
               </Button>
               <Button
                  className="font-semibold shadow-md border-0"
                  onClick={() => setCreateOpen(true)}
                  disabled={formLoading}
               >
                  <Plus className="size-4 mr-2" />
                  Agregar Gasto
               </Button>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            {loading && gastos.length === 0 ? (
               <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
                  <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
                  Cargando gastos…
               </div>
            ) : loadError ? (
               <div className="flex items-center justify-center p-8 text-sm text-destructive">{loadError}</div>
            ) : gastos.length === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
                  <ReceiptText className="size-10 opacity-30" />
                  <span>No hay gastos {cobrable ? "cobrables" : "incobrables"} para este proyecto.</span>
               </div>
            ) : (
               <div className="flex flex-col w-full gap-2 p-6 text-sm text-muted-foreground">
                  <GastoTable
                     gastos={gastos}
                     onMoveGasto={setMoverGasto}
                     moveTargetLabel={cobrable ? "Mover a Incobrables" : "Mover a Cobrables"}
                     onDataChanged={loadGastos}
                  />
               </div>
            )}
         </CardContent>

         {/* Agregar gasto pre-configurado al proyecto */}
         <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>
                     {cobrable
                        ? "Agregar Gasto Cobrable al Proyecto"
                        : "Agregar Gasto Incobrable al Proyecto"}
                     </DialogTitle>
                  <DialogDescription>
                     {cobrable
                        ? "El gasto quedará asociado al proyecto y marcado como cobrable al cliente."
                        : "El gasto quedará asociado al proyecto y correrá por cuenta de la empresa."}
                  </DialogDescription>
               </DialogHeader>
               <GastoForm
                  predefinedValues={{
                     proyecto_id: proyectoId,
                     cobrable_proyecto: cobrable,
                  }}
                  predefinedLabels={{ proyecto: proyecto.codigoReferencia }}
                  onSubmit={handleCreate}
                  onCancel={() => setCreateOpen(false)}
                  loading={formLoading}
               />
            </DialogContent>
         </Dialog>

         {/* Mover gasto entre cobrable / incobrable */}
         <MoverCobrabilidadDialog
            gasto={moverGasto}
            toCobrable={!cobrable}
            loading={moveLoading}
            onConfirm={handleMoveConfirm}
            onClose={() => setMoverGasto(null)}
         />

         {/* Asociar gasto existente sin proyecto */}
         <AsociarGastoDialog
            open={asociarOpen}
            onOpenChange={setAsociarOpen}
            proyectoId={proyectoId}
            cobrable={cobrable}
            onAsociado={async () => {
               await loadGastos();
               onProyectoChange?.();
            }}
         />
      </Card>
   );
}
