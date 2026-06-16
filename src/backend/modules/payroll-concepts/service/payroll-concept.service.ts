import {
   ConceptCategory, ConceptSign, CreatePayrollConceptDTO, CreatePayrollConceptRuleDTO,
   CreatePayrollItemDTO, FindBestMatchParams, IPayrollConceptRepository,
   IPayrollConceptRuleRepository, IPayrollItemRepository, PayrollConceptProps,
   PayrollConceptRuleProps, PayrollItemProps, TriggerType, UpdatePayrollConceptDTO,
   UpdatePayrollConceptRuleDTO,
} from "../domain/payroll-concept.domain";

const VALID_CATEGORIES: ConceptCategory[] = ["earning", "deduction", "benefit", "adjustment"];
const VALID_SIGNS: ConceptSign[] = [1, -1];
const VALID_TRIGGERS: TriggerType[] = ["per_attendance", "per_cycle", "manual"];

// ─── PayrollConceptService ────────────────────────────────────────────────────

export class PayrollConceptService {
   constructor(private readonly repo: IPayrollConceptRepository) {}

   async list(): Promise<PayrollConceptProps[]> {
      const items = await this.repo.list();
      return items.map((i) => i.toJSON());
   }

   async getById(id: string): Promise<PayrollConceptProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }

   async create(dto: CreatePayrollConceptDTO): Promise<PayrollConceptProps> {
      if (!dto.code?.trim()) throw new Error("Código es requerido");
      if (!dto.name?.trim()) throw new Error("Nombre es requerido");
      if (!VALID_CATEGORIES.includes(dto.category)) throw new Error("Categoría inválida");
      if (dto.sign !== undefined && !VALID_SIGNS.includes(dto.sign)) throw new Error("Signo debe ser 1 o -1");

      const concept = await this.repo.create(dto);
      return concept.toJSON();
   }

   async update(id: string, dto: UpdatePayrollConceptDTO): Promise<PayrollConceptProps | null> {
      if (dto.category !== undefined && !VALID_CATEGORIES.includes(dto.category)) throw new Error("Categoría inválida");
      if (dto.sign !== undefined && !VALID_SIGNS.includes(dto.sign)) throw new Error("Signo debe ser 1 o -1");

      const concept = await this.repo.update(id, dto);
      return concept ? concept.toJSON() : null;
   }

   async deactivate(id: string): Promise<boolean> {
      return this.repo.deactivate(id);
   }
}

// ─── PayrollConceptRuleService ────────────────────────────────────────────────

export class PayrollConceptRuleService {
   constructor(private readonly repo: IPayrollConceptRuleRepository) {}

   async list(conceptId?: string): Promise<PayrollConceptRuleProps[]> {
      const items = await this.repo.list(conceptId);
      return items.map((i) => i.toJSON());
   }

   async getById(id: string): Promise<PayrollConceptRuleProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }

   async findApplicable(params: FindBestMatchParams): Promise<PayrollConceptRuleProps[]> {
      const rules = await this.repo.findBestMatch(params);
      return rules.map((r) => r.toJSON());
   }

   async create(dto: CreatePayrollConceptRuleDTO): Promise<PayrollConceptRuleProps> {
      if (!dto.concept_id?.trim()) throw new Error("concept_id es requerido");
      if (!VALID_TRIGGERS.includes(dto.trigger)) throw new Error("Trigger inválido");
      if (!dto.effective_from) throw new Error("effective_from es requerido");
      if (dto.amount_value < 0) throw new Error("amount_value no puede ser negativo");

      const rule = await this.repo.create(dto);
      return rule.toJSON();
   }

   async update(id: string, dto: UpdatePayrollConceptRuleDTO): Promise<PayrollConceptRuleProps | null> {
      if (dto.trigger !== undefined && !VALID_TRIGGERS.includes(dto.trigger)) throw new Error("Trigger inválido");
      if (dto.amount_value !== undefined && dto.amount_value < 0) throw new Error("amount_value no puede ser negativo");

      const rule = await this.repo.update(id, dto);
      return rule ? rule.toJSON() : null;
   }

   async deactivate(id: string): Promise<boolean> {
      return this.repo.deactivate(id);
   }
}

// ─── PayrollItemService ───────────────────────────────────────────────────────

export class PayrollItemService {
   constructor(private readonly repo: IPayrollItemRepository) {}

   async createManual(dto: CreatePayrollItemDTO): Promise<PayrollItemProps> {
      if (!dto.employee_id?.trim()) throw new Error("employee_id es requerido");
      if (!dto.concept_id?.trim()) throw new Error("concept_id es requerido");

      const item = await this.repo.create({ ...dto, source: "manual" });
      return item.toJSON();
   }

   async update(
      id: string,
      dto: { quantity?: number; unit_value?: number }
   ): Promise<PayrollItemProps | null> {
      const existing = await this.repo.findById(id);
      if (!existing) return null;

      const qty = dto.quantity ?? existing.quantity;
      const uv = dto.unit_value ?? existing.unit_value;
      const amount = qty * uv;

      const item = await this.repo.update(id, { quantity: qty, unit_value: uv, amount });
      return item ? item.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }

   async listByCycle(cycleId: string) {
      return this.repo.listByCycle(cycleId);
   }

   async listByEmployee(employeeId: string, from?: Date, to?: Date): Promise<PayrollItemProps[]> {
      return this.repo.listByEmployee(employeeId, from, to);
   }

   async listByEmployeeAndCycle(cycleId: string, employeeId: string): Promise<PayrollItemProps[]> {
      return this.repo.listByEmployeeAndCycle(cycleId, employeeId);
   }

   async upsertAggregated(
      cycleId: string,
      employeeId: string,
      conceptId: string,
      amount: number
   ): Promise<void> {
      return this.repo.upsertAggregated(cycleId, employeeId, conceptId, amount);
   }
}
