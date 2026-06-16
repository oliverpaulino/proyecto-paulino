import { Kysely, Selectable, sql } from "kysely";
import { DB } from "@/backend/database";
import {
   AmountMode, AppliesTo, ConceptCategory, ConceptSign,
   CreatePayrollConceptDTO, CreatePayrollConceptRuleDTO, CreatePayrollItemDTO,
   FindBestMatchParams, IPayrollConceptRepository, IPayrollConceptRuleRepository,
   IPayrollItemRepository, ItemSource, LocationFilter, PayrollConceptEntity,
   PayrollConceptProps, PayrollConceptRuleEntity, PayrollConceptRuleProps,
   PayrollItemEntity, PayrollItemProps, TriggerType, UpdatePayrollConceptDTO,
   UpdatePayrollConceptRuleDTO,
} from "../domain/payroll-concept.domain";

// ─── PayrollConceptRepo ───────────────────────────────────────────────────────

export class KyselyPayrollConceptRepository implements IPayrollConceptRepository {
   constructor(private readonly db: Kysely<DB>) {}

   private toEntity(row: Selectable<DB["payroll_concepts"]>): PayrollConceptEntity {
      return PayrollConceptEntity.create({
         id: row.id,
         organization_id: row.organization_id,
         code: row.code,
         name: row.name,
         category: row.category as ConceptCategory,
         sign: row.sign as ConceptSign,
         is_taxable: row.is_taxable,
         is_active: row.is_active,
         accounting_rule_id: row.accounting_rule_id,
         created_at: new Date(row.created_at as unknown as string),
         updated_at: new Date(row.updated_at as unknown as string),
      });
   }

   async create(dto: CreatePayrollConceptDTO): Promise<PayrollConceptEntity> {
      const row = await this.db
         .insertInto("payroll_concepts")
         .values({
            code: dto.code.toUpperCase(),
            name: dto.name,
            category: dto.category,
            sign: dto.sign ?? 1,
            is_taxable: dto.is_taxable ?? false,
            is_active: true,
            accounting_rule_id: dto.accounting_rule_id ?? null,
            organization_id: dto.organization_id ?? null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.toEntity(row);
   }

   async update(id: string, dto: UpdatePayrollConceptDTO): Promise<PayrollConceptEntity | null> {
      const updates: Record<string, unknown> = { updated_at: new Date() };
      if (dto.code !== undefined) updates.code = dto.code.toUpperCase();
      if (dto.name !== undefined) updates.name = dto.name;
      if (dto.category !== undefined) updates.category = dto.category;
      if (dto.sign !== undefined) updates.sign = dto.sign;
      if (dto.is_taxable !== undefined) updates.is_taxable = dto.is_taxable;
      if (dto.accounting_rule_id !== undefined) updates.accounting_rule_id = dto.accounting_rule_id;

      const row = await this.db
         .updateTable("payroll_concepts")
         .set(updates)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      return row ? this.toEntity(row) : null;
   }

   async deactivate(id: string): Promise<boolean> {
      const row = await this.db
         .updateTable("payroll_concepts")
         .set({ is_active: false, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();
      return !!row;
   }

   async findById(id: string): Promise<PayrollConceptEntity | null> {
      const row = await this.db
         .selectFrom("payroll_concepts")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();
      return row ? this.toEntity(row) : null;
   }

   async list(): Promise<PayrollConceptEntity[]> {
      const rows = await this.db
         .selectFrom("payroll_concepts")
         .selectAll()
         .where("is_active", "=", true)
         .orderBy("category", "asc")
         .orderBy("name", "asc")
         .execute();
      return rows.map((r) => this.toEntity(r));
   }
}

// ─── PayrollConceptRuleRepo ───────────────────────────────────────────────────

export class KyselyPayrollConceptRuleRepository implements IPayrollConceptRuleRepository {
   constructor(private readonly db: Kysely<DB>) {}

   private toEntity(row: Selectable<DB["payroll_concept_rules"]>): PayrollConceptRuleEntity {
      return PayrollConceptRuleEntity.create({
         id: row.id,
         concept_id: row.concept_id,
         applies_to: row.applies_to as AppliesTo,
         target_id: row.target_id,
         trigger: row.trigger as TriggerType,
         amount_mode: row.amount_mode as AmountMode,
         amount_value: Number(row.amount_value),
         effective_from: new Date(row.effective_from as unknown as string),
         effective_to: row.effective_to ? new Date(row.effective_to as unknown as string) : null,
         priority: Number(row.priority),
         project_location_filter: row.project_location_filter as LocationFilter | null,
         is_active: row.is_active,
         created_at: new Date(row.created_at as unknown as string),
         updated_at: new Date(row.updated_at as unknown as string),
      });
   }

   async create(dto: CreatePayrollConceptRuleDTO): Promise<PayrollConceptRuleEntity> {
      const row = await this.db
         .insertInto("payroll_concept_rules")
         .values({
            concept_id: dto.concept_id,
            applies_to: dto.applies_to ?? "all",
            target_id: dto.target_id ?? null,
            trigger: dto.trigger,
            amount_mode: dto.amount_mode,
            amount_value: dto.amount_value,
            effective_from: new Date(dto.effective_from),
            effective_to: dto.effective_to ? new Date(dto.effective_to) : null,
            priority: dto.priority ?? 0,
            project_location_filter: dto.project_location_filter ?? null,
            is_active: true,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.toEntity(row);
   }

   async update(id: string, dto: UpdatePayrollConceptRuleDTO): Promise<PayrollConceptRuleEntity | null> {
      const updates: Record<string, unknown> = { updated_at: new Date() };
      if (dto.applies_to !== undefined) updates.applies_to = dto.applies_to;
      if (dto.target_id !== undefined) updates.target_id = dto.target_id;
      if (dto.trigger !== undefined) updates.trigger = dto.trigger;
      if (dto.amount_mode !== undefined) updates.amount_mode = dto.amount_mode;
      if (dto.amount_value !== undefined) updates.amount_value = dto.amount_value;
      if (dto.effective_from !== undefined) updates.effective_from = new Date(dto.effective_from);
      if (dto.effective_to !== undefined) updates.effective_to = dto.effective_to ? new Date(dto.effective_to) : null;
      if (dto.priority !== undefined) updates.priority = dto.priority;
      if (dto.project_location_filter !== undefined) updates.project_location_filter = dto.project_location_filter;

      const row = await this.db
         .updateTable("payroll_concept_rules")
         .set(updates)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      return row ? this.toEntity(row) : null;
   }

   async deactivate(id: string): Promise<boolean> {
      const row = await this.db
         .updateTable("payroll_concept_rules")
         .set({ is_active: false, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();
      return !!row;
   }

   async findById(id: string): Promise<PayrollConceptRuleEntity | null> {
      const row = await this.db
         .selectFrom("payroll_concept_rules")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();
      return row ? this.toEntity(row) : null;
   }

   async list(conceptId?: string): Promise<PayrollConceptRuleEntity[]> {
      let query = this.db
         .selectFrom("payroll_concept_rules")
         .selectAll()
         .where("is_active", "=", true);

      if (conceptId) query = query.where("concept_id", "=", conceptId);

      const rows = await query.orderBy("concept_id", "asc").orderBy("priority", "desc").execute();
      return rows.map((r) => this.toEntity(r));
   }

   async findBestMatch(params: FindBestMatchParams): Promise<PayrollConceptRuleEntity[]> {
      const { trigger, refDate, employeeId, projectId, projectLocationType } = params;

      const appliesToValues: string[] = ["all"];
      if (employeeId) appliesToValues.push("employee");
      if (projectId) appliesToValues.push("project");

      let query = this.db
         .selectFrom("payroll_concept_rules")
         .selectAll()
         .select(
            sql<number>`
               CASE applies_to
                  WHEN 'employee' THEN 3
                  WHEN 'project'  THEN 2
                  ELSE 1
               END
               + CASE WHEN project_location_filter IS NOT NULL THEN 1 ELSE 0 END
               + priority
            `.as("score")
         )
         .where("is_active", "=", true)
         .where("trigger", "=", trigger)
         .where("effective_from", "<=", refDate)
         .where((eb) =>
            eb.or([
               eb("effective_to", "is", null),
               eb("effective_to", ">=", refDate),
            ])
         )
         .where("applies_to", "in", appliesToValues);

      if (employeeId || projectId) {
         query = query.where((eb) =>
            eb.or([
               eb("target_id", "is", null),
               ...(employeeId ? [eb("target_id", "=", employeeId)] : []),
               ...(projectId ? [eb("target_id", "=", projectId)] : []),
            ])
         );
      }

      if (projectLocationType) {
         query = query.where((eb) =>
            eb.or([
               eb("project_location_filter", "is", null),
               eb("project_location_filter", "=", projectLocationType),
            ])
         );
      } else {
         query = query.where("project_location_filter", "is", null);
      }

      const rows = await query.orderBy("score", "desc").execute();
      return rows.map((r) => this.toEntity(r));
   }
}

// ─── PayrollItemRepo ──────────────────────────────────────────────────────────

export class KyselyPayrollItemRepository implements IPayrollItemRepository {
   constructor(private readonly db: Kysely<DB>) {}

   private toEntity(row: Selectable<DB["payroll_items"]>): PayrollItemEntity {
      return PayrollItemEntity.create({
         id: row.id,
         organization_id: row.organization_id,
         cycle_id: row.cycle_id,
         employee_id: row.employee_id,
         concept_id: row.concept_id,
         source: row.source as ItemSource,
         source_ref_id: row.source_ref_id,
         amount: Number(row.amount),
         quantity: Number(row.quantity),
         unit_value: Number(row.unit_value),
         work_date: row.work_date ? new Date(row.work_date as unknown as string) : null,
         work_date_end: row.work_date_end ? new Date(row.work_date_end as unknown as string) : null,
         created_at: new Date(row.created_at as unknown as string),
         updated_at: new Date(row.updated_at as unknown as string),
      });
   }

   async create(dto: CreatePayrollItemDTO): Promise<PayrollItemEntity> {
      const row = await this.db
         .insertInto("payroll_items")
         .values({
            organization_id: dto.organization_id ?? null,
            cycle_id: dto.cycle_id ?? null,
            employee_id: dto.employee_id,
            concept_id: dto.concept_id,
            source: dto.source,
            source_ref_id: dto.source_ref_id ?? null,
            quantity: dto.quantity ?? 1,
            unit_value: dto.unit_value ?? 0,
            amount: dto.amount,
            work_date: dto.work_date ? new Date(dto.work_date as string) : null,
            work_date_end: dto.work_date_end ? new Date(dto.work_date_end as string) : null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.toEntity(row);
   }

   async update(
      id: string,
      dto: Partial<Pick<PayrollItemProps, "quantity" | "unit_value" | "amount">>
   ): Promise<PayrollItemEntity | null> {
      const row = await this.db
         .updateTable("payroll_items")
         .set({ ...dto, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      return row ? this.toEntity(row) : null;
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("payroll_items")
         .where("id", "=", id)
         .executeTakeFirst();
      return Number(result.numDeletedRows) > 0;
   }

   async findById(id: string): Promise<PayrollItemEntity | null> {
      const row = await this.db
         .selectFrom("payroll_items")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();
      return row ? this.toEntity(row) : null;
   }

   async listByCycle(
      cycleId: string
   ): Promise<(PayrollItemProps & { category: ConceptCategory; sign: ConceptSign })[]> {
      const rows = await this.db
         .selectFrom("payroll_items")
         .innerJoin("payroll_concepts", "payroll_concepts.id", "payroll_items.concept_id")
         .selectAll("payroll_items")
         .select(["payroll_concepts.category", "payroll_concepts.sign"])
         .where("payroll_items.cycle_id", "=", cycleId)
         .execute();

      return rows.map((r) => ({
         ...this.toEntity(r as unknown as Selectable<DB["payroll_items"]>).toJSON(),
         category: r.category as ConceptCategory,
         sign: r.sign as ConceptSign,
      }));
   }

   async listByEmployee(employeeId: string, from?: Date, to?: Date): Promise<PayrollItemProps[]> {
      let query = this.db
         .selectFrom("payroll_items")
         .selectAll()
         .where("employee_id", "=", employeeId);

      if (from) query = query.where("created_at", ">=", from);
      if (to) query = query.where("created_at", "<=", to);

      const rows = await query.orderBy("created_at", "desc").execute();
      return rows.map((r) => this.toEntity(r).toJSON());
   }

   async listByEmployeeAndCycle(cycleId: string, employeeId: string): Promise<PayrollItemProps[]> {
      const rows = await this.db
         .selectFrom("payroll_items")
         .selectAll()
         .where("cycle_id", "=", cycleId)
         .where("employee_id", "=", employeeId)
         .orderBy("created_at", "asc")
         .execute();
      return rows.map((r) => this.toEntity(r).toJSON());
   }

   async existsForAttendance(sourceRefId: string, conceptId: string): Promise<boolean> {
      const row = await this.db
         .selectFrom("payroll_items")
         .select("id")
         .where("source_ref_id", "=", sourceRefId)
         .where("concept_id", "=", conceptId)
         .executeTakeFirst();
      return !!row;
   }

   async hasManualOverride(employeeId: string, conceptId: string, workDate: Date): Promise<boolean> {
      const row = await this.db
         .selectFrom("payroll_items")
         .select("id")
         .where("employee_id", "=", employeeId)
         .where("concept_id", "=", conceptId)
         .where("source", "=", "manual")
         .where("work_date", "=", workDate)
         .executeTakeFirst();
      return !!row;
   }

   async deleteRuleAutoItems(cycleId: string): Promise<void> {
      await this.db
         .deleteFrom("payroll_items")
         .where("cycle_id", "=", cycleId)
         .where("source", "=", "rule_auto")
         .where("source_ref_id", "is", null)
         .execute();
   }

   async upsertAggregated(
      cycleId: string,
      employeeId: string,
      conceptId: string,
      amount: number
   ): Promise<void> {
      await this.db
         .deleteFrom("payroll_items")
         .where("cycle_id", "=", cycleId)
         .where("employee_id", "=", employeeId)
         .where("concept_id", "=", conceptId)
         .execute();

      await this.db
         .insertInto("payroll_items")
         .values({
            cycle_id: cycleId,
            employee_id: employeeId,
            concept_id: conceptId,
            source: "manual",
            quantity: 1,
            unit_value: amount,
            amount,
         })
         .execute();
   }
}
