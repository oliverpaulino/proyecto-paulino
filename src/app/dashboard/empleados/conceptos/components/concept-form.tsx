"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PayrollConceptForm, ConceptCategory, ConceptSign } from "@/dtos/payroll-concept.dto";

interface ConceptFormProps {
   initialData?: Partial<PayrollConceptForm>;
   onSubmit: (data: PayrollConceptForm) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const CATEGORIES: { value: ConceptCategory; label: string }[] = [
   { value: "earning", label: "Ingreso" },
   { value: "deduction", label: "Deducción" },
   { value: "benefit", label: "Beneficio" },
   { value: "adjustment", label: "Ajuste" },
];

const SIGNS: { value: ConceptSign; label: string }[] = [
   { value: 1, label: "+1 — Suma al neto" },
   { value: -1, label: "-1 — Resta del neto" },
];

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

export function ConceptForm({
   initialData,
   onSubmit,
   onCancel,
   loading,
   submitLabel = "Crear concepto",
}: ConceptFormProps) {
   const [code, setCode] = useState(initialData?.code ?? "");
   const [name, setName] = useState(initialData?.name ?? "");
   const [category, setCategory] = useState<ConceptCategory>(initialData?.category ?? "earning");
   const [sign, setSign] = useState<ConceptSign>(initialData?.sign ?? 1);
   const [isTaxable, setIsTaxable] = useState(initialData?.is_taxable ?? false);
   const [error, setError] = useState<string | null>(null);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      try {
         await onSubmit({ code: code.toUpperCase(), name, category, sign, is_taxable: isTaxable });
      } catch (err) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-code">Código *</Label>
            <Input
               id="cf-code"
               value={code}
               onChange={(e) => setCode(e.target.value.toUpperCase())}
               placeholder="Ej: DIETA, SALARIO"
               maxLength={20}
               required
            />
            <p className="text-xs text-muted-foreground">Código corto único por organización (se guarda en mayúsculas)</p>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-name">Nombre *</Label>
            <Input
               id="cf-name"
               value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder="Nombre legible del concepto"
               required
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-category">Categoría *</Label>
            <select
               id="cf-category"
               value={category}
               onChange={(e) => setCategory(e.target.value as ConceptCategory)}
               className={SELECT_CLASS}
               required
            >
               {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
               ))}
            </select>
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-sign">Signo *</Label>
            <select
               id="cf-sign"
               value={sign}
               onChange={(e) => setSign(Number(e.target.value) as ConceptSign)}
               className={SELECT_CLASS}
               required
            >
               {SIGNS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
               ))}
            </select>
         </div>

         <div className="flex items-center justify-between rounded-lg border border-input bg-input/10 px-4 py-3">
            <div className="flex flex-col gap-0.5">
               <Label htmlFor="cf-taxable" className="cursor-pointer">Imponible (sujeto a impuestos)</Label>
               <p className="text-xs text-muted-foreground">Indica si este concepto aplica retención de impuestos</p>
            </div>
            <Switch
               id="cf-taxable"
               checked={isTaxable}
               onCheckedChange={setIsTaxable}
            />
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
               <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancelar
               </Button>
            )}
            <Button type="submit" disabled={loading}>
               {loading ? "Guardando…" : submitLabel}
            </Button>
         </div>
      </form>
   );
}
