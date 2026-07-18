"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Check, Pencil, Plus, Settings2, Tag, Trash2, X } from "lucide-react";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { useEquipoStore } from "@/stores/useEquipoStore";
import { useMedidaCobroStore } from "@/stores/useMedidaCobroStore";
import type { CategoriaEquipo, TarifaCategoria } from "@/dtos/categoria-equipo.dto";
import { MedidaCobroManager } from "./medida-cobro-manager";

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

interface CategoriaEquipoManagerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function CategoriaEquipoManager({ open, onOpenChange }: CategoriaEquipoManagerProps) {
   const { CategoriaEquipos, GetCategoriaEquipos, CreateCategoriaEquipo, UpdateCategoriaEquipo, DeleteCategoriaEquipo } = useCategoriaEquipoStore();
   const { Equipos, GetEquipos } = useEquipoStore();
   const { MedidaCobros, GetMedidaCobros } = useMedidaCobroStore();

   // Estados generales y de creación
   const [newNombre, setNewNombre] = useState("");
   const [newTarifas, setNewTarifas] = useState<TarifaCategoria[]>([
      { nombre: "", medida_cobro_id: "", precio_unitario: 0, cobra_minimo: null }
   ]);

   // Estados de edición
   const [editId, setEditId] = useState<string | null>(null);
   const [editNombre, setEditNombre] = useState("");
   const [editTarifas, setEditTarifas] = useState<TarifaCategoria[]>([]);

   const [busy, setBusy] = useState(false);
   const [manageMedidasOpen, setManageMedidasOpen] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<CategoriaEquipo | null>(null);

   useEffect(() => {
      if (open) {
         GetCategoriaEquipos();
         GetMedidaCobros();
         GetEquipos();
      }
   }, [open, GetCategoriaEquipos, GetEquipos, GetMedidaCobros]);

   function countEquipos(categoriaId: string): number {
      return Equipos.filter((e) => e.categoria_id === categoriaId).length;
   }

   // --- FUNCIONES PARA CREACIÓN ---
   const updateTarifa = (index: number, field: keyof TarifaCategoria, value: any) => {
      const updated = [...newTarifas];
      updated[index] = { ...updated[index], [field]: value };
      setNewTarifas(updated);
   };

   const addTarifa = () => {
      setNewTarifas([...newTarifas, { nombre: "", medida_cobro_id: "", precio_unitario: 0, cobra_minimo: null }]);
   };

   const removeTarifa = (index: number) => {
      setNewTarifas(newTarifas.filter((_, i) => i !== index));
   };

   async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (!newNombre.trim() || newTarifas.length === 0) return;

      setBusy(true);
      setError(null);
      try {
         const result = await CreateCategoriaEquipo({
            nombre: newNombre.trim(),
            tarifas: newTarifas,
         });

         if (result instanceof Error) throw result;

         // Limpiar formulario
         setNewNombre("");
         setNewTarifas([{ nombre: "", medida_cobro_id: "", precio_unitario: 0, cobra_minimo: null }]);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al crear categoría");
      } finally {
         setBusy(false);
      }
   }

   // --- FUNCIONES PARA EDICIÓN ---
   function startEdit(cat: CategoriaEquipo) {
      setEditId(cat.id);
      setEditNombre(cat.nombre);
      // Clonamos las tarifas para no mutar el estado global directamente
      setEditTarifas(cat.tarifas && cat.tarifas.length > 0 ? [...cat.tarifas] : []);
      setError(null);
   }

   const updateEditTarifa = (index: number, field: keyof TarifaCategoria, value: any) => {
      const updated = [...editTarifas];
      updated[index] = { ...updated[index], [field]: value };
      setEditTarifas(updated);
   };

   const addEditTarifa = () => {
      setEditTarifas([...editTarifas, { nombre: "", medida_cobro_id: "", precio_unitario: 0, cobra_minimo: null }]);
   };

   const removeEditTarifa = (index: number) => {
      setEditTarifas(editTarifas.filter((_, i) => i !== index));
   };

   async function saveEdit(id: string) {
      if (!editNombre.trim() || editTarifas.length === 0) {
         setError("Debe tener un nombre y al menos una tarifa.");
         return;
      }

      setBusy(true);
      setError(null);

      try {
         const result = await UpdateCategoriaEquipo(id, {
            nombre: editNombre.trim(),
            tarifas: editTarifas,
         });

         if (result instanceof Error) throw result;

         setEditId(null);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al actualizar categoría");
      } finally {
         setBusy(false);
      }
   }

   // --- FUNCIONES PARA ELIMINACIÓN ---
   async function confirmDelete() {
      if (!deleteTarget) return;
      setBusy(true);
      setError(null);
      try {
         const result = await DeleteCategoriaEquipo(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al eliminar categoría");
      } finally {
         setBusy(false);
      }
   }

   const affectedCount = deleteTarget ? countEquipos(deleteTarget.id) : 0;

   return (
      <>
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                     <Tag className="size-5 text-brand-blue" />
                     Gestionar categorías de equipos
                  </DialogTitle>
                  <DialogDescription>
                     Define los tipos de equipo y sus múltiples tarifas (Ej. Bote, Viaje).
                  </DialogDescription>
               </DialogHeader>

               {/* Formulario de nueva categoría */}
               <form onSubmit={handleCreate} className="flex flex-col gap-4 rounded-lg bg-muted/30 p-3 border border-border">
                  <div className="flex flex-col gap-1">
                     <Label className="text-xs font-bold">Nombre de la categoría *</Label>
                     <Input
                        value={newNombre}
                        onChange={(e) => setNewNombre(e.target.value)}
                        placeholder="Ej: Camión 15m3"
                        disabled={busy}
                        required
                     />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                     <Label className="text-xs font-bold">Esquemas de Tarifa *</Label>
                     <button
                        type="button"
                        onClick={() => setManageMedidasOpen(true)}
                        className="flex items-center gap-1 text-xs text-brand-blue hover:underline"
                     >
                        <Settings2 className="size-3" />
                        Gestionar Medidas
                     </button>
                  </div>

                  {newTarifas.map((tarifa, index) => (
                     <div key={index} className="grid grid-cols-12 gap-2 p-2 bg-background border rounded-md relative items-end">
                        <div className="col-span-12 sm:col-span-3 flex flex-col gap-1">
                           <Label className="text-[10px]">Nombre (Ej. Bote)</Label>
                           <Input
                              value={tarifa.nombre}
                              onChange={(e) => updateTarifa(index, "nombre", e.target.value)}
                              placeholder="Ej. Bote"
                              disabled={busy}
                              required
                           />
                        </div>
                        <div className="col-span-12 sm:col-span-3 flex flex-col gap-1">
                           <Label className="text-[10px]">Unidad</Label>
                           <select
                              value={tarifa.medida_cobro_id}
                              onChange={(e) => updateTarifa(index, "medida_cobro_id", e.target.value)}
                              className={SELECT_CLASS}
                              required
                           >
                              <option value="">Selec.</option>
                              {MedidaCobros.map((m) => (
                                 <option key={m.id} value={m.id}>{m.nombre}</option>
                              ))}
                           </select>
                        </div>
                        <div className="col-span-6 sm:col-span-2 flex flex-col gap-1">
                           <Label className="text-[10px]">Precio Unit.</Label>
                           <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tarifa.precio_unitario || ""}
                              onChange={(e) => updateTarifa(index, "precio_unitario", Number(e.target.value))}
                              placeholder="0.00"
                              disabled={busy}
                              required
                           />
                        </div>
                        <div className="col-span-5 sm:col-span-3 flex flex-col gap-1">
                           <Label className="text-[10px]">Mínimo (Opc.)</Label>
                           <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tarifa.cobra_minimo || ""}
                              onChange={(e) => updateTarifa(index, "cobra_minimo", e.target.value ? Number(e.target.value) : null)}
                              placeholder="0.00"
                              disabled={busy}
                           />
                        </div>
                        {newTarifas.length > 1 && (
                           <div className="col-span-1 flex justify-center pb-1">
                              <button
                                 type="button"
                                 onClick={() => removeTarifa(index)}
                                 className="text-brand-red hover:bg-brand-red/10 p-1 rounded"
                                 title="Quitar tarifa"
                              >
                                 <Trash2 className="size-4" />
                              </button>
                           </div>
                        )}
                     </div>
                  ))}

                  <div className="flex justify-between items-center pt-2">
                     <Button type="button" variant="outline" size="sm" onClick={addTarifa} disabled={busy}>
                        <Plus className="size-3 mr-1" /> Otra tarifa
                     </Button>
                     <Button type="submit" disabled={busy || !newNombre.trim()}>
                        <Plus className="size-4 mr-1" /> Crear Categoría
                     </Button>
                  </div>
               </form>

               {error && <p className="text-sm text-destructive">{error}</p>}

               {/* Lista de Categorías */}
               <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {CategoriaEquipos.length === 0 ? (
                     <div className="p-6 text-center text-sm text-muted-foreground">Aún no hay categorías.</div>
                  ) : (
                     CategoriaEquipos.map((cat) => {
                        const used = countEquipos(cat.id);
                        const isEditing = editId === cat.id;

                        if (isEditing) {
                           return (
                              <div key={cat.id} className="flex flex-col gap-3 p-3 bg-muted/20 rounded-md border-b border-border w-full">
                                 {/* Edición del Nombre */}
                                 <div className="flex items-center gap-2">
                                    <Input
                                       value={editNombre}
                                       onChange={(e) => setEditNombre(e.target.value)}
                                       className="h-8 flex-1 font-semibold"
                                       placeholder="Nombre de la categoría"
                                       autoFocus
                                       disabled={busy}
                                    />
                                    <div className="flex items-center gap-1">
                                       <button
                                          type="button"
                                          onClick={() => saveEdit(cat.id)}
                                          disabled={busy}
                                          className="rounded-md p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 bg-background border"
                                          title="Guardar"
                                       >
                                          <Check className="size-4" />
                                       </button>
                                       <button
                                          type="button"
                                          onClick={() => setEditId(null)}
                                          disabled={busy}
                                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted bg-background border"
                                          title="Cancelar"
                                       >
                                          <X className="size-4" />
                                       </button>
                                    </div>
                                 </div>

                                 {/* Edición de las Tarifas de esta categoría */}
                                 <div className="flex flex-col gap-2 pl-2 border-l-2 border-brand-blue/30">
                                    {editTarifas.map((tarifa, index) => (
                                       <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                          <Input
                                             value={tarifa.nombre}
                                             onChange={(e) => updateEditTarifa(index, "nombre", e.target.value)}
                                             className="h-8 w-full sm:w-24 text-xs"
                                             placeholder="Ej. Bote"
                                             disabled={busy}
                                          />
                                          <select
                                             value={tarifa.medida_cobro_id}
                                             onChange={(e) => updateEditTarifa(index, "medida_cobro_id", e.target.value)}
                                             className={`${SELECT_CLASS} h-8 w-full sm:w-28 text-xs py-0`}
                                             disabled={busy}
                                          >
                                             <option value="">Medida</option>
                                             {MedidaCobros.map((m) => (
                                                <option key={m.id} value={m.id}>{m.nombre}</option>
                                             ))}
                                          </select>
                                          <Input
                                             type="number"
                                             min="0"
                                             step="0.01"
                                             value={tarifa.precio_unitario || ""}
                                             onChange={(e) => updateEditTarifa(index, "precio_unitario", Number(e.target.value))}
                                             className="h-8 w-full sm:w-24 text-xs"
                                             placeholder="Precio"
                                             disabled={busy}
                                          />
                                          <Input
                                             type="number"
                                             min="0"
                                             step="0.01"
                                             value={tarifa.cobra_minimo || ""}
                                             onChange={(e) => updateEditTarifa(index, "cobra_minimo", e.target.value ? Number(e.target.value) : null)}
                                             className="h-8 w-full sm:w-20 text-xs"
                                             placeholder="Mínimo"
                                             disabled={busy}
                                          />
                                          {editTarifas.length > 1 && (
                                             <button
                                                type="button"
                                                onClick={() => removeEditTarifa(index)}
                                                className="text-brand-red hover:bg-brand-red/10 p-1.5 rounded"
                                                title="Quitar tarifa"
                                             >
                                                <Trash2 className="size-3.5" />
                                             </button>
                                          )}
                                       </div>
                                    ))}

                                    <div className="flex mt-1">
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs text-brand-blue"
                                          onClick={addEditTarifa}
                                          disabled={busy}
                                       >
                                          <Plus className="size-3 mr-1" /> Añadir tarifa
                                       </Button>
                                    </div>
                                 </div>
                              </div>
                           );
                        }

                        // Vista de solo lectura
                        return (
                           <div key={cat.id} className="p-3 flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-bold truncate">{cat.nombre}</p>
                                 <div className="mt-1 flex flex-wrap gap-1">
                                    {cat.tarifas?.map((t, idx) => (
                                       <span key={idx} className="inline-flex items-center rounded-md bg-brand-blue/10 px-2 py-0.5 text-[10px] font-medium text-brand-blue">
                                          {t.nombre}: ${t.precio_unitario}
                                          {t.cobra_minimo ? ` (min. ${t.cobra_minimo})` : ""}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0 mt-1">
                                 {used} {used === 1 ? "equipo" : "equipos"}
                              </span>
                              <div className="flex items-center gap-1 ml-2">
                                 <button
                                    type="button"
                                    onClick={() => startEdit(cat)}
                                    className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10"
                                    title="Editar"
                                 >
                                    <Pencil className="size-4" />
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setDeleteTarget(cat)}
                                    className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10"
                                    title="Eliminar"
                                 >
                                    <Trash2 className="size-4" />
                                 </button>
                              </div>
                           </div>
                        );
                     })
                  )}
               </div>
            </DialogContent>

            {/* Modal de Confirmación de Eliminación */}
            <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
               <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-brand-red">
                        <AlertTriangle className="size-5" />
                        Eliminar categoría
                     </DialogTitle>
                     <DialogDescription asChild>
                        <div className="space-y-3 pt-1">
                           <p>Vas a eliminar la categoría <strong>{deleteTarget?.nombre}</strong>.</p>
                           {affectedCount > 0 ? (
                              <div className="rounded-lg border border-brand-red/40 bg-brand-red/10 p-3 text-sm text-brand-red">
                                 <strong>No se puede eliminar</strong> porque tiene <strong>{affectedCount} equipos</strong> asociados.
                              </div>
                           ) : (
                              <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
                           )}
                        </div>
                     </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>Cancelar</Button>
                     <Button type="button" variant="destructive" onClick={confirmDelete} disabled={busy || affectedCount > 0}>Eliminar</Button>
                  </div>
               </DialogContent>
            </Dialog>
         </Dialog>

         <MedidaCobroManager open={manageMedidasOpen} onOpenChange={(isOpen) => setManageMedidasOpen(isOpen)} />
      </>
   );
}