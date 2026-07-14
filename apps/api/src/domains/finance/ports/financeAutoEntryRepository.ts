import type {
  FinanceAutoEntryCalculation,
  FinanceAutoEntryCalculationSnapshot,
  FinanceAutoEntryEvent,
  FinanceAutoEntryOutputType,
  FinanceAutoEntryRecipient,
  FinanceAutoEntryRuleConditions,
  FinanceAutoEntryRuleResolution,
  FinanceAutoEntryRuleStatus,
  FinanceAutoEntryTiming,
} from "@lojaveiculosv2/shared";

export type FinanceAutoEntryRule = {
  calculation: FinanceAutoEntryCalculation;
  category: string | null;
  conditions: FinanceAutoEntryRuleConditions;
  createdAt: Date;
  event: FinanceAutoEntryEvent;
  family: string | null;
  id: string;
  metadata: Record<string, unknown>;
  name: string | null;
  outputType: FinanceAutoEntryOutputType;
  priority: number;
  recipient: FinanceAutoEntryRecipient;
  resolution: FinanceAutoEntryRuleResolution;
  ruleKey: string | null;
  sellerUserId: string | null;
  status: FinanceAutoEntryRuleStatus;
  storeId: string;
  tenantId: string;
  timing: FinanceAutoEntryTiming;
  updatedAt: Date;
};

export type FinanceAutoEntryExecution = {
  calculationSnapshot: FinanceAutoEntryCalculationSnapshot;
  createdAt: Date;
  financeEntryId: string;
  id: string;
  metadata: Record<string, unknown>;
  ruleId: string;
  sourceId: string;
  sourceRevision: number;
  sourceType: FinanceAutoEntryEvent;
  storeId: string;
  tenantId: string;
  updatedAt: Date;
};

export type CreateFinanceAutoEntryRuleInput = Omit<
  FinanceAutoEntryRule,
  "createdAt" | "id" | "updatedAt"
>;

export type UpdateFinanceAutoEntryRuleInput = Partial<
  Pick<
    FinanceAutoEntryRule,
    | "calculation"
    | "category"
    | "conditions"
    | "event"
    | "family"
    | "metadata"
    | "name"
    | "outputType"
    | "priority"
    | "recipient"
    | "resolution"
    | "ruleKey"
    | "sellerUserId"
    | "status"
    | "timing"
  >
> & {
  ruleId: string;
  storeId: string | null;
  tenantId: string | null;
};

export type FindFinanceAutoEntryRuleInput = {
  ruleId: string;
  storeId: string | null;
  tenantId: string | null;
};

export type ListFinanceAutoEntryRulesInput = {
  event?: FinanceAutoEntryEvent | null;
  includeArchived?: boolean;
  limit: number;
  sellerUserId?: string | null;
  status?: FinanceAutoEntryRuleStatus | null;
  storeId: string | null;
  tenantId: string | null;
};

export type CreateFinanceAutoEntryExecutionInput = Omit<
  FinanceAutoEntryExecution,
  "createdAt" | "id" | "updatedAt"
>;

export type EnsureFinanceAutoEntryRulesInput = {
  rules: readonly (Omit<
    CreateFinanceAutoEntryRuleInput,
    "storeId" | "tenantId"
  > & { ruleKey: string })[];
  storeId: string | null;
  tenantId: string | null;
};

export type FindFinanceAutoEntryExecutionInput = {
  ruleId: string;
  sourceId: string;
  sourceRevision: number;
  sourceType: FinanceAutoEntryEvent;
  storeId: string | null;
  tenantId: string | null;
};

export type IsActiveFinanceStoreMemberInput = {
  storeId: string;
  tenantId: string;
  userId: string;
};

export type FinanceAutoEntryRepository = {
  createExecution: (
    input: CreateFinanceAutoEntryExecutionInput,
  ) => Promise<FinanceAutoEntryExecution>;
  createRule: (
    input: CreateFinanceAutoEntryRuleInput,
  ) => Promise<FinanceAutoEntryRule>;
  ensureRules: (
    input: EnsureFinanceAutoEntryRulesInput,
  ) => Promise<readonly FinanceAutoEntryRule[]>;
  findExecution: (
    input: FindFinanceAutoEntryExecutionInput,
  ) => Promise<FinanceAutoEntryExecution | null>;
  findRuleById: (
    input: FindFinanceAutoEntryRuleInput,
  ) => Promise<FinanceAutoEntryRule | null>;
  isActiveStoreMember: (
    input: IsActiveFinanceStoreMemberInput,
  ) => Promise<boolean>;
  listRules: (
    input: ListFinanceAutoEntryRulesInput,
  ) => Promise<readonly FinanceAutoEntryRule[]>;
  updateRule: (
    input: UpdateFinanceAutoEntryRuleInput,
  ) => Promise<FinanceAutoEntryRule>;
};
