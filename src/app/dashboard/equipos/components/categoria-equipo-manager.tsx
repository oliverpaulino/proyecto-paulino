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

interface CategoriaEquipoManagerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function CategoriaEquipoManager({ open, onOpenChange }: CategoriaEquipoManagerProps) {
   const { CategoriaEquipos, GetCategoriaEquipos, CreateCategoriaEquipo, UpdateCategoriaEquipo, DeleteCategoriaEquipo } =
      useCategoriaEquipoStore();
   const { Equipos, GetEquipos } = useEquipoStore();

   const [newNombre, setNewNombre] = useState("");
   const [newCobraEn, setNewCobraEn] = useState("");
   const [newCobraMinimo, setNewCobraMinimo] = useState("");
   const [newPrecioUnitario, setNewPrecioUnitario] = useState("");
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const [editId, setEditId] = useState<string | null>(null);
   const [editNombre, setEditNombre] = useState("");
   const [editCobraEn, setEditCobraEn] = useState("");
   const [editCobraMinimo, setEditCobraMinimo] = useState("");
   const [editPrecioUnitario, setEditPrecioUnitario] = useState("");

   const [deleteTarget, setDeleteTarget] = useState<CategoriaEquipo | null>(null);

   useEffect(() => {
      if (open) {
         GetCategoriaEquipos();
         GetEquipos();
      }
   }, [open, GetCategoriaEquipos, GetEquipos]);

   function countEquipos(categoriaId: string): number {
      return Equipos.filter((e) => e.categoria_id === categoriaId).length;
   }

   async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      if (!newNombre.trim() || !newCobraEn.trim()) return;
      setBusy(true);
      setError(null);
      try {
         const result = await CreateCategoriaEquipo({
            nombre: newNombre.trim(),
            cobra_en: newCobraEn.trim(),
            cobra_minimo: newCobraMinimo ? Number(newCobraMinimo) : null,
            precio_unitario: newPrecioUnitario ? Number(newPrecioUnitario) : null,
         });
         if (result instanceof Error) throw result;
         setNewNombre("");
         setNewCobraEn("");
         setNewCobraMinimo("");
         setNewPrecioUnitario("");
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al crear categoría");
      } finally {
         setBusy(false);
      }
   }

   function startEdit(cat: CategoriaEquipo) {
      setEditId(cat.id);
      setEditNombre(cat.nombre);
      setEditCobraEn(cat.cobra_en);
      setEditCobraMinimo(cat.cobra_minimo != null ? String(cat.cobra_minimo) : "");
      setEditPrecioUnitario(cat.precio_unitario != null ? String(cat.precio_unitario) : "");
      setError(null);
   }

   async function saveEdit(id: string) {
      if (!editNombre.trim() || !editCobraEn.trim()) return;
      setBusy(true);
      setError(null);
      try {
         const result = await UpdateCategoriaEquipo(id, {
            nombre: editNombre.trim(),
            cobra_en: editCobraEn.trim(),
            cobra_minimo: editCobraMinimo ? Number(editCobraMinimo) : null,
            precio_unitario: editPrecioUnitario ? Number(editPrecioUnitario) : null,
         });
         if (result instanceof Error) throw result;
         setEditId(null);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al actualizar categoría");
      } finally {
         setBusy(false);
      }
   }

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
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-xl">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <Tag className="size-5 text-brand-blue" />
                  Gestionar categorías de equipos
               </DialogTitle>
               <DialogDescription>
                  Define los tipos de equipo y cómo se cobra su uso.
               </DialogDescription>
            </DialogHeader>

            {/* Formulario de nueva categoría */}
            <form onSubmit={handleCreate} className="flex flex-col gap-2">
               <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                     <Label className="text-xs">Nombre de la categoría *</Label>
                     <Input
                        value={newNombre}
                        onChange={(e) => setNewNombre(e.target.value)}
                        placeholder="ej. Camión de agua"
                        disabled={busy}
                     />
                  </div>
                  <div className="flex flex-col gap-1">
                     <Label className="text-xs">Se cobra en *</Label>
                     <Input
                        value={newCobraEn}
                        onChange={(e) => setNewCobraEn(e.target.value)}
                        placeholder="ej. galones de agua"
                        disabled={busy}
                     />
                  </div>
               </div>
               <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                     <Label className="text-xs">Precio unitario (opcional)</Label>
                     <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newPrecioUnitario}
                        onChange={(e) => setNewPrecioUnitario(e.target.value)}
                        placeholder="ej. 2"
                        disabled={busy}
                     />
                  </div>

               </div>
               <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                     <Label className="text-xs">Mínimo cobrable (opcional)</Label>
                     <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newCobraMinimo}
                        onChange={(e) => setNewCobraMinimo(e.target.value)}
                        placeholder="ej. 2"
                        disabled={busy}
                     />
                  </div>
                  <Button
                     type="submit"
                     disabled={busy || !newNombre.trim() || !newCobraEn.trim()}
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
               {CategoriaEquipos.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                     Aún no hay categorías.
                  </div>
               ) : (
                  CategoriaEquipos.map((cat) => {
                     const used = countEquipos(cat.id);
                     const isEditing = editId === cat.id;
                     return (
                        <div key={cat.id} className="px-3 py-2">
                           {isEditing ? (
                              <div className="flex flex-col gap-2">
                                 <div className="grid grid-cols-2 gap-2">
                                    <Input
                                       value={editNombre}
                                       onChange={(e) => setEditNombre(e.target.value)}
                                       className="h-8"
                                       placeholder="Nombre"
                                       autoFocus
                                       disabled={busy}
                                    />
                                    <Input
                                       value={editCobraEn}
                                       onChange={(e) => setEditCobraEn(e.target.value)}
                                       className="h-8"
                                       placeholder="Se cobra en"
                                       disabled={busy}
                                    />
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Input
                                       type="number"
                                       min="0"
                                       step="0.01"
                                       value={editCobraMinimo}
                                       onChange={(e) => setEditCobraMinimo(e.target.value)}
                                       className="h-8 flex-1"
                                       placeholder="Mínimo (opcional)"
                                       disabled={busy}
                                    />

                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Input
                                       type="number"
                                       min="0"
                                       step="0.01"
                                       value={editPrecioUnitario}
                                       onChange={(e) => setEditPrecioUnitario(e.target.value)}
                                       className="h-8 flex-1"
                                       placeholder="Precio unitario (opcional)"
                                       disabled={busy}
                                    />
                                    <button
                                       onClick={() => saveEdit(cat.id)}
                                       disabled={busy}
                                       className="rounded-md p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                                       title="Guardar"
                                    >
                                       <Check className="size-4" />
                                    </button>
                                    <button
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
                                    <p className="text-sm font-medium truncate">{cat.nombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                       Se cobra en: <span className="font-medium text-brand-blue dark:text-blue-400">{cat.cobra_en}</span> a <span className="font-medium text-green-500 dark:text-green-400">{cat.precio_unitario?.toFixed(2)}</span>
                                       {cat.cobra_minimo != null && (
                                          <span className="ml-2 text-muted-foreground">
                                             (mín. {cat.cobra_minimo})
                                          </span>
                                       )}
                                    </p>
                                 </div>
                                 <span className="text-xs text-muted-foreground shrink-0">
                                    {used} {used === 1 ? "equipo" : "equipos"}
                                 </span>
                                 <button
                                    onClick={() => startEdit(cat)}
                                    className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10"
                                    title="Editar"
                                 >
                                    <Pencil className="size-4" />
                                 </button>
                                 <button
                                    onClick={() => setDeleteTarget(cat)}
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
                           Vas a eliminar la categoría <strong>{deleteTarget?.nombre}</strong>.
                        </p>
                        {affectedCount > 0 ? (
                           <div className="rounded-lg border border-brand-red/40 bg-brand-red/10 p-3 text-sm text-brand-red">
                              <strong>No se puede eliminar</strong> porque tiene{" "}
                              <strong>{affectedCount} {affectedCount === 1 ? "equipo" : "equipos"}</strong>{" "}
                              asociados. Reasigna o elimina esos equipos primero.
                           </div>
                        ) : (
                           <p className="text-sm text-muted-foreground">
                              No hay equipos asociados. Esta acción no se puede deshacer.
                           </p>
                        )}
                     </div>
                  </DialogDescription>
               </DialogHeader>
               <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
                     Cancelar
                  </Button>
                  <Button
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
