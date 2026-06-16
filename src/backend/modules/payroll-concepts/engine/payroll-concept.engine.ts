import {
   AmountMode, ConceptCategory, ConceptSign, CreatePayrollItemDTO,
   FindBestMatchParams, IPayrollConceptRuleRepository, IPayrollItemRepository,
   PayrollConceptRuleProps, PayrollItemProps,
} from "../domain/payroll-concept.domain";

export interface CalculationContext {
   quantity?: number;
   baseGross?: number;
   baseNet?: number;
}

export interface CalculationResult {
   qty: number;
   unitValue: number;
   amount: number;
}

export interface AttendanceContext {
   organizationId?: string;
   cycleId?: string;
   employeeId: string;
   projectId?: string;
   projectLocationType?: import("../domain/payroll-concept.domain").LocationFilter;
   attendanceId: string;
   workDate: Date;
   hoursWorked?: number;
   daysWorked?: number;
}

export interface CycleContext {
   organizationId?: string;
   cycleId: string;
   employeeId: string;
   projectId?: string;
   projectLocationType?: import("../domain/payroll-concept.domain").LocationFilter;
   refDate: Date;
   baseGross?: number;
   baseNet?: number;
}

export interface AggregateResult {
   itemsGross: number;
   itemsDeductions: number;
   itemsTotal: number;
}

export class PayrollConceptEngine {
   constructor(
      private readonly ruleRepo: IPayrollConceptRuleRepository,
      private readonly itemRepo: IPayrollItemRepository
   ) {}

   // ── Cálculo puro (sin IO) ───────────────────────────────────────────────

   calculateAmount(rule: PayrollConceptRuleProps, ctx: CalculationContext): CalculationResult {
      const v = rule.amount_value;
      const qty = ctx.quantity ?? 1;
      const gross = ctx.baseGross ?? 0;
      const net = ctx.baseNet ?? 0;

      switch (rule.amount_mode as AmountMode) {
         case "fixed":
            return { qty: 1, unitValue: v, amount: v };
         case "per_day":
         case "per_hour":
            return { qty, unitValue: v, amount: qty * v };
         case "pct_of_gross": {
            const amount = gross * (v / 100);
            return { qty: 1, unitValue: amount, amount };
         }
         case "pct_of_net": {
            const amount = net * (v / 100);
            return { qty: 1, unitValue: amount, amount };
         }
      }
   }

   // ── Best-match deduplication ────────────────────────────────────────────
   // Devuelve un mapa concept_id → regla ganadora (mayor score ya viene ordenado del repo)

   private deduplicateByConceptId(rules: PayrollConceptRuleProps[]): PayrollConceptRuleProps[] {
      const seen = new Set<string>();
      return rules.filter((r) => {
         if (seen.has(r.concept_id)) return false;
         seen.add(r.concept_id);
         return true;
      });
   }

   // ── applyOnAttendance ───────────────────────────────────────────────────

   async applyOnAttendance(ctx: AttendanceContext): Promise<PayrollItemProps[]> {
      const params: FindBestMatchParams = {
         trigger: "per_attendance",
         refDate: ctx.workDate,
         employeeId: ctx.employeeId,
         projectId: ctx.projectId,
         projectLocationType: ctx.projectLocationType,
      };

      const allRules = await this.ruleRepo.findBestMatch(params);
      const winners = this.deduplicateByConceptId(allRules.map((r) => r.toJSON()));
      const created: PayrollItemProps[] = [];

      for (const rule of winners) {
         const alreadyExists = await this.itemRepo.existsForAttendance(ctx.attendanceId, rule.concept_id);
         if (alreadyExists) continue;

         const manualOverride = await this.itemRepo.hasManualOverride(
            ctx.employeeId,
            rule.concept_id,
            ctx.workDate
         );
         if (manualOverride) continue;

         const quantity =
            rule.amount_mode === "per_hour"
               ? ctx.hoursWorked ?? 1
               : ctx.daysWorked ?? 1;

         const { qty, unitValue, amount } = this.calculateAmount(rule, { quantity });

         const item = await this.itemRepo.create({
            organization_id: ctx.organizationId,
            cycle_id: ctx.cycleId,
            employee_id: ctx.employeeId,
            concept_id: rule.concept_id,
            source: "attendance",
            source_ref_id: ctx.attendanceId,
            quantity: qty,
            unit_value: unitValue,
            amount,
            work_date: ctx.workDate,
         } satisfies CreatePayrollItemDTO);

         created.push(item.toJSON());
      }

      return created;
   }

   // ── applyOnCycle ────────────────────────────────────────────────────────

   async applyOnCycle(ctx: CycleContext): Promise<PayrollItemProps[]> {
      await this.itemRepo.deleteRuleAutoItems(ctx.cycleId);

      const params: FindBestMatchParams = {
         trigger: "per_cycle",
         refDate: ctx.refDate,
         employeeId: ctx.employeeId,
         projectId: ctx.projectId,
         projectLocationType: ctx.projectLocationType,
      };

      const allRules = await this.ruleRepo.findBestMatch(params);
      const winners = this.deduplicateByConceptId(allRules.map((r) => r.toJSON()));
      const created: PayrollItemProps[] = [];

      for (const rule of winners) {
         const { qty, unitValue, amount } = this.calculateAmount(rule, {
            quantity: 1,
            baseGross: ctx.baseGross,
            baseNet: ctx.baseNet,
         });

         const item = await this.itemRepo.create({
            organization_id: ctx.organizationId,
            cycle_id: ctx.cycleId,
            employee_id: ctx.employeeId,
            concept_id: rule.concept_id,
            source: "rule_auto",
            quantity: qty,
            unit_value: unitValue,
            amount,
         } satisfies CreatePayrollItemDTO);

         created.push(item.toJSON());
      }

      return created;
   }

   // ── aggregateForEmployee ─────────────────────────────────────────────────

   async aggregateForEmployee(
      cycleId: string,
      employeeId: string,
   ): Promise<AggregateResult> {
      const rows = await this.itemRepo.listByCycle(cycleId);
      const employeeRows = rows.filter((r) => r.employee_id === employeeId);

      // Priority per item (higher = wins when same concept)
      function priority(r: typeof employeeRows[0]): number {
         if (r.work_date && !r.work_date_end) return 4;        // exact day
         if (r.work_date && r.work_date_end) return 3;         // range
         if (r.source !== "rule_auto" && !r.work_date) return 2; // cycle manual
         return 1;                                              // rule_auto
      }

      // Keep only the highest-priority item per concept
      const byConceptId = new Map<string, typeof employeeRows[0]>();
      for (const row of employeeRows) {
         const existing = byConceptId.get(row.concept_id);
         if (!existing || priority(row) > priority(existing)) {
            byConceptId.set(row.concept_id, row);
         }
      }

      let itemsGross = 0;
      let itemsDeductions = 0;

      for (const item of byConceptId.values()) {
         const signedAmount = item.amount * (item.sign as ConceptSign);
         if ((item.category as ConceptCategory) === "deduction") {
            itemsDeductions += Math.abs(signedAmount);
         } else {
            itemsGross += signedAmount;
         }
      }

      return {
         itemsGross,
         itemsDeductions,
         itemsTotal: itemsGross - itemsDeductions,
      };
   }
}
