"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { useEquipoStore } from "@/stores/useEquipoStore";
import type { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";
import { useMedidaCobroStore } from "@/stores/useMedidaCobroStore";
import { MedidaCobro } from "@/dtos/medida-cobro.dto";

interface MedidaCobroManagerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function MedidaCobroManager({ open, onOpenChange }: MedidaCobroManagerProps) {
   const { MedidaCobros, GetMedidaCobros, CreateMedidaCobro, UpdateMedidaCobro, DeleteMedidaCobro } = useMedidaCobroStore();
   const { CategoriaEquipos } = useCategoriaEquipoStore();
   // const { Equipos, GetEquipos } = useEquipoStore();

   const [newNombre, setNewNombre] = useState("");
   const [newDescripcion, setNewDescripcion] = useState("");
   const [newPermiteDecimales, setNewPermiteDecimales] = useState(true);
   const [newIsActive, setNewIsActive] = useState(true);
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const [editId, setEditId] = useState<string | null>(null);
   const [editNombre, setEditNombre] = useState("");
   const [editDescripcion, setEditDescripcion] = useState("");
   const [editPermiteDecimales, setEditPermiteDecimales] = useState(true);
   const [editIsActive, setEditIsActive] = useState(true);

   const [deleteTarget, setDeleteTarget] = useState<MedidaCobro | null>(null);

   useEffect(() => {
      if (open) {
         GetMedidaCobros();
         // GetCategoriaEquipos();
      }
   }, [open, GetMedidaCobros]);

   function countCategoriasEqupos(medidaId: string): number {
      return CategoriaEquipos.reduce((count, categoria) => {
         return count + categoria.tarifas.filter((tarifa) => tarifa.medida_cobro_id === medidaId).length;
      }, 0);
   }

   async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      if (!newNombre.trim()) return;
      setBusy(true);
      setError(null);
      try {
         const result = await CreateMedidaCobro({
            nombre: newNombre.trim(),
            descripcion: newDescripcion.trim(),
            permite_decimales: newPermiteDecimales,
            is_active: newIsActive,
         });
         if (result instanceof Error) throw result;
         setNewNombre("");
         setNewDescripcion("");
         setNewPermiteDecimales(true);
         setNewIsActive(true);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al crear medida de cobro");
      } finally {
         setBusy(false);
      }
   }

   function startEdit(cat: MedidaCobro) {
      setEditId(cat.id);
      setEditNombre(cat.nombre);
      setEditDescripcion(cat.descripcion ?? "");
      setEditPermiteDecimales(cat.permite_decimales);
      setEditIsActive(cat.is_active);
      setError(null);
   }

   async function saveEdit(id: string) {
      if (!editNombre.trim()) return;
      setBusy(true);
      setError(null);
      try {
         const result = await UpdateMedidaCobro(id, {
            nombre: editNombre.trim(),
            descripcion: editDescripcion.trim(),
            permite_decimales: editPermiteDecimales,
            is_active: editIsActive,
         });
         if (result instanceof Error) throw result;
         setEditId(null);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al actualizar medida de cobro");
      } finally {
         setBusy(false);
      }
   }

   async function confirmDelete() {
      if (!deleteTarget) return;
      setBusy(true);
      setError(null);
      try {
         const result = await DeleteMedidaCobro(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al eliminar medida de cobro");
      } finally {
         setBusy(false);
      }
   }

   const affectedCount = deleteTarget ? countCategoriasEqupos(deleteTarget.id) : 0;

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent
            className="sm:max-w-xl"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
         >
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <Tag className="size-5 text-brand-blue" />
                  Gestionar medidas de cobro
               </DialogTitle>
               <DialogDescription>
                  Define cómo se cobra el uso de los equipos.
               </DialogDescription>
            </DialogHeader>

            {/* Formulario de nueva medida de cobro */}
            <form onSubmit={handleCreate} className="flex flex-col gap-2">
               <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                     <Label className="text-xs">Se cobra en *</Label>
                     <Input
                        value={newNombre}
                        onChange={(e) => setNewNombre(e.target.value)}
                        placeholder="ej. M2"
                        disabled={busy}
                     />
                  </div>
                  <div className="flex flex-col gap-1">
                     <Label className="text-xs">Pequeña descripcion</Label>
                     <Input
                        value={newDescripcion}
                        onChange={(e) => setNewDescripcion(e.target.value)}
                        placeholder="ej. Metros cuadrados"
                        disabled={busy}
                     />
                  </div>
               </div>
               <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                     <Label className="text-xs">¿Permite Decimales?</Label>
                     <select
                        value={newPermiteDecimales ? "true" : "false"}
                        onChange={(e) => setNewPermiteDecimales(e.target.value === "true")}
                        className="h-8 rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={busy}
                     >
                        <option value="false">No</option>
                        <option value="true">Sí</option>
                     </select>
                  </div>

               </div>
               <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                     <Label className="text-xs">¿Estara activo?</Label>
                     <select
                        value={newIsActive ? "true" : "false"}
                        onChange={(e) => setNewIsActive(e.target.value === "true")}
                        className="h-8 rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={busy}
                     >
                        <option value="false">No</option>
                        <option value="true">Sí</option>
                     </select>
                  </div>
                  <Button
                     type="submit"
                     disabled={busy || !newNombre.trim()}
                     className="shrink-0"
                  >
                     <Plus className="size-4 mr-1" />
                     Agregar
                  </Button>
               </div>
            </form>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Lista */}
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
               {MedidaCobros.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                     Aún no hay medidas de cobro.
                  </div>
               ) : (
                  MedidaCobros.map((med) => {
                     const used = countCategoriasEqupos(med.id);
                     const isEditing = editId === med.id;
                     return (
                        <div key={med.id} className="px-3 py-2">
                           {isEditing ? (
                              <div className="flex flex-col gap-2">
                                 <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <Input
                                       value={editNombre}
                                       onChange={(e) => setEditNombre(e.target.value)}
                                       className="h-8"
                                       placeholder="Nombre"
                                       autoFocus
                                       disabled={busy}
                                    />
                                    <Input
                                       value={editDescripcion}
                                       onChange={(e) => setEditDescripcion(e.target.value)}
                                       className="h-8"
                                       placeholder="Descripción"
                                       disabled={busy}
                                    />
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground">¿Permite decimales?</Label>
                                    <select
                                       value={editPermiteDecimales ? "true" : "false"}
                                       onChange={(e) => setEditPermiteDecimales(e.target.value === "true")}
                                       className="h-8 rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                       disabled={busy}
                                    >
                                       <option value="false">No permite decimales</option>
                                       <option value="true">Permite decimales</option>
                                    </select>

                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground">¿Está activo?</Label>
                                    <select
                                       value={editIsActive ? "true" : "false"}
                                       onChange={(e) => setEditIsActive(e.target.value === "true")}
                                       className="h-8 rounded-md border border-border bg-input px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                       <option value="true">Activo</option>
                                       <option value="false">Inactivo</option>
                                    </select>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                       {used} {used === 1 ? "categoría" : "categorías"}
                                    </span>
                                    <button
                                       type="button"
                                       onClick={() => saveEdit(med.id)}
                                       disabled={busy}
                                       className="rounded-md p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                                       title="Guardar"
                                    >
                                       <Check className="size-4" />
                                    </button>
                                    <button
                                       type="button"
                                       onClick={() => setEditId(null)}
                                       disabled={busy}
                                       className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                                       title="Cancelar"
                                    >
                                       <X className="size-4" />
                                    </button>
                                 </div>
                              </div>
                           ) : (
                              <div className="flex items-center gap-2">
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{med.nombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                       Descripción: <span className="font-medium text-brand-blue dark:text-blue-400">{med.descripcion}</span>
                                    </p>
                                 </div>
                                 <span className="text-xs text-muted-foreground shrink-0">
                                    {used} {used === 1 ? "categoría" : "categorías"}
                                 </span>
                                 <button
                                    type="button"
                                    onClick={() => startEdit(med)}
                                    className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10"
                                    title="Editar"
                                 >
                                    <Pencil className="size-4" />
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setDeleteTarget(med)}
                                    className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10"
                                    title="Eliminar"
                                 >
                                    <Trash2 className="size-4" />
                                 </button>
                              </div>
                           )}
                        </div>
                     );
                  })
               )}
            </div>
         </DialogContent>

         {/* Confirmación de eliminación */}
         <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-brand-red">
                     <AlertTriangle className="size-5" />
                     Eliminar categoría
                  </DialogTitle>
                  <DialogDescription asChild>
                     <div className="space-y-3 pt-1">
                        <p>
                           Vas a eliminar la unidad de cobro <strong>{deleteTarget?.nombre}</strong>.
                        </p>
                        {affectedCount > 0 ? (
                           <div className="rounded-lg border border-brand-red/40 bg-brand-red/10 p-3 text-sm text-brand-red">
                              <strong>No se puede eliminar</strong> porque tiene{" "}
                              <strong>{affectedCount} {affectedCount === 1 ? "categoria" : "categorias"}</strong>{" "}
                              asociados. Reasigna o elimina esos equipos primero.
                           </div>
                        ) : (
                           <p className="text-sm text-muted-foreground">
                              No hay categorias asociadas. Esta acción no se puede deshacer.
                           </p>
                        )}
                     </div>
                  </DialogDescription>
               </DialogHeader>
               <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
                     Cancelar
                  </Button>
                  <Button
                     type="button"
                     variant="destructive"
                     onClick={confirmDelete}
                     disabled={busy || affectedCount > 0}
                  >
                     {busy ? "Eliminando…" : "Eliminar categoría"}
                  </Button>
               </div>
            </DialogContent>
         </Dialog>
      </Dialog>
   );
}
