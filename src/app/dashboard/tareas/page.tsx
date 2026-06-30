"use client";

import { useEffect, useState } from "react";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTareaStore } from "@/stores/useTareaStore";
import { SIN_PROYECTO } from "@/dtos/tarea.dto";
import { TareaKanban } from "./components/tarea-kanban";
import { TareaTable } from "./components/tarea-table";
import { TareaForm } from "./components/tarea-form";

type Vista = "kanban" | "lista";
const TODOS = "__all__";

export default function TareasPage() {
   const { tareas, proyectos, loading, GetTareas, GetProyectos } = useTareaStore();
   const [vista, setVista] = useState<Vista>("kanban");
   const [proyectoFiltro, setProyectoFiltro] = useState<string>(TODOS);
   const [createOpen, setCreateOpen] = useState(false);

   useEffect(() => {
      GetProyectos();
   }, [GetProyectos]);

   useEffect(() => {
      // El filtro pasa tal cual: TODOS → sin filtro; SIN_PROYECTO → solo tareas sueltas;
      // un id → ese proyecto.
      GetTareas(proyectoFiltro === TODOS ? undefined : proyectoFiltro);
   }, [proyectoFiltro, GetTareas]);

   // Id de proyecto real para preseleccionar en el formulario de creación.
   // "Todos" y "Sin proyecto" no preseleccionan ningún proyecto.
   const proyectoIdActivo =
      proyectoFiltro === TODOS || proyectoFiltro === SIN_PROYECTO ? undefined : proyectoFiltro;

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <CheckSquare className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold tracking-tight text-brand-blue dark:text-white">
                  Tareas
               </h1>
               <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-muted-foreground">
                  {tareas.length}
               </span>
            </div>
            <p className="ml-11 mt-1.5 text-sm text-muted-foreground">
               Organiza las tareas de tus proyectos en un tablero Kanban o una lista
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Toolbar */}
         <div className="flex flex-wrap items-center gap-2">
            {/* Project filter */}
            <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
               <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filtrar por proyecto" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value={TODOS}>Todos los proyectos</SelectItem>
                  <SelectItem value={SIN_PROYECTO}>Sin proyecto</SelectItem>
                  {proyectos.map((p) => (
                     <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex items-center rounded-md border border-border p-0.5">
               <button
                  onClick={() => setVista("kanban")}
                  className={cn(
                     "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
                     vista === "kanban"
                        ? "bg-brand-blue text-white"
                        : "text-muted-foreground hover:bg-muted",
                  )}
               >
                  <LayoutGrid className="size-4" />
                  Kanban
               </button>
               <button
                  onClick={() => setVista("lista")}
                  className={cn(
                     "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
                     vista === "lista"
                        ? "bg-brand-blue text-white"
                        : "text-muted-foreground hover:bg-muted",
                  )}
               >
                  <List className="size-4" />
                  Lista
               </button>
            </div>

            <div className="ml-auto">
               <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1 size-4" />
                  Nueva tarea
               </Button>
            </div>
         </div>

         {/* Content */}
         {loading && tareas.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-20 text-sm text-muted-foreground">
               Cargando tareas...
            </div>
         ) : vista === "kanban" ? (
            <TareaKanban proyectoId={proyectoIdActivo} />
         ) : (
            <TareaTable tareas={tareas} />
         )}

         {/* Top-level create dialog */}
         <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
               <DialogHeader className="px-6 pt-6">
                  <DialogTitle>Nueva tarea</DialogTitle>
                  <DialogDescription>
                     Completa los detalles de la nueva tarea
                  </DialogDescription>
               </DialogHeader>
               <TareaForm proyectoId={proyectoIdActivo} onClose={() => setCreateOpen(false)} />
            </DialogContent>
         </Dialog>
      </div>
   );
}
