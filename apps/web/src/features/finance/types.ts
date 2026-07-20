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
  links?: readonly FinanceEntryLink[];
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

export type FinanceEntryDocument = {
  fileName?: string | null;
  id: string;
  kind?: string;
  mimeType?: string | null;
  title: string;
};

export type FinanceEntryDetail = FinanceEntryBundle & {
  documents: readonly FinanceEntryDocument[];
};

export type FinanceEntryList = {
  entries: readonly FinanceEntry[];
  hasMore: boolean;
  nextOffset: number | null;
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

export type FinanceRecurringEntry = {
  amountCents: number;
  category: string;
  createdAt?: string;
  dayOfMonth: number | null;
  frequency: FinanceRecurrenceFrequency;
  id: string;
  lastGeneratedAt?: string | null;
  metadata?: Record<string, unknown>;
  name: string;
  nextDueAt: string;
  sellerUserId: string | null;
  status: FinanceEntryStatus;
  type: FinanceEntryType;
  updatedAt?: string;
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

export type UpdateFinanceRecurringEntryInput = Partial<
  Pick<
    CreateFinanceRecurringEntryInput,
    | "amountCents"
    | "category"
    | "dayOfMonth"
    | "frequency"
    | "metadata"
    | "name"
    | "nextDueAt"
    | "sellerUserId"
  >
>;

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

export type CommissionWorkspaceSale = {
  closedAt: string | null;
  createdAt: string;
  entries: readonly FinanceEntry[];
  id: string;
  isCurrentRevision: boolean;
  listingSnapshot: Record<string, unknown>;
  salePriceCents: number | null;
  sellerUserId: string | null;
  standardCommissionEnabled: boolean;
  status: "cancelled" | "closed" | "draft" | "pending";
  unitId: string | null;
  updatedAt: string;
};

export type CommissionReconciliationIssue = {
  code:
    | "cancelled_sale"
    | "missing_commission"
    | "missing_sale"
    | "missing_vehicle"
    | "reverted_sale"
    | "seller_mismatch";
  entryId: string | null;
  saleId: string | null;
  severity: "critical" | "warning";
};

export type CommissionWorkspaceSnapshot = {
  adjustments: readonly FinanceEntry[];
  generatedAt: string;
  reconciliation: readonly CommissionReconciliationIssue[];
  sales: readonly CommissionWorkspaceSale[];
  sellerNames: Readonly<Record<string, string>>;
};

export type CommissionSettlementResult = {
  entryIds: readonly string[];
  paidAt: string;
  sellerUserId: string;
  totalCents: number;
  updatedCount: number;
};
