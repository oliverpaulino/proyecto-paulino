import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ConceptCategorySchema = z.enum(["earning", "deduction", "benefit", "adjustment"]);
export const ConceptSignSchema = z.union([z.literal(1), z.literal(-1)]);
export const AppliesToSchema = z.enum(["all", "employee", "project", "role"]);
export const TriggerTypeSchema = z.enum(["per_attendance", "per_cycle", "manual"]);
export const AmountModeSchema = z.enum(["fixed", "per_day", "per_hour", "pct_of_gross", "pct_of_net"]);
export const LocationFilterSchema = z.enum(["local", "nacional", "internacional"]);
export const ItemSourceSchema = z.enum(["attendance", "rule_auto", "manual"]);

// ─── PayrollConcept ───────────────────────────────────────────────────────────

export const PayrollConceptSchema = z.object({
   id: z.string().uuid(),
   organization_id: z.string().uuid().nullable(),
   code: z.string(),
   name: z.string(),
   category: ConceptCategorySchema,
   sign: ConceptSignSchema,
   is_taxable: z.boolean(),
   is_active: z.boolean(),
   accounting_rule_id: z.string().uuid().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

export const PayrollConceptFormSchema = z.object({
   code: z.string().min(1, "Código requerido").max(20).transform((v) => v.toUpperCase()),
   name: z.string().min(1, "Nombre requerido"),
   category: ConceptCategorySchema,
   sign: ConceptSignSchema.default(1),
   is_taxable: z.boolean().default(false),
   accounting_rule_id: z.string().uuid().nullable().optional(),
   organization_id: z.string().uuid().nullable().optional(),
});

export const UpdatePayrollConceptFormSchema = PayrollConceptFormSchema.partial();

// ─── PayrollConceptRule ───────────────────────────────────────────────────────

export const PayrollConceptRuleSchema = z.object({
   id: z.string().uuid(),
   concept_id: z.string().uuid(),
   applies_to: AppliesToSchema,
   target_id: z.string().uuid().nullable(),
   trigger: TriggerTypeSchema,
   amount_mode: AmountModeSchema,
   amount_value: z.number().nonnegative(),
   effective_from: z.coerce.date(),
   effective_to: z.coerce.date().nullable(),
   priority: z.number().int().default(0),
   project_location_filter: LocationFilterSchema.nullable(),
   is_active: z.boolean(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

export const PayrollConceptRuleFormSchema = z.object({
   concept_id: z.string().uuid(),
   applies_to: AppliesToSchema.default("all"),
   target_id: z.string().uuid().nullable().optional(),
   trigger: TriggerTypeSchema,
   amount_mode: AmountModeSchema,
   amount_value: z.number().nonnegative(),
   effective_from: z.coerce.date(),
   effective_to: z.coerce.date().nullable().optional(),
   priority: z.number().int().default(0),
   project_location_filter: LocationFilterSchema.nullable().optional(),
});

export const UpdatePayrollConceptRuleFormSchema = PayrollConceptRuleFormSchema.partial().omit({ concept_id: true });

// ─── PayrollItem ──────────────────────────────────────────────────────────────

export const PayrollItemSchema = z.object({
   id: z.string().uuid(),
   organization_id: z.string().uuid().nullable(),
   cycle_id: z.string().uuid().nullable(),
   employee_id: z.string().uuid(),
   concept_id: z.string().uuid(),
   source: ItemSourceSchema,
   source_ref_id: z.string().uuid().nullable(),
   quantity: z.number(),
   unit_value: z.number(),
   amount: z.number(),
   work_date: z.coerce.date().nullable(),
   work_date_end: z.coerce.date().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

export const CreatePayrollItemFormSchema = z.object({
   organization_id: z.string().uuid().nullable().optional(),
   cycle_id: z.string().uuid().nullable().optional(),
   employee_id: z.string().uuid(),
   concept_id: z.string().uuid(),
   quantity: z.number().positive().default(1),
   unit_value: z.number().nonnegative().default(0),
   amount: z.number(),
   work_date: z.coerce.date().nullable().optional(),
   work_date_end: z.coerce.date().nullable().optional(),
});

export const UpdatePayrollItemFormSchema = z.object({
   quantity: z.number().positive().optional(),
   unit_value: z.number().nonnegative().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type PayrollConcept = z.infer<typeof PayrollConceptSchema>;
export type PayrollConceptForm = z.infer<typeof PayrollConceptFormSchema>;
export type UpdatePayrollConceptForm = z.infer<typeof UpdatePayrollConceptFormSchema>;

export type PayrollConceptRule = z.infer<typeof PayrollConceptRuleSchema>;
export type PayrollConceptRuleForm = z.infer<typeof PayrollConceptRuleFormSchema>;
export type UpdatePayrollConceptRuleForm = z.infer<typeof UpdatePayrollConceptRuleFormSchema>;

export type PayrollItem = z.infer<typeof PayrollItemSchema>;
export type CreatePayrollItemForm = z.infer<typeof CreatePayrollItemFormSchema>;
export type UpdatePayrollItemForm = z.infer<typeof UpdatePayrollItemFormSchema>;

export type ConceptCategory = z.infer<typeof ConceptCategorySchema>;
export type ConceptSign = z.infer<typeof ConceptSignSchema>;
export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type AmountMode = z.infer<typeof AmountModeSchema>;
export type LocationFilter = z.infer<typeof LocationFilterSchema>;
