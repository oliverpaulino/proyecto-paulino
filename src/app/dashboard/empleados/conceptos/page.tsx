"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, BookOpen } from "lucide-react";
import { usePayrollConceptStore } from "@/stores/usePayrollConceptStore";
import type { PayrollConcept, PayrollConceptForm, ConceptCategory } from "@/dtos/payroll-concept.dto";
import { ConceptTable } from "./components/concept-table";
import { ConceptForm } from "./components/concept-form";
import { DeactivateConceptDialog } from "./components/deactivate-concept-dialog";
import { TableSearch } from "@/components/table-search";
import { PermissionGuard } from "@/components/permission-guard";

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

const CATEGORY_FILTER: { value: ConceptCategory | "all"; label: string }[] = [
   { value: "all", label: "Todos" },
   { value: "earning", label: "Ingresos" },
   { value: "deduction", label: "Deducciones" },
   { value: "benefit", label: "Beneficios" },
   { value: "adjustment", label: "Ajustes" },
];

export default function ConceptosNominaPage() {
   const { concepts, loading, getConcepts, createConcept, deactivateConcept } =
      usePayrollConceptStore();

   const [formLoading, setFormLoading] = useState(false);
   const [searchInput, setSearchInput] = useState("");
   const [search, setSearch] = useState("");
   const [categoryFilter, setCategoryFilter] = useState<ConceptCategory | "all">("all");
   const [createOpen, setCreateOpen] = useState(false);
   const [deactivateTarget, setDeactivateTarget] = useState<PayrollConcept | null>(null);

   useEffect(() => {
      getConcepts();
   }, [getConcepts]);

   const filtered = concepts.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
         c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
      return matchesSearch && matchesCategory;
   });

   const earnings = concepts.filter((c) => c.category === "earning").length;
   const deductions = concepts.filter((c) => c.category === "deduction").length;
   const benefits = concepts.filter((c) => c.category === "benefit").length;

   async function handleCreate(data: PayrollConceptForm) {
      setFormLoading(true);
      try {
         const result = await createConcept(data);
         if (result instanceof Error) throw result;
         setCreateOpen(false);
      } finally {
         setFormLoading(false);
      }
   }

   async function handleDeactivate() {
      if (!deactivateTarget) return;
      setFormLoading(true);
      try {
         const result = await deactivateConcept(deactivateTarget.id);
         if (result instanceof Error) throw result;
         setDeactivateTarget(null);
      } finally {
         setFormLoading(false);
      }
   }

   return (
      <PermissionGuard resource="users" action="read">
      <div className="flex flex-col gap-6 p-6">

         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-brand-yellow" />
               <BookOpen className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Conceptos de Nómina
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Configura los conceptos de ingresos, deducciones y beneficios que componen la nómina
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Stat cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Conceptos" value={concepts.length} accent="blue" />
            <StatCard label="Ingresos" value={earnings} accent="yellow" />
            <StatCard label="Deducciones" value={deductions} accent="red" />
            <StatCard label="Beneficios" value={benefits} accent="dark" />
         </div>

         {/* Search + Filters + New */}
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <TableSearch
               value={searchInput}
               onValueChange={setSearchInput}
               onSearch={setSearch}
               placeholder="Buscar por código o nombre..."
               debounceDelay={350}
               className="w-full max-w-sm"
            />

            <div className="flex items-center gap-2">
               {CATEGORY_FILTER.map((f) => (
                  <button
                     key={f.value}
                     onClick={() => setCategoryFilter(f.value)}
                     className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        categoryFilter === f.value
                           ? "bg-brand-blue text-white"
                           : "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 dark:text-blue-300"
                     }`}
                  >
                     {f.label}
                  </button>
               ))}
            </div>

            <div className="ml-auto">
               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <PermissionGuard resource="users" action="create">
                  <DialogTrigger asChild>
                     <Button className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold shadow-md shadow-brand-yellow/30 border-0">
                        <Plus className="size-4 mr-2" />
                        Nuevo Concepto
                     </Button>
                  </DialogTrigger>
                  </PermissionGuard>
                  <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Nuevo Concepto de Nómina</DialogTitle>
                        <DialogDescription>
                           Define un nuevo concepto que podrá ser usado en cálculos de nómina.
                        </DialogDescription>
                     </DialogHeader>
                     <ConceptForm
                        onSubmit={handleCreate}
                        onCancel={() => setCreateOpen(false)}
                        loading={formLoading}
                     />
                  </DialogContent>
               </Dialog>
            </div>
         </div>

         {/* Table */}
         {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
               <div className="size-5 animate-spin rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
               Cargando conceptos…
            </div>
         ) : (
            <ConceptTable
               concepts={filtered}
               onDeactivate={setDeactivateTarget}
            />
         )}

         <DeactivateConceptDialog
            concept={deactivateTarget}
            onConfirm={handleDeactivate}
            onClose={() => setDeactivateTarget(null)}
            loading={formLoading}
         />
      </div>
      </PermissionGuard>
   );
}

function StatCard({
   label,
   value,
   accent,
}: {
   label: string;
   value: number;
   accent: keyof typeof STAT_STYLES;
}) {
   const s = STAT_STYLES[accent];
   return (
      <div className={`rounded-xl ${s.card} p-5`}>
         <p className={`text-sm font-medium ${s.label}`}>{label}</p>
         <p className={`mt-1 text-4xl font-bold ${s.value}`}>{value}</p>
         <div className={`mt-3 h-1 w-10 rounded-full ${s.bar}`} />
      </div>
   );
}
