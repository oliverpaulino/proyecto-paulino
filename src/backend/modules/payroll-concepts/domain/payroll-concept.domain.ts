// ─── Tipos primitivos ────────────────────────────────────────────────────────

export type ConceptCategory = 'earning' | 'deduction' | 'benefit' | 'adjustment';
export type ConceptSign = 1 | -1;
export type AppliesTo = 'all' | 'employee' | 'project' | 'role';
export type TriggerType = 'per_attendance' | 'per_cycle' | 'manual';
export type AmountMode = 'fixed' | 'per_day' | 'per_hour' | 'pct_of_gross' | 'pct_of_net';
export type LocationFilter = 'local' | 'nacional' | 'internacional';

// ─── PayrollConceptEntity ─────────────────────────────────────────────────────

export interface PayrollConceptProps {
   id: string;
   organization_id: string | null;
   code: string;
   name: string;
   category: ConceptCategory;
   sign: ConceptSign;
   is_taxable: boolean;
   is_active: boolean;
   accounting_rule_id: string | null;
   created_at: Date;
   updated_at: Date;
}

export class PayrollConceptEntity {
   private constructor(private readonly props: PayrollConceptProps) {}

   static create(props: PayrollConceptProps): PayrollConceptEntity {
      return new PayrollConceptEntity(props);
   }

   get id(): string { return this.props.id; }
   get code(): string { return this.props.code; }
   get name(): string { return this.props.name; }
   get category(): ConceptCategory { return this.props.category; }
   get sign(): ConceptSign { return this.props.sign; }
   get is_taxable(): boolean { return this.props.is_taxable; }
   get is_active(): boolean { return this.props.is_active; }
   get organization_id(): string | null { return this.props.organization_id; }
   get accounting_rule_id(): string | null { return this.props.accounting_rule_id; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): PayrollConceptProps { return { ...this.props }; }
}

export interface CreatePayrollConceptDTO {
   code: string;
   name: string;
   category: ConceptCategory;
   sign?: ConceptSign;
   is_taxable?: boolean;
   accounting_rule_id?: string | null;
   organization_id?: string | null;
}

export interface UpdatePayrollConceptDTO {
   code?: string;
   name?: string;
   category?: ConceptCategory;
   sign?: ConceptSign;
   is_taxable?: boolean;
   accounting_rule_id?: string | null;
}

export interface IPayrollConceptRepository {
   create(dto: CreatePayrollConceptDTO): Promise<PayrollConceptEntity>;
   update(id: string, dto: UpdatePayrollConceptDTO): Promise<PayrollConceptEntity | null>;
   deactivate(id: string): Promise<boolean>;
   findById(id: string): Promise<PayrollConceptEntity | null>;
   list(): Promise<PayrollConceptEntity[]>;
}

// ─── PayrollConceptRuleEntity ─────────────────────────────────────────────────

export interface PayrollConceptRuleProps {
   id: string;
   concept_id: string;
   applies_to: AppliesTo;
   target_id: string | null;
   trigger: TriggerType;
   amount_mode: AmountMode;
   amount_value: number;
   effective_from: Date;
   effective_to: Date | null;
   priority: number;
   project_location_filter: LocationFilter | null;
   is_active: boolean;
   created_at: Date;
   updated_at: Date;
}

export class PayrollConceptRuleEntity {
   private constructor(private readonly props: PayrollConceptRuleProps) {}

   static create(props: PayrollConceptRuleProps): PayrollConceptRuleEntity {
      return new PayrollConceptRuleEntity(props);
   }

   get id(): string { return this.props.id; }
   get concept_id(): string { return this.props.concept_id; }
   get applies_to(): AppliesTo { return this.props.applies_to; }
   get target_id(): string | null { return this.props.target_id; }
   get trigger(): TriggerType { return this.props.trigger; }
   get amount_mode(): AmountMode { return this.props.amount_mode; }
   get amount_value(): number { return this.props.amount_value; }
   get effective_from(): Date { return this.props.effective_from; }
   get effective_to(): Date | null { return this.props.effective_to; }
   get priority(): number { return this.props.priority; }
   get project_location_filter(): LocationFilter | null { return this.props.project_location_filter; }
   get is_active(): boolean { return this.props.is_active; }
   get created_at(): Date { return this.props.created_at; }
   get updated_at(): Date { return this.props.updated_at; }

   toJSON(): PayrollConceptRuleProps { return { ...this.props }; }
}

export interface CreatePayrollConceptRuleDTO {
   concept_id: string;
   applies_to?: AppliesTo;
   target_id?: string | null;
   trigger: TriggerType;
   amount_mode: AmountMode;
   amount_value: number;
   effective_from: Date | string;
   effective_to?: Date | string | null;
   priority?: number;
   project_location_filter?: LocationFilter | null;
}

export interface UpdatePayrollConceptRuleDTO {
   applies_to?: AppliesTo;
   target_id?: string | null;
   trigger?: TriggerType;
   amount_mode?: AmountMode;
   amount_value?: number;
   effective_from?: Date | string;
   effective_to?: Date | string | null;
   priority?: number;
   project_location_filter?: LocationFilter | null;
}

export interface FindBestMatchParams {
   trigger: TriggerType;
   refDate: Date;
   employeeId?: string;
   projectId?: string;
   projectLocationType?: LocationFilter;
}

export interface IPayrollConceptRuleRepository {
   create(dto: CreatePayrollConceptRuleDTO): Promise<PayrollConceptRuleEntity>;
   update(id: string, dto: UpdatePayrollConceptRuleDTO): Promise<PayrollConceptRuleEntity | null>;
   deactivate(id: string): Promise<boolean>;
   findById(id: string): Promise<PayrollConceptRuleEntity | null>;
   list(conceptId?: string): Promise<PayrollConceptRuleEntity[]>;
   findBestMatch(params: FindBestMatchParams): Promise<PayrollConceptRuleEntity[]>;
}

// ─── PayrollItemEntity ────────────────────────────────────────────────────────

export type ItemSource = 'attendance' | 'rule_auto' | 'manual';

export interface PayrollItemProps {
   id: string;
   organization_id: string | null;
   cycle_id: string | null;
   employee_id: string;
   concept_id: string;
   source: ItemSource;
   source_ref_id: string | null;
   quantity: number;
   unit_value: number;
   amount: number;
   work_date: Date | null;
   work_date_end: Date | null;
   created_at: Date;
   updated_at: Date;
}

export class PayrollItemEntity {
   private constructor(private readonly props: PayrollItemProps) {}

   static create(props: PayrollItemProps): PayrollItemEntity {
      return new PayrollItemEntity(props);
   }

   get id(): string { return this.props.id; }
   get cycle_id(): string | null { return this.props.cycle_id; }
   get employee_id(): string { return this.props.employee_id; }
   get concept_id(): string { return this.props.concept_id; }
   get source(): ItemSource { return this.props.source; }
   get source_ref_id(): string | null { return this.props.source_ref_id; }
   get quantity(): number { return this.props.quantity; }
   get unit_value(): number { return this.props.unit_value; }
   get amount(): number { return this.props.amount; }
   get work_date(): Date | null { return this.props.work_date; }
   get work_date_end(): Date | null { return this.props.work_date_end; }

   toJSON(): PayrollItemProps { return { ...this.props }; }
}

export interface CreatePayrollItemDTO {
   organization_id?: string | null;
   cycle_id?: string | null;
   employee_id: string;
   concept_id: string;
   source: ItemSource;
   source_ref_id?: string | null;
   quantity?: number;
   unit_value?: number;
   amount: number;
   work_date?: Date | string | null;
   work_date_end?: Date | string | null;
}

export interface IPayrollItemRepository {
   create(dto: CreatePayrollItemDTO): Promise<PayrollItemEntity>;
   update(id: string, dto: Partial<Pick<PayrollItemProps, 'quantity' | 'unit_value' | 'amount'>>): Promise<PayrollItemEntity | null>;
   delete(id: string): Promise<boolean>;
   findById(id: string): Promise<PayrollItemEntity | null>;
   listByCycle(cycleId: string): Promise<(PayrollItemProps & { category: ConceptCategory; sign: ConceptSign })[]>;
   listByEmployee(employeeId: string, from?: Date, to?: Date): Promise<PayrollItemProps[]>;
   listByEmployeeAndCycle(cycleId: string, employeeId: string): Promise<PayrollItemProps[]>;
   existsForAttendance(sourceRefId: string, conceptId: string): Promise<boolean>;
   hasManualOverride(employeeId: string, conceptId: string, workDate: Date): Promise<boolean>;
   deleteRuleAutoItems(cycleId: string): Promise<void>;
   upsertAggregated(cycleId: string, employeeId: string, conceptId: string, amount: number): Promise<void>;
}
