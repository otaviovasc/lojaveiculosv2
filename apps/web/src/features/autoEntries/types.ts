import type {
  FinanceAutoEntryCalculation,
  FinanceAutoEntryEvent,
  FinanceAutoEntryPercentageBasis,
  FinanceAutoEntryRecipient,
  FinanceAutoEntryRuleConditions,
  FinanceAutoEntryRuleResolution,
  FinanceAutoEntryTiming,
} from "@lojaveiculosv2/shared";

export type AutoEntryEvent = FinanceAutoEntryEvent;

export type AutoEntryOutputType = "commission" | "expense" | "revenue";
export type AutoEntryRuleStatus = "active" | "inactive";
export type AutoEntryPercentageBasis = FinanceAutoEntryPercentageBasis;
export type AutoEntryResolution = FinanceAutoEntryRuleResolution;
export type AutoEntryRecipient = FinanceAutoEntryRecipient;
export type AutoEntryConditions = FinanceAutoEntryRuleConditions;
export type AutoEntryCalculation = FinanceAutoEntryCalculation;
export type AutoEntryTiming = FinanceAutoEntryTiming;

export type AutoEntryRule = {
  calculation: AutoEntryCalculation;
  category: string;
  conditions?: AutoEntryConditions;
  createdAt: string;
  event: AutoEntryEvent;
  family?: string | null;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  outputType: AutoEntryOutputType;
  priority: number;
  recipient?: AutoEntryRecipient;
  resolution?: AutoEntryResolution;
  ruleKey?: string | null;
  sellerUserId: string | null;
  status: AutoEntryRuleStatus;
  timing: AutoEntryTiming;
  updatedAt: string;
};

export type AutoEntryRuleInput = Pick<
  AutoEntryRule,
  | "calculation"
  | "category"
  | "event"
  | "family"
  | "metadata"
  | "name"
  | "outputType"
  | "priority"
  | "sellerUserId"
  | "status"
  | "timing"
> & {
  conditions?: AutoEntryConditions;
  recipient?: AutoEntryRecipient;
  resolution?: AutoEntryResolution;
  ruleKey?: string | null;
};

export type AutoEntryWorkspaceTab = AutoEntryEvent | "custom";

export type AutoEntryRuleMutation = {
  input: AutoEntryRuleInput;
  ruleId: string | null;
};

export type AutoEntryRuleDraft = {
  amountReais: string;
  calculationBasis: AutoEntryPercentageBasis;
  category: string;
  calculationKind: "fixed" | "percentage";
  event: AutoEntryEvent;
  metadata: Record<string, unknown>;
  name: string;
  outputType: AutoEntryOutputType;
  percentage: string;
  percentageKind: "percentage" | "rate_ppm";
  priority: string;
  sellerUserId: string;
  status: AutoEntryRuleStatus;
  timingKind: AutoEntryTiming["kind"];
  timingValue: string;
};

export type AutoEntryDraftErrors = Partial<
  Record<
    | "amountReais"
    | "category"
    | "name"
    | "outputType"
    | "percentage"
    | "priority"
    | "timingValue",
    string
  >
>;
