"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";
import { AppointmentsGeneralView } from "./components/appointment-general-view";
import { AppointmentsKanbanView } from "./components/appointments-kanban-view";

export default function CitasPageWrapper() {
   return (
      <div className="flex flex-col gap-6 p-6">
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Calendar className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">Citas</h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">Administra y organiza el flujo de citas de tus clientes</p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         <Tabs defaultValue="lista" className="space-y-4">
            <TabsList className="w-full flex-wrap justify-start gap-1 bg-transparent p-0">
               <TabsTrigger value="lista" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Vista de Tabla
               </TabsTrigger>
               <TabsTrigger value="kanban" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Tablero Kanban
               </TabsTrigger>
            </TabsList>

            <TabsContent value="lista" className="m-0 focus-visible:ring-0"><AppointmentsGeneralView /></TabsContent>
            <TabsContent value="kanban" className="m-0 focus-visible:ring-0"><AppointmentsKanbanView /></TabsContent>
         </Tabs>
      </div>
   );
}