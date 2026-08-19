"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plus } from "lucide-react";
import { AppointmentsGeneralView } from "./components/appointment-general-view";
import { AppointmentsKanbanView } from "./components/appointments-kanban-view";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAppointmentStore } from "@/stores/useAppointmentStore";
import { type CreateAppointmentForm } from "@/dtos/appointment.dto";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppointmentForm } from "./components/appointment-form";
import { AppointmentFilters } from "./components/appointment-filters";
import { PermissionGuard } from "@/components/permission-guard";

export default function CitasPageWrapper() {

   useEffect(() => {
      document.title = "Citas"
   }, [])


   const [formLoading, setFormLoading] = useState(false);
   const [createOpen, setCreateOpen] = useState(false);
   const [activeTab, setActiveTab] = useState("lista");

   const { CreateAppointment } = useAppointmentStore();

   async function handleCreate(data: CreateAppointmentForm) {
      setFormLoading(true);
      try {
         const result = await CreateAppointment(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <div className="flex flex-col flex-1 min-w-0 p-4 md:p-6 gap-6">
         <div className="shrink-0">
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Calendar className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">Citas</h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">Administra y organiza el flujo de citas de tus clientes</p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 w-full min-w-0 overflow-hidden space-y-4">

            <TabsList className="flex justify-start gap-1 bg-transparent p-0 w-full shrink-0">
               <TabsTrigger value="lista" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Vista de Lista
               </TabsTrigger>
               <TabsTrigger value="kanban" className="flex-none rounded-full border border-border bg-background px-4 data-[state=active]:border-brand-blue data-[state=active]:bg-brand-blue data-[state=active]:text-white">
                  Vista de Tablero
               </TabsTrigger>
            </TabsList>

            <PermissionGuard resource="appointment" action="create">
               <Button
                  variant="outline"
                  className="w-full font-semibold border-2 border-border text-foreground hover:bg-foreground hover:text-background transition-colors"
                  onClick={() => setCreateOpen(true)}
               >
                  <Plus className="size-4 mr-2" /> Agendar Cita
               </Button>
            </PermissionGuard>

            <AppointmentFilters viewLimit={activeTab === "lista" ? 20 : 100} />

            <TabsContent value="lista" className="flex-1 w-full min-w-0 m-0 focus-visible:ring-0 custom-scrollbar">
               <AppointmentsGeneralView />
            </TabsContent>

            <TabsContent value="kanban" className="flex-1 w-full min-w-0 m-0 focus-visible:ring-0 custom-scrollbar">
               <AppointmentsKanbanView />
            </TabsContent>
         </Tabs>

         <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-lg">
               <DialogHeader>
                  <DialogTitle>Agendar Cita</DialogTitle>
               </DialogHeader>
               <AppointmentForm
                  onSubmit={handleCreate}
                  onCancel={() => setCreateOpen(false)}
                  loading={formLoading}
               />
            </DialogContent>
         </Dialog>
      </div>
   );
}
