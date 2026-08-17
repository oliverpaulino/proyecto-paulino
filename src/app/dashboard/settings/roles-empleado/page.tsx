"use client";

import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
   Breadcrumb,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbList,
   BreadcrumbPage,
   BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { PermissionGuard } from "@/components/permission-guard";
import {
   useRolEmpleadoStore,
   type RolEmpleado,
} from "@/stores/useRolEmpleadoStore";

const BADGE_COLORS: Record<string, string> = {
   "#3b82f6": "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
   "#a855f7": "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
   "#f97316": "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
   "#22c55e": "bg-green-100 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
   "#eab308": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
};

const COLOR_OPTIONS = [
   { value: "#3b82f6", label: "Azul" },
   { value: "#a855f7", label: "Morado" },
   { value: "#f97316", label: "Naranja" },
   { value: "#22c55e", label: "Verde" },
   { value: "#eab308", label: "Amarillo" },
   { value: "#ef4444", label: "Rojo" },
   { value: "#6b7280", label: "Gris" },
   { value: "#ec4899", label: "Rosa" },
];

function getBadgeClass(color: string | null): string {
   if (!color) return "bg-gray-100 text-gray-800 border-gray-200";
   return BADGE_COLORS[color] ?? "bg-gray-100 text-gray-800 border-gray-200";
}

export default function RolesEmpleadoPage() {
   const { roles, loading, error, GetRoles, CreateRole, UpdateRole, DeleteRole } =
      useRolEmpleadoStore();

   const [dialogOpen, setDialogOpen] = useState(false);
   const [editing, setEditing] = useState<RolEmpleado | null>(null);
   const [deleting, setDeleting] = useState<RolEmpleado | null>(null);

   // Form state
   const [formNombre, setFormNombre] = useState("");
   const [formLabel, setFormLabel] = useState("");
   const [formEsOperador, setFormEsOperador] = useState(false);
   const [formColor, setFormColor] = useState<string>("#3b82f6");
   const [formError, setFormError] = useState<string | null>(null);
   const [formLoading, setFormLoading] = useState(false);

   useEffect(() => {
      void GetRoles();
   }, [GetRoles]);

   function openCreate() {
      setEditing(null);
      setFormNombre("");
      setFormLabel("");
      setFormEsOperador(false);
      setFormColor("#3b82f6");
      setFormError(null);
      setDialogOpen(true);
   }

   function openEdit(rol: RolEmpleado) {
      setEditing(rol);
      setFormNombre(rol.nombre);
      setFormLabel(rol.label);
      setFormEsOperador(rol.es_operador);
      setFormColor(rol.color ?? "#3b82f6");
      setFormError(null);
      setDialogOpen(true);
   }

   async function handleSave() {
      setFormError(null);
      setFormLoading(true);
      try {
         if (editing) {
            const result = await UpdateRole(editing.id, {
               label: formLabel,
               es_operador: formEsOperador,
               color: formColor,
            });
            if (result instanceof Error) {
               setFormError(result.message);
               return;
            }
         } else {
            const result = await CreateRole({
               nombre: formNombre,
               label: formLabel,
               es_operador: formEsOperador,
               color: formColor,
            });
            if (result instanceof Error) {
               setFormError(result.message);
               return;
            }
         }
         setDialogOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function confirmDelete() {
      if (!deleting) return;
      try {
         await DeleteRole(deleting.id);
      } finally {
         setDeleting(null);
      }
   }

   return (
      <PermissionGuard resource="users" action="read" mode="page">
         <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
               <SidebarTrigger className="-ml-1" />
               <Separator orientation="vertical" className="mr-2 h-4" />
               <Breadcrumb>
                  <BreadcrumbList>
                     <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                     </BreadcrumbItem>
                     <BreadcrumbSeparator className="hidden md:block" />
                     <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/dashboard/settings">
                           Configuración
                        </BreadcrumbLink>
                     </BreadcrumbItem>
                     <BreadcrumbSeparator className="hidden md:block" />
                     <BreadcrumbItem>
                        <BreadcrumbPage>Roles de Empleado</BreadcrumbPage>
                     </BreadcrumbItem>
                  </BreadcrumbList>
               </Breadcrumb>
            </div>
         </header>

         <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                     Roles de Empleado
                  </h1>
                  <p className="text-sm text-muted-foreground">
                     Gestiona los roles que se asignan a los empleados. El rol
                     &quot;Operador&quot; define quién cobra por producción en la nómina.
                  </p>
               </div>
               <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo rol
               </Button>
            </div>

            {error && (
               <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
               </div>
            )}

            {loading ? (
               <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                     <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
               </div>
            ) : roles.length === 0 ? (
               <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-sm text-muted-foreground gap-2">
                  <Truck className="size-8 opacity-30" />
                  <span>No hay roles de empleado configurados.</span>
               </div>
            ) : (
               <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {roles.map((rol) => (
                     <div
                        key={rol.id}
                        className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
                     >
                        <div>
                           <div className="flex items-center gap-2 mb-2">
                              <Badge
                                 variant="outline"
                                 className={`${getBadgeClass(rol.color)} font-semibold`}
                              >
                                 {rol.label}
                              </Badge>
                              {rol.es_operador && (
                                 <Badge variant="secondary" className="gap-1 text-xs">
                                    <Truck className="h-3 w-3" />
                                    Operador
                                 </Badge>
                              )}
                           </div>
                           <p className="text-xs text-muted-foreground font-mono">
                              {rol.nombre}
                           </p>
                        </div>
                        <div className="flex items-center gap-2 pt-3 mt-2 border-t">
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(rol)}
                           >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Editar
                           </Button>
                           <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleting(rol)}
                           >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Eliminar
                           </Button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         {/* ── Dialog Crear / Editar ── */}
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>
                     {editing ? "Editar Rol" : "Nuevo Rol de Empleado"}
                  </DialogTitle>
                  <DialogDescription>
                     {editing
                        ? "Modifica las propiedades del rol."
                        : "Define un nuevo rol para asignar a los empleados."}
                  </DialogDescription>
               </DialogHeader>

               <div className="flex flex-col gap-4 py-2">
                  {!editing && (
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="rol-nombre">
                           Nombre (clave interna) *
                        </Label>
                        <Input
                           id="rol-nombre"
                           value={formNombre}
                           onChange={(e) =>
                              setFormNombre(
                                 e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")
                              )
                           }
                           placeholder="Ej: SUPERVISOR"
                           disabled={formLoading}
                           maxLength={32}
                        />
                        <p className="text-xs text-muted-foreground">
                           Uppercase, sin espacios. Se usa internamente.
                        </p>
                     </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="rol-label">Etiqueta visible *</Label>
                     <Input
                        id="rol-label"
                        value={formLabel}
                        onChange={(e) => setFormLabel(e.target.value)}
                        placeholder="Ej: Supervisor"
                        disabled={formLoading}
                     />
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <Label>Color del badge</Label>
                     <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map((c) => (
                           <button
                              key={c.value}
                              type="button"
                              className={`size-8 rounded-full border-2 transition-all ${
                                 formColor === c.value
                                    ? "border-foreground scale-110"
                                    : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: c.value }}
                              onClick={() => setFormColor(c.value)}
                              title={c.label}
                              disabled={formLoading}
                           />
                        ))}
                     </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                     <input
                        type="checkbox"
                        checked={formEsOperador}
                        onChange={(e) => setFormEsOperador(e.target.checked)}
                        className="rounded border-input"
                        disabled={formLoading}
                     />
                     <Truck className="size-4 text-muted-foreground" />
                     Este rol es de operador (cobra por producción en nómina)
                  </label>
               </div>

               {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
               )}

               <DialogFooter>
                  <Button
                     variant="outline"
                     onClick={() => setDialogOpen(false)}
                     disabled={formLoading}
                  >
                     Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={formLoading}>
                     {formLoading && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                     )}
                     {editing ? "Guardar cambios" : "Crear rol"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* ── AlertDialog Eliminar ── */}
         <AlertDialog
            open={deleting !== null}
            onOpenChange={(o) => !o && setDeleting(null)}
         >
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar el rol?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Se eliminará el rol &quot;{deleting?.label}&quot; ({deleting?.nombre}).
                     {deleting?.es_operador &&
                        " Este rol está marcado como operador."}{" "}
                     Esta acción no se puede deshacer.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete}>
                     Eliminar
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </PermissionGuard>
   );
}
