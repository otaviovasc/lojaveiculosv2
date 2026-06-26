export type FinanceEntryType = "commission" | "expense" | "revenue";
export type FinanceEntryStatus = "cancelled" | "paid" | "pending";
export type FinanceRecurrenceFrequency = "monthly" | "weekly" | "yearly";
export type CommissionRuleType = "fixed_amount" | "manual" | "percentage";
export type CommissionRuleStatus = "active" | "inactive";
export type FinanceLinkTarget =
  | "document"
  | "lead"
  | "sale"
  | "sale_payment"
  | "vehicle_cost"
  | "vehicle_unit";

export type FinanceEntry = {
  amountCents: number;
  category: string;
  createdAt: Date;
  dueAt: Date | null;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  paidAt: Date | null;
  sellerUserId: string | null;
  status: FinanceEntryStatus;
  storeId: string;
  tenantId: string;
  type: FinanceEntryType;
  updatedAt: Date;
};

export type FinanceEntryLink = {
  createdAt: Date;
  entryId: string;
  id: string;
  storeId: string;
  targetId: string;
  targetType: FinanceLinkTarget;
  tenantId: string;
  updatedAt: Date;
};

export type CreateFinanceEntryInput = Omit<
  FinanceEntry,
  "createdAt" | "id" | "updatedAt"
> & {
  links: readonly {
    targetId: string;
    targetType: FinanceLinkTarget;
  }[];
};

export type FinanceEntryBundle = {
  entry: FinanceEntry;
  links: readonly FinanceEntryLink[];
};

export type FinanceRecurringEntry = {
  amountCents: number;
  category: string;
  createdAt: Date;
  dayOfMonth: number | null;
  frequency: FinanceRecurrenceFrequency;
  id: string;
  lastGeneratedAt: Date | null;
  metadata: Record<string, unknown>;
  name: string;
  nextDueAt: Date;
  sellerUserId: string | null;
  status: FinanceEntryStatus;
  storeId: string;
  tenantId: string;
  type: FinanceEntryType;
  updatedAt: Date;
};

export type CommissionRule = {
  category: string;
  createdAt: Date;
  fixedAmountCents: number | null;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  percentageBasisPoints: number | null;
  sellerUserId: string | null;
  status: CommissionRuleStatus;
  storeId: string;
  tenantId: string;
  type: CommissionRuleType;
  updatedAt: Date;
};

export type FindFinanceEntryInput = {
  entryId: string;
  storeId: string | null;
  tenantId: string | null;
};

export type ListFinanceEntriesInput = {
  limit: number;
  offset: number;
  status?: FinanceEntryStatus | null;
  storeId: string | null;
  targetId?: string | null;
  targetType?: FinanceLinkTarget | null;
  tenantId: string | null;
  type?: FinanceEntryType | null;
};

export type UpdateFinanceEntryInput = {
  amountCents?: number;
  category?: string;
  dueAt?: Date | null;
  entryId: string;
  links?: readonly {
    targetId: string;
    targetType: FinanceLinkTarget;
  }[];
  metadata?: Record<string, unknown>;
  name?: string;
  paidAt?: Date | null;
  sellerUserId?: string | null;
  status?: FinanceEntryStatus;
  storeId: string | null;
  tenantId: string | null;
};

export type CreateFinanceRecurringEntryInput = Omit<
  FinanceRecurringEntry,
  "createdAt" | "id" | "lastGeneratedAt" | "updatedAt"
>;

export type ListFinanceRecurringEntriesInput = {
  limit: number;
  storeId: string | null;
  tenantId: string | null;
  type?: FinanceEntryType | null;
};

export type CreateCommissionRuleInput = Omit<
  CommissionRule,
  "createdAt" | "id" | "updatedAt"
>;

export type ListCommissionRulesInput = {
  limit: number;
  sellerUserId?: string | null;
  status?: CommissionRuleStatus | null;
  storeId: string | null;
  tenantId: string | null;
};

export type FinanceRepository = {
  createCommissionRule: (
    input: CreateCommissionRuleInput,
  ) => Promise<CommissionRule>;
  createEntry: (input: CreateFinanceEntryInput) => Promise<FinanceEntryBundle>;
  createRecurringEntry: (
    input: CreateFinanceRecurringEntryInput,
  ) => Promise<FinanceRecurringEntry>;
  findById: (
    input: FindFinanceEntryInput,
  ) => Promise<FinanceEntryBundle | null>;
  list: (
    input: ListFinanceEntriesInput,
  ) => Promise<readonly FinanceEntryBundle[]>;
  listCommissionRules: (
    input: ListCommissionRulesInput,
  ) => Promise<readonly CommissionRule[]>;
  listRecurringEntries: (
    input: ListFinanceRecurringEntriesInput,
  ) => Promise<readonly FinanceRecurringEntry[]>;
  updateEntry: (input: UpdateFinanceEntryInput) => Promise<FinanceEntryBundle>;
};
