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
  | "vehicle_listing"
  | "vehicle_unit";

export type FinanceAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type FinanceEntry = {
  amountCents: number;
  category: string;
  createdAt?: string;
  dueAt: string | null;
  id: string;
  metadata?: Record<string, unknown>;
  name: string;
  paidAt: string | null;
  sellerUserId: string | null;
  status: FinanceEntryStatus;
  storeId?: string;
  tenantId?: string;
  type: FinanceEntryType;
  updatedAt?: string;
};

export type FinanceEntryLink = {
  entryId: string;
  id?: string;
  targetId: string;
  targetType: FinanceLinkTarget;
};

export type FinanceEntryBundle = {
  entry: FinanceEntry;
  links: readonly FinanceEntryLink[];
};

export type FinanceEntryList = {
  entries: readonly FinanceEntry[];
  hasMore: boolean;
  nextOffset: number | null;
  total: number;
};

export type CreateFinanceEntryInput = {
  amountCents: number;
  category: string;
  dueAt?: string | null;
  links?: readonly {
    targetId: string;
    targetType: FinanceLinkTarget;
  }[];
  metadata?: Record<string, unknown>;
  name: string;
  paidAt?: string | null;
  sellerUserId?: string | null;
  status: FinanceEntryStatus;
  type: FinanceEntryType;
};

export type UpdateFinanceEntryInput = Partial<
  Pick<
    CreateFinanceEntryInput,
    | "amountCents"
    | "category"
    | "dueAt"
    | "metadata"
    | "name"
    | "paidAt"
    | "sellerUserId"
    | "status"
  >
>;

export type FinanceSummary = {
  cancelledAmountCents: number;
  commissionAmountCents: number;
  expenseAmountCents: number;
  overdueAmountCents: number;
  paidAmountCents: number;
  pendingAmountCents: number;
  revenueAmountCents: number;
};

export type FinanceRecurringEntry = {
  amountCents: number;
  category: string;
  dayOfMonth: number | null;
  frequency: FinanceRecurrenceFrequency;
  id: string;
  name: string;
  nextDueAt: string;
  sellerUserId: string | null;
  status: FinanceEntryStatus;
  type: FinanceEntryType;
};

export type CreateFinanceRecurringEntryInput = {
  amountCents: number;
  category: string;
  dayOfMonth?: number | null;
  frequency: FinanceRecurrenceFrequency;
  metadata?: Record<string, unknown>;
  name: string;
  nextDueAt: string;
  sellerUserId?: string | null;
  status?: FinanceEntryStatus;
  type: FinanceEntryType;
};

export type CommissionRule = {
  category: string;
  fixedAmountCents: number | null;
  id: string;
  name: string;
  percentageBasisPoints: number | null;
  sellerUserId: string | null;
  status: CommissionRuleStatus;
  type: CommissionRuleType;
};

export type CreateCommissionRuleInput = {
  category: string;
  fixedAmountCents?: number | null;
  metadata?: Record<string, unknown>;
  name: string;
  percentageBasisPoints?: number | null;
  sellerUserId?: string | null;
  status?: CommissionRuleStatus;
  type: CommissionRuleType;
};

export type FinanceDocumentUpload = {
  publicUrl?: string;
  storageKey: string;
  uploadHeaders?: Record<string, string>;
  uploadMethod?: string;
  uploadUrl: string;
};

export type AttachFinanceDocumentInput = {
  fileName: string;
  fileSizeBytes: number;
  kind: string;
  mimeType: string;
  storageKey: string;
  title: string;
};
