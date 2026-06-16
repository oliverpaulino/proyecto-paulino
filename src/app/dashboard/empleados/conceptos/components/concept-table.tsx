"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PowerOff } from "lucide-react";
import type { PayrollConcept, ConceptCategory } from "@/dtos/payroll-concept.dto";

interface ConceptTableProps {
   concepts: PayrollConcept[];
   onDeactivate: (concept: PayrollConcept) => void;
}

const CATEGORY_BADGE: Record<ConceptCategory, "default" | "destructive" | "secondary" | "outline"> = {
   earning: "default",
   deduction: "destructive",
   benefit: "secondary",
   adjustment: "outline",
};

const CATEGORY_LABEL: Record<ConceptCategory, string> = {
   earning: "Ingreso",
   deduction: "Deducción",
   benefit: "Beneficio",
   adjustment: "Ajuste",
};

const SIGN_LABEL: Record<number, string> = {
   1: "+1 (suma)",
   [-1]: "-1 (resta)",
};

export function ConceptTable({ concepts, onDeactivate }: ConceptTableProps) {
   if (concepts.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
            <span className="text-3xl opacity-30">📋</span>
            <span>No hay conceptos de nómina registrados.</span>
         </div>
      );
   }

   return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
         <table className="w-full text-sm">
            <thead>
               <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">Signo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-blue-200">Imponible</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">Acciones</th>
               </tr>
            </thead>
            <tbody>
               {concepts.map((concept) => (
                  <tr
                     key={concept.id}
                     className="border-t border-border hover:bg-brand-blue/5 transition-colors"
                  >
                     <td className="px-4 py-3">
                        <span className="inline-block rounded bg-brand-yellow/25 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                           {concept.code}
                        </span>
                     </td>
                     <td className="px-4 py-3">
                        <div className="font-semibold text-brand-blue dark:text-white">{concept.name}</div>
                     </td>
                     <td className="px-4 py-3">
                        <Badge variant={CATEGORY_BADGE[concept.category]}>
                           {CATEGORY_LABEL[concept.category]}
                        </Badge>
                     </td>
                     <td className="px-4 py-3 text-muted-foreground text-xs">
                        {SIGN_LABEL[concept.sign] ?? concept.sign}
                     </td>
                     <td className="px-4 py-3 text-center">
                        <span
                           className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              concept.is_taxable
                                 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                                 : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                           }`}
                        >
                           {concept.is_taxable ? "Sí" : "No"}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-right">
                        <Button
                           variant="ghost"
                           size="sm"
                           className="text-brand-red hover:bg-brand-red/10 hover:text-brand-red"
                           onClick={() => onDeactivate(concept)}
                           title="Desactivar concepto"
                        >
                           <PowerOff className="size-4" />
                        </Button>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
