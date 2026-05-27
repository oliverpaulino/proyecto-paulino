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
import { Plus, Users } from "lucide-react";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import type { Employee } from "@/dtos/employee.dto";
import { EmployeeForm } from "./components/employee-form";
import { EmployeeTable } from "./components/employee-table";
import { DeleteEmployeeDialog } from "./components/delete-employee-dialog";
import { TableSearch } from "@/components/table-search";

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

export default function EmpleadosPage() {
   const { Employees, loading, GetEmployees, CreateEmployee, UpdateEmployee, DeleteEmployee } =
      useEmployeeStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [createOpen, setCreateOpen] = useState(false);
   const [editTarget, setEditTarget] = useState<Employee | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

   useEffect(() => {
      GetEmployees();
   }, [GetEmployees]);

   const filtered = Employees.filter((e) => {
      const q = search.toLowerCase();
      return (
         e.nombre.toLowerCase().includes(q) ||
         e.identificacion.includes(q) ||
         e.rol.toLowerCase().includes(q)
      );
   });

   const total = Employees.length;
   const activos = Employees.filter((e) => e.activo).length;
   const inactivos = Employees.filter((e) => !e.activo).length;
   const totalSalarios = Employees.reduce((sum, e) => sum + e.salario, 0);

   async function handleCreate(data: Parameters<typeof CreateEmployee>[0]) {
      setFormLoading(true);
      try {
         const result = await CreateEmployee(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleEdit(data: Parameters<typeof CreateEmployee>[0]) {
      if (!editTarget) return;
      setFormLoading(true);
      try {
         const result = await UpdateEmployee(editTarget.id, data);
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
         <div className="flex items-center gap-3">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
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
            <EmployeeTable
               employees={filtered}
               onEdit={setEditTarget}
               onDelete={setDeleteTarget}
            />
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
