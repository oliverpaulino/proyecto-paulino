"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import type { Employee } from "@/dtos/employee.dto";
import { TableSearch } from "@/components/table-search";
import { EmployeeForm, OperadorFormData } from "./employee-form";
import { EmployeeTable } from "./employee-table";
import { DeleteEmployeeDialog } from "./delete-employee-dialog";

const STAT_STYLES = {
   blue: {
      card: "bg-brand-blue shadow-lg shadow-brand-blue/20",
      label: "text-blue-200",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
   yellow: {
      card: "bg-brand-yellow shadow-lg shadow-brand-yellow/30",
      label: "text-yellow-700",
      value: "text-brand-black",
      bar: "bg-brand-blue",
   },
   red: {
      card: "bg-brand-red shadow-lg shadow-brand-red/20",
      label: "text-red-200",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
   dark: {
      card: "bg-brand-black shadow-lg shadow-black/30",
      label: "text-gray-400",
      value: "text-white",
      bar: "bg-brand-yellow",
   },
} as const;



export default function EmpleadosView() {
   const { Employees, loading, pagination, stats, GetEmployees, GetEmployeeStats, SearchEmployees, NextPage, PrevPage, CreateEmployee, UpdateEmployee, DeleteEmployee } =
      useEmployeeStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Employee | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

   useEffect(() => {
      GetEmployees({ page: 1, limit: 10, force: true });
      GetEmployeeStats();
   }, [GetEmployees, GetEmployeeStats]);

   const total = stats.total;
   const activos = stats.activos;
   const inactivos = stats.inactivos;

   async function handleCreate(data: Parameters<typeof CreateEmployee>[0], operadorData?: OperadorFormData) {
      setFormLoading(true);
      try {
         const payload = { ...data, operador: operadorData };

         const result = await CreateEmployee(payload as any);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: Parameters<typeof CreateEmployee>[0], operadorData?: OperadorFormData) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const payload = { ...data, operador: operadorData };

         const result = await UpdateEmployee(editTarget.id, payload as any);
         if (result instanceof Error) throw result;
         setEditTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleDelete() {
      if (!deleteTarget) return;
      setFormLoading(true);
      try {
         const result = await DeleteEmployee(deleteTarget.id);
         if (result instanceof Error) throw result;
         setDeleteTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <Users className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Empleados
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona el personal de tu empresa
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total Empleados" value={total} accent="blue" />
            <StatCard label="Activos" value={activos} accent="yellow" />
            <StatCard label="Inactivos" value={inactivos} accent="red" />
         </div>

         {/* Search + New */}
         <div className="flex flex-wrap items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={SearchEmployees}
               placeholder="Buscar empleados..."
               debounceDelay={350}
               className="w-full max-w-sm"
            />
            <div className="ml-auto">
               <Button
                  className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0"
                  onClick={() => setCreateOpen(true)}
               >
                  <Plus className="size-4 mr-2" />
                  Nuevo Empleado
               </Button>
            </div>
         </div>

         {/* Table */}
         {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando empleados…
            </div>
         ) : (
            <div className="flex flex-col gap-4">
               <EmployeeTable
                  employees={Employees}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
               />

               {/* Paginación */}
               <div className="flex flex-col gap-3 items-center justify-between border-t border-border pt-4 sm:flex-row">
                  <span className="text-sm text-muted-foreground">
                     Total: <strong>{pagination.total}</strong> empleados
                  </span>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" onClick={PrevPage} disabled={!pagination.hasPrev || loading}>
                        <ChevronLeft className="size-4 mr-1" /> Anterior
                     </Button>
                     <span className="text-xs font-medium px-2 text-foreground">
                        Pág. {pagination.page} / {pagination.totalPages || 1}
                     </span>
                     <Button variant="outline" size="sm" onClick={NextPage} disabled={!pagination.hasNext || loading}>
                        Siguiente <ChevronRight className="size-4 ml-1" />
                     </Button>
                  </div>
               </div>
            </div>
         )}

         {/* Create Dialog */}
         <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Nuevo Empleado</DialogTitle>
                  <DialogDescription>
                     Registra un nuevo empleado completando el formulario.
                  </DialogDescription>
               </DialogHeader>
               <EmployeeForm
                  onSubmit={handleCreate}
                  onCancel={() => setCreateOpen(false)}
                  loading={formLoading}
               />
            </DialogContent>
         </Dialog>

         {/* Edit Dialog */}
         <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar Empleado</DialogTitle>
                  <DialogDescription>
                     Modifica los datos del empleado.
                  </DialogDescription>
               </DialogHeader>
               {editTarget && (
                  <EmployeeForm
                     initialData={editTarget}
                     onSubmit={handleEdit}
                     onCancel={() => setEditTarget(null)}
                     loading={formLoading}
                     submitLabel="Guardar cambios"
                  />
               )}
            </DialogContent>
         </Dialog>

         <DeleteEmployeeDialog
            employee={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={formLoading}
         />
      </div>
   );
}

function StatCard({
   label,
   value,
   accent,
   isText = false,
}: {
   label: string;
   value: number | string;
   accent: keyof typeof STAT_STYLES;
   isText?: boolean;
}) {
   const s = STAT_STYLES[accent];
   return (
      <div className={`rounded-xl ${s.card} p-5`}>
         <p className={`text-sm font-medium ${s.label}`}>{label}</p>
         <p className={`mt-1 ${isText ? "text-2xl" : "text-4xl"} font-bold ${s.value}`}>{value}</p>
         <div className={`mt-3 h-1 w-10 rounded-full ${s.bar}`} />
      </div>
   );
}
