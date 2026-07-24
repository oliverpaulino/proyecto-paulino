"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, CheckSquare } from "lucide-react";
import { useTareaStore } from "@/stores/useTareaStore";
import { SIN_PROYECTO } from "@/dtos/tarea.dto";
import { TareaKanban } from "./components/tarea-kanban";
import { TareaTable } from "./components/tarea-table";
import { TareaForm } from "./components/tarea-form";
import { PermissionGuard } from "@/components/permission-guard";

type Vista = "kanban" | "lista";
const TODOS = "__all__";

export default function TareasPage() {
   const { tareas, proyectos, loading, GetTareas, GetProyectos } = useTareaStore();
   const [vista, setVista] = useState<Vista>("kanban");
   const [proyectoFiltro, setProyectoFiltro] = useState<string>(TODOS);
   const [createOpen, setCreateOpen] = useState(false);

   useEffect(() => {
      document.title = "Tareas";
      GetProyectos();
   }, [GetProyectos]);

   useEffect(() => {
      GetTareas(proyectoFiltro === TODOS ? undefined : proyectoFiltro);
   }, [proyectoFiltro, GetTareas]);

   const proyectoIdActivo =
      proyectoFiltro === TODOS || proyectoFiltro === SIN_PROYECTO ? undefined : proyectoFiltro;

   return (
      <PermissionGuard resource="task" action="read" mode="page">
      <div className="flex flex-col flex-1 min-w-0 h-[calc(100dvh-3rem)] overflow-hidden p-4 md:p-6 gap-6">
         <div className="shrink-0">
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <CheckSquare className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Tareas
               </h1>
               <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-muted-foreground">
                  {tareas.length}
               </span>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Organiza las tareas de tus proyectos
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         <Tabs value={vista} onValueChange={(v) => setVista(v as Vista)} className="flex flex-col flex-1 w-full max-w-full min-w-0 overflow-x-hidden space-y-4">            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 shrink-0">
               
               {/* View toggle (Estilo Citas) */}
               <TabsList className="flex-wrap justify-start gap-1 bg-transparent p-0">
                  <TabsTrigger value="lista" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                     Vista de Lista
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                     Vista de Tablero
                  </TabsTrigger>
               </TabsList>

               {/* Toolbar (Filtro y Botón de crear) */}
               <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
                     <SelectTrigger className="w-full sm:w-[220px]">
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

                  <PermissionGuard resource="task" action="create">
                     <Button className="w-full sm:w-auto shrink-0" onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-1 size-4" />
                        Nueva tarea
                     </Button>
                  </PermissionGuard>
               </div>
            </div>

            {/* Content */}
            {loading && tareas.length === 0 ? (
               <div className="flex flex-1 w-full items-center justify-center py-20 text-sm text-muted-foreground">
                  Cargando tareas...
               </div>
            ) : (
               <>
                  <TabsContent 
                     value="lista" 
                     className="m-0 flex-1 w-full min-w-0 data-[state=active]:flex flex-col overflow-x-auto focus-visible:ring-0 custom-scrollbar"
                  >
                     <TareaTable tareas={tareas} />
                  </TabsContent>
                  
                  <TabsContent 
                     value="kanban" 
                     className="m-0 flex-1 w-full min-w-0 data-[state=active]:flex flex-col focus-visible:ring-0"
                  >
                     <TareaKanban proyectoId={proyectoIdActivo} />
                  </TabsContent>
               </>
            )}
         </Tabs>

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
      </PermissionGuard>
   );
}