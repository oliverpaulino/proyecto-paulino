"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";

interface Props {
   open: boolean;
   onClose: () => void;
   empleadoId: string;
   // Si viene con un ID, es porque le dimos a "Editar" en la tabla para esa categoría
   categoriaInicialId?: string | null;
}

export function TarifaEmpleadoDialog({ open, onClose, empleadoId, categoriaInicialId }: Props) {
   const { CategoriaEquipos, GetCategoriaEquipos } = useCategoriaEquipoStore();
   const { selectedEmployee, SaveTarifasCategoria } = useEmployeeStore();

   const [loading, setLoading] = useState(false);
   const [categoriaId, setCategoriaId] = useState("");

   // Guardaremos los montos con la llave siendo el ID de la tarifa (ej. el ID de "Viaje" o "Bote")
   const [montos, setMontos] = useState<Record<string, string>>({});

   useEffect(() => {
      if (open) {
         GetCategoriaEquipos();
         if (categoriaInicialId) {
            handleCategoriaChange(categoriaInicialId);
         } else {
            setCategoriaId("");
            setMontos({});
         }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [open, categoriaInicialId]);

   // Cuando cambia la categoría, precargamos los valores si el empleado ya los tenía guardados
   const handleCategoriaChange = (idCategoria: string) => {
      setCategoriaId(idCategoria);

      const empleadoTarifas = selectedEmployee?.tarifas || [];
      // Filtramos las tarifas que el empleado ya tiene para este camión/equipo
      const tarifasDeEstaCategoria = empleadoTarifas.filter(t => t.categoria_equipo_id === idCategoria);

      const nuevosMontos: Record<string, string> = {};
      tarifasDeEstaCategoria.forEach(t => {
         // Usamos categoria_equipo_tarifa_id como llave
         nuevosMontos[t.categoria_equipo_tarifa_id] = t.monto_pago.toString();
      });
      setMontos(nuevosMontos);
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!categoriaId) return;

      // Convertimos el objeto de montos al arreglo que espera el backend (SaveTarifasBulkDTO)
      const tarifasArray = Object.entries(montos)
         .filter(([_, montoStr]) => montoStr !== "" && !isNaN(Number(montoStr)))
         .map(([tarifaId, montoStr]) => ({
            categoria_equipo_tarifa_id: tarifaId, // <-- El ID correcto de la tarifa
            monto_pago: Number(montoStr)
         }));

      if (tarifasArray.length === 0) {
         onClose();
         return;
      }

      setLoading(true);
      try {
         await SaveTarifasCategoria(empleadoId, {
            tarifas: tarifasArray
         });
         onClose();
      } catch (error: any) {
         alert(error.message || "Ocurrió un error al guardar las tarifas");
      } finally {
         setLoading(false);
      }
   };

   // Buscamos la categoría completa para poder iterar sobre sus tarifas base (Bote, Viaje, etc.)
   const categoriaSeleccionada = CategoriaEquipos.find(c => c.id === categoriaId);

   return (
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
         <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
               <DialogHeader>
                  <DialogTitle>Asignar Tarifas de Operación</DialogTitle>
                  <DialogDescription>
                     Selecciona un equipo y define cuánto ganará el empleado por cada tipo de cobro.
                  </DialogDescription>
               </DialogHeader>

               <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                     <Label>Categoría de Equipo</Label>
                     <select
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={categoriaId}
                        onChange={(e) => handleCategoriaChange(e.target.value)}
                        disabled={!!categoriaInicialId} // Bloqueamos el selector si estamos en modo "Editar"
                     >
                        <option value="" disabled>Selecciona un equipo...</option>
                        {CategoriaEquipos.map((cat) => (
                           <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                     </select>
                  </div>

                  {/* Mostramos dinámicamente los inputs según las tarifas que tenga la categoría en BD */}
                  {categoriaSeleccionada && categoriaSeleccionada.tarifas && categoriaSeleccionada.tarifas.length > 0 && (
                     <div className="mt-4 space-y-4 rounded-lg border p-4 bg-muted/10">
                        <Label className="text-muted-foreground">Precios para {categoriaSeleccionada.nombre}</Label>

                        {categoriaSeleccionada.tarifas.map((tarifaCategoria) => (
                           <div key={tarifaCategoria.id} className="flex items-center justify-between gap-4">
                              <Label className="flex-1 text-sm">{tarifaCategoria.nombre} (RD$)</Label>
                              <Input
                                 className="w-32"
                                 type="number"
                                 step="0.01"
                                 min="0"
                                 placeholder="Ej: 400"
                                 // Usamos el ID de la tarifa de la categoría para enlazar el monto
                                 value={montos[tarifaCategoria.id!] || ""}
                                 onChange={(e) => setMontos({
                                    ...montos,
                                    [tarifaCategoria.id!]: e.target.value
                                 })}
                              />
                           </div>
                        ))}
                     </div>
                  )}

                  {categoriaSeleccionada && (!categoriaSeleccionada.tarifas || categoriaSeleccionada.tarifas.length === 0) && (
                     <p className="text-sm text-amber-600 mt-2">
                        Esta categoría no tiene tarifas base configuradas. Ve a la sección de Equipos para agregarlas.
                     </p>
                  )}
               </div>

               <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                     Cancelar
                  </Button>
                  <Button type="submit" disabled={loading || !categoriaId}>
                     {loading ? "Guardando..." : "Guardar Tarifas"}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}