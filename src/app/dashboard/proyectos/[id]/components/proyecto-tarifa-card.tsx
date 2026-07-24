"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { useMedidaCobroStore } from "@/stores/useMedidaCobroStore";
import { useProyectoTarifaStore } from "@/stores/useProyectoTarifaStore";

interface Props {
   proyectoId: string;
}

// Deja negociar, para ESTE proyecto en particular, un precio distinto al
// global de categoria_equipo_tarifa. Esa tarifa se precarga sola en el
// conduce-form cuando el conduce se registra para este proyecto.
export function ProyectoTarifasCard({ proyectoId }: Props) {
   const { CategoriaEquipos, GetCategoriaEquipos } = useCategoriaEquipoStore();
   const { GetMedidaCobros, getNombre: getNombreMedidaCobro } = useMedidaCobroStore();
   const { tarifasPorProyecto, GetTarifas, UpsertTarifa, DeleteTarifa } = useProyectoTarifaStore();

   useEffect(() => {
      GetCategoriaEquipos();
      GetMedidaCobros();
      GetTarifas(proyectoId);
   }, [GetCategoriaEquipos, GetMedidaCobros, GetTarifas, proyectoId]);

   const tarifasProyecto = tarifasPorProyecto[proyectoId] ?? [];

   const [categoriaId, setCategoriaId] = useState("");
   const [tarifaId, setTarifaId] = useState("");
   const [precio, setPrecio] = useState(0);
   const [guardando, setGuardando] = useState(false);
   const [eliminandoId, setEliminandoId] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);

   const categoriaSeleccionada = CategoriaEquipos.find((c) => c.id === categoriaId);
   const opcionesTarifa = useMemo(
      () =>
         (categoriaSeleccionada?.tarifas ?? [])
            .filter((t) => !!t.id)
            .map((t) => ({ ...t, medida_cobro_nombre: getNombreMedidaCobro(t.medida_cobro_id) ?? "unidad" })),
      [categoriaSeleccionada, getNombreMedidaCobro]
   );

   function handleCategoriaChange(id: string) {
      setCategoriaId(id);
      setTarifaId("");
   }

   function handleTarifaChange(id: string) {
      setTarifaId(id);
      const t = opcionesTarifa.find((o) => o.id === id);
      setPrecio(t?.precio_unitario ?? 0);
   }

   async function handleAgregar() {
      if (!tarifaId) {
         setError("Seleccione una tarifa");
         return;
      }
      setError(null);
      setGuardando(true);
      try {
         const result = await UpsertTarifa({
            proyecto_id: proyectoId,
            categoria_equipo_tarifa_id: tarifaId,
            precio_unitario: precio,
         });
         if (result instanceof Error) throw result;
         setCategoriaId("");
         setTarifaId("");
         setPrecio(0);
      } catch (e) {
         setError(e instanceof Error ? e.message : "Error al guardar la tarifa");
      } finally {
         setGuardando(false);
      }
   }

   async function handleEliminar(id: string) {
      setEliminandoId(id);
      try {
         await DeleteTarifa(id, proyectoId);
      } finally {
         setEliminandoId(null);
      }
   }

   return (
      <div className="space-y-4">
         {tarifasProyecto.length === 0 ? (
            <p className="text-sm text-muted-foreground">
               Este proyecto usa los precios globales por defecto de cada tarifa. Agrega una tarifa propia si
               negociaste un precio distinto con el cliente.
            </p>
         ) : (
            <div className="flex flex-wrap gap-2">
               {tarifasProyecto.map((t) => (
                  <Badge
                     key={t.id}
                     variant="outline"
                     className="flex items-center gap-2 py-1.5 pl-3 pr-1.5 text-sm font-normal"
                  >
                     {t.categoria_equipo_nombre} · {t.categoria_equipo_tarifa_nombre}
                     <span className="font-semibold">RD$ {t.precio_unitario.toLocaleString("es-DO")}</span>
                     <button
                        type="button"
                        onClick={() => handleEliminar(t.id)}
                        disabled={eliminandoId === t.id}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                     >
                        <Trash2 className="size-3.5" />
                     </button>
                  </Badge>
               ))}
            </div>
         )}

         <div className="grid grid-cols-[1fr_1fr_120px_auto] gap-2 items-end">
            <div className="space-y-1.5">
               <Label className="text-xs">Categoría de Equipo</Label>
               <Select value={categoriaId} onValueChange={handleCategoriaChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>
                     {CategoriaEquipos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>

            <div className="space-y-1.5">
               <Label className="text-xs">Tarifa</Label>
               <Select value={tarifaId} onValueChange={handleTarifaChange} disabled={!categoriaId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>
                     {opcionesTarifa.map((t) => (
                        <SelectItem key={t.id} value={t.id as string}>
                           {t.nombre} ({t.medida_cobro_nombre})
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>

            <div className="space-y-1.5">
               <Label className="text-xs">Precio RD$</Label>
               <Input type="number" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} />
            </div>

            <Button type="button" size="icon" onClick={handleAgregar} disabled={guardando}>
               <Plus className="size-4" />
            </Button>
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
   );
}