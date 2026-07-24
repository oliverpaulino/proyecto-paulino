"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useTipoItemStore } from "@/stores/useTipoItemStore";
import { useItemStore } from "@/stores/useItemStore";
import type { TipoItem } from "@/dtos/tipo-item.dto";
import { PermissionGuard } from "@/components/permission-guard";

interface TipoItemManagerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function TipoItemManager({ open, onOpenChange }: TipoItemManagerProps) {
   const { TipoItems, GetTipoItems, CreateTipoItem, UpdateTipoItem, DeleteTipoItem } = useTipoItemStore();
   const { Items, GetItems } = useItemStore();

   const [newNombre, setNewNombre] = useState("");
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const [editId, setEditId] = useState<string | null>(null);
   const [editNombre, setEditNombre] = useState("");

   const [deleteTarget, setDeleteTarget] = useState<TipoItem | null>(null);

   useEffect(() => {
      if (open) {
         GetTipoItems();
         GetItems();
      }
   }, [open, GetTipoItems, GetItems]);

   function countItems(tipoId: string): number {
      return Items.filter((i) => i.tipo_id === tipoId).length;
   }

   async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      if (!newNombre.trim()) return;
      setBusy(true);
      setError(null);
      try {
         const result = await CreateTipoItem({ nombre: newNombre.trim() });
         if (result instanceof Error) throw result;
         setNewNombre("");
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al crear categoría");
      } finally {
         setBusy(false);
      }
   }

   function startEdit(tipo: TipoItem) {
      setEditId(tipo.id);
      setEditNombre(tipo.nombre);
      setError(null);
   }

   async function saveEdit(id: string) {
      if (!editNombre.trim()) return;
      setBusy(true);
      setError(null);
      try {
         const result = await UpdateTipoItem(id, { nombre: editNombre.trim() });
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
         const result = await DeleteTipoItem(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
         await GetItems({ force: true });
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Error al eliminar categoría");
      } finally {
         setBusy(false);
      }
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <Tag className="size-5 text-brand-blue" />
                  Gestionar categorías
               </DialogTitle>
               <DialogDescription>
                  Crea, edita o elimina las categorías de inventario.
               </DialogDescription>
            </DialogHeader>

            {/* Add new */}
            <form onSubmit={handleCreate} className="flex gap-2">
               <Input
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Nueva categoría…"
                  disabled={busy}
               />
               <PermissionGuard resource="material_request" action="create">
               <Button type="submit" disabled={busy || !newNombre.trim()} className="shrink-0">
                  <Plus className="size-4 mr-1" />
                  Agregar
               </Button>
               </PermissionGuard>
            </form>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* List */}
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
               {TipoItems.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                     Aún no hay categorías.
                  </div>
               ) : (
                  TipoItems.map((tipo) => {
                     const used = countItems(tipo.id);
                     const isEditing = editId === tipo.id;
                     return (
                        <div key={tipo.id} className="flex items-center gap-2 px-3 py-2">
                           {isEditing ? (
                              <>
                                 <Input
                                    value={editNombre}
                                    onChange={(e) => setEditNombre(e.target.value)}
                                    className="h-8"
                                    autoFocus
                                    disabled={busy}
                                 />
                                 <button
                                    onClick={() => saveEdit(tipo.id)}
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
                              </>
                           ) : (
                              <>
                                 <span className="flex-1 text-sm font-medium">{tipo.nombre}</span>
                                 <span className="text-xs text-muted-foreground">
                                    {used} {used === 1 ? "item" : "items"}
                                 </span>
                                 <PermissionGuard resource="material_request" action="update">
                                 <button
                                    onClick={() => startEdit(tipo)}
                                    className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10"
                                    title="Editar"
                                 >
                                    <Pencil className="size-4" />
                                 </button>
                                 </PermissionGuard>
                                 <PermissionGuard resource="material_request" action="delete">
                                 <button
                                    onClick={() => setDeleteTarget(tipo)}
                                    className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10"
                                    title="Eliminar"
                                 >
                                    <Trash2 className="size-4" />
                                 </button>
                                 </PermissionGuard>
                              </>
                           )}
                        </div>
                     );
                  })
               )}
            </div>
         </DialogContent>

         {/* Simplificated Delete Dialog */}
         <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-brand-red">
                     <AlertTriangle className="size-5" />
                     Eliminar categoría
                  </DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de eliminar la categoría <strong>{deleteTarget?.nombre}</strong>? Esta acción no se puede deshacer.
                  </DialogDescription>
               </DialogHeader>
               <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
                     Cancelar
                  </Button>
                  <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
                     {busy ? "Eliminando…" : "Eliminar"}
                  </Button>
               </div>
            </DialogContent>
         </Dialog>
      </Dialog>
   );
}